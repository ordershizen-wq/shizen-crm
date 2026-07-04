import { prisma } from './prisma';
import type { CurrentUser } from './auth';
import { getOrderFilter, getQueueFilter } from './auth';
import type { DateRange, ViewKey } from './dashboardFilters';
import { getFirstOrderMap, isAcquisitionOrder } from './acquisitionSplit';

// ─────────────────────────────────────────────────────────────
// Date helpers — legacy (สำหรับ Velocity/Forecast ที่ยึดเดือน)
// ─────────────────────────────────────────────────────────────
function monthRange(d: Date = new Date()): { start: Date; end: Date; daysInMonth: number; dayOfMonth: number } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const dayOfMonth = d.getDate();
  return { start, end, daysInMonth, dayOfMonth };
}

function prevMonthRange(d: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  return { start, end };
}

// ─────────────────────────────────────────────────────────────
// Helper — apply DateRange filter เป็น Prisma where
// ─────────────────────────────────────────────────────────────
function whereWithRange(
  base: Record<string, unknown>,
  range?: DateRange,
): Record<string, unknown> {
  if (!range || !range.start || !range.end) return base;
  return { ...base, createdAt: { gte: range.start, lt: range.end } };
}

// ═════════════════════════════════════════════════════════════
// SPRINT 4: SALES (MEMBER/LEADER)
// ═════════════════════════════════════════════════════════════

export type VelocityStats = {
  todayRevenue: number;
  dailyAverage: number;
  dailyTargetToReach: number;
  monthlyTarget: number;
  monthRevenue: number;
  remainingDays: number;
  remainingToTarget: number;
  paceOk: boolean;
};

export async function getVelocity(user: CurrentUser): Promise<VelocityStats> {
  const orderFilter = (await getOrderFilter(user)) ?? {};
  const { start: monthStart, end: monthEnd, daysInMonth, dayOfMonth } = monthRange();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [today, month] = await Promise.all([
    prisma.sheetOrder.aggregate({
      where: { ...orderFilter, createdAt: { gte: todayStart, lt: tomorrowStart } },
      _sum: { totalPrice: true },
    }),
    prisma.sheetOrder.aggregate({
      where: { ...orderFilter, createdAt: { gte: monthStart, lt: monthEnd } },
      _sum: { totalPrice: true },
    }),
  ]);

  const todayRevenue = Number(today._sum.totalPrice ?? 0);
  const monthRevenue = Number(month._sum.totalPrice ?? 0);
  const monthlyTarget = Number(user.monthlySales ?? 0) || 50000;
  const remainingDays = Math.max(1, daysInMonth - dayOfMonth + 1);
  const remainingToTarget = Math.max(0, monthlyTarget - monthRevenue);
  const dailyTargetToReach = remainingToTarget / remainingDays;
  const dailyAverage = monthRevenue / Math.max(1, dayOfMonth);

  return {
    todayRevenue,
    dailyAverage,
    dailyTargetToReach,
    monthlyTarget,
    monthRevenue,
    remainingDays,
    remainingToTarget,
    paceOk: dailyAverage >= dailyTargetToReach * 0.9,
  };
}

// ─────────────────────────────────────────────────────────────
// Hot Customers: ลูกค้าที่ "กำลังจะถึงรอบซื้อซ้ำ"
// ใช้ pattern average cycle length ของลูกค้าคนนั้น
// ─────────────────────────────────────────────────────────────
export type HotCustomer = {
  phone: string;
  name: string;
  orderCount: number;
  avgCycleDays: number;
  daysSinceLast: number;
  predictedDays: number;     // วันที่คาดว่าจะถึงรอบถัดไป (อาจติดลบ = เลยรอบ)
  totalSpent: number;
  isOverdue: boolean;
};

export async function getHotCustomers(user: CurrentUser, limit = 5): Promise<HotCustomer[]> {
  const queueFilter = getQueueFilter(user);

  // ดึง orders ทั้งหมดในขอบเขต — filter เฉพาะคนที่ ≥ 2 ครั้งในขั้นต่อไป
  const orders = await prisma.sheetOrder.findMany({
    where: { ...queueFilter, phone: { not: null } },
    orderBy: [{ phone: 'asc' }, { createdAt: 'asc' }],
    select: { phone: true, customerName: true, totalPrice: true, createdAt: true },
  });

  // group by phone, calc avg cycle
  const byPhone = new Map<string, { name: string; dates: Date[]; spent: number }>();
  for (const o of orders) {
    if (!o.phone) continue;
    const ex = byPhone.get(o.phone);
    if (!ex) {
      byPhone.set(o.phone, { name: o.customerName || 'ไม่ระบุชื่อ', dates: [o.createdAt], spent: Number(o.totalPrice ?? 0) });
    } else {
      ex.dates.push(o.createdAt);
      ex.spent += Number(o.totalPrice ?? 0);
      if (o.customerName) ex.name = o.customerName;
    }
  }

  const now = Date.now();
  const candidates: HotCustomer[] = [];
  for (const [phone, info] of byPhone) {
    const dates = info.dates.sort((a, b) => a.getTime() - b.getTime());
    if (dates.length < 2) continue;

    // คำนวณ cycle เฉลี่ย
    let totalCycle = 0;
    for (let i = 1; i < dates.length; i++) {
      totalCycle += (dates[i].getTime() - dates[i - 1].getTime()) / 86400000;
    }
    const avgCycle = totalCycle / (dates.length - 1);
    if (avgCycle < 7 || avgCycle > 365) continue; // ไม่ใช่ pattern ที่ใช้ได้

    const lastOrderAt = dates[dates.length - 1];
    const daysSince = Math.floor((now - lastOrderAt.getTime()) / 86400000);
    const predicted = Math.round(avgCycle - daysSince);

    // เลือกเฉพาะที่ "กำลังจะถึง" (เหลือ ≤ 14 วัน) หรือ "เลยมาแล้ว ≤ 30 วัน"
    if (predicted > 14) continue;
    if (predicted < -30) continue;

    candidates.push({
      phone,
      name: info.name,
      orderCount: dates.length,
      avgCycleDays: Math.round(avgCycle),
      daysSinceLast: daysSince,
      predictedDays: predicted,
      totalSpent: info.spent,
      isOverdue: predicted < 0,
    });
  }

  // เรียง: overdue ก่อน (ใกล้สุด), แล้วใกล้รอบ (ตามค่า abs)
  candidates.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return Math.abs(a.predictedDays) - Math.abs(b.predictedDays);
  });

  return candidates.slice(0, limit);
}

// ─────────────────────────────────────────────────────────────
// Trend: รายได้รายวันเดือนนี้ vs เดือนก่อน
// ─────────────────────────────────────────────────────────────
export type TrendPoint = { day: number; thisMonth: number; lastMonth: number };

export async function getMonthTrend(user: CurrentUser): Promise<TrendPoint[]> {
  const orderFilter = (await getOrderFilter(user)) ?? {};
  const { start: thisStart, end: thisEnd } = monthRange();
  const { start: lastStart, end: lastEnd } = prevMonthRange();

  const [thisOrders, lastOrders] = await Promise.all([
    prisma.sheetOrder.findMany({
      where: { ...orderFilter, createdAt: { gte: thisStart, lt: thisEnd } },
      select: { totalPrice: true, createdAt: true },
    }),
    prisma.sheetOrder.findMany({
      where: { ...orderFilter, createdAt: { gte: lastStart, lt: lastEnd } },
      select: { totalPrice: true, createdAt: true },
    }),
  ]);

  const maxDays = 31;
  const points: TrendPoint[] = Array.from({ length: maxDays }, (_, i) => ({
    day: i + 1, thisMonth: 0, lastMonth: 0,
  }));

  for (const o of thisOrders) {
    const d = o.createdAt.getDate();
    points[d - 1].thisMonth += Number(o.totalPrice ?? 0);
  }
  for (const o of lastOrders) {
    const d = o.createdAt.getDate();
    if (d <= maxDays) points[d - 1].lastMonth += Number(o.totalPrice ?? 0);
  }

  // ตัดวันที่ยังไม่มาถึงในเดือนปัจจุบัน
  const today = new Date().getDate();
  return points.slice(0, Math.max(today, 14));
}

// ─────────────────────────────────────────────────────────────
// Channel mix (LINE/FB/TikTok) — ตาม range
// ─────────────────────────────────────────────────────────────
export type ChannelSlice = { channel: string; revenue: number; orders: number; share: number };

export async function getChannelMix(user: CurrentUser, range?: DateRange, view: ViewKey = 'team'): Promise<ChannelSlice[]> {
  const orderFilter = (await getOrderFilter(user, view)) ?? {};
  const where = whereWithRange(orderFilter, range);

  const grouped = await prisma.sheetOrder.groupBy({
    by: ['channel'],
    where,
    _sum: { totalPrice: true },
    _count: { _all: true },
  });

  const total = grouped.reduce((s, r) => s + Number(r._sum.totalPrice ?? 0), 0);
  const slices: ChannelSlice[] = grouped
    .map(r => ({
      channel: r.channel || 'อื่นๆ',
      revenue: Number(r._sum.totalPrice ?? 0),
      orders: r._count._all,
      share: total > 0 ? (Number(r._sum.totalPrice ?? 0) / total) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
  return slices;
}

// ─────────────────────────────────────────────────────────────
// Best products เดือนนี้
// ─────────────────────────────────────────────────────────────
export type ProductStat = {
  name: string;
  units: number;
  revenue: number;
  orders: number;
};

type ProductRow = { name?: string; quantity?: number; unitPrice?: number; price?: number };

export async function getBestProducts(user: CurrentUser, limit = 5, range?: DateRange, view: ViewKey = 'team'): Promise<ProductStat[]> {
  const orderFilter = (await getOrderFilter(user, view)) ?? {};
  const where = whereWithRange(orderFilter, range);

  // productsJson — ต้องดึงมา parse ใน JS
  const orders = await prisma.sheetOrder.findMany({
    where,
    select: { productsJson: true },
  });

  const tally = new Map<string, { units: number; revenue: number; orders: number }>();
  for (const o of orders) {
    const items: ProductRow[] = Array.isArray(o.productsJson) ? (o.productsJson as ProductRow[]) : [];
    const distinct = new Set<string>();
    for (const p of items) {
      const name = p?.name?.trim();
      if (!name) continue;
      const qty = Number(p.quantity ?? 1) || 1;
      const unit = Number(p.unitPrice ?? p.price ?? 0) || 0;
      const ex = tally.get(name) ?? { units: 0, revenue: 0, orders: 0 };
      ex.units += qty;
      ex.revenue += qty * unit;
      tally.set(name, ex);
      distinct.add(name);
    }
    for (const name of distinct) {
      tally.get(name)!.orders += 1;
    }
  }

  // หมายเหตุ: productsJson เก็บแค่ name+quantity ไม่มีราคาต่อชิ้น และราคาเป็นแบบเซ็ท
  // (bundle) ที่ระดับออเดอร์ → revenue ต่อสินค้าคำนวณไม่ได้ จึงจัดอันดับด้วยจำนวนชิ้นจริง
  return Array.from(tally.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.units - a.units || b.orders - a.orders)
    .slice(0, limit);
}

// ═════════════════════════════════════════════════════════════
// SPRINT 5: ADMIN
// ═════════════════════════════════════════════════════════════

export type RevenueForecast = {
  currentRevenue: number;
  projectedRevenue: number;
  monthlyTarget: number | null;   // sum of all users' targets, null ถ้าไม่มี
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  lastMonthRevenue: number;
  growthPercent: number;
  willHitTarget: boolean;
  projectedHitDay: number | null; // ถ้ามี target → คาดว่ากี่วันถึง
};

export async function getRevenueForecast(): Promise<RevenueForecast> {
  const { start, end, daysInMonth, dayOfMonth } = monthRange();
  const { start: lastStart, end: lastEnd } = prevMonthRange();

  const [thisMonth, lastMonth, targets] = await Promise.all([
    prisma.sheetOrder.aggregate({
      where: { createdAt: { gte: start, lt: end } },
      _sum: { totalPrice: true },
    }),
    prisma.sheetOrder.aggregate({
      where: { createdAt: { gte: lastStart, lt: lastEnd } },
      _sum: { totalPrice: true },
    }),
    prisma.sheetUser.aggregate({
      where: { isActive: 'ACTIVE', role: { not: 'PACKER' } },
      _sum: { monthlySales: true },
    }),
  ]);

  const currentRevenue = Number(thisMonth._sum.totalPrice ?? 0);
  const lastMonthRevenue = Number(lastMonth._sum.totalPrice ?? 0);
  const monthlyTarget = Number(targets._sum.monthlySales ?? 0) || null;

  const daysElapsed = Math.max(1, dayOfMonth);
  const daysTotal = daysInMonth;
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  const dailyRate = currentRevenue / daysElapsed;
  const projectedRevenue = Math.round(dailyRate * daysTotal);

  const growthPercent = lastMonthRevenue > 0
    ? ((projectedRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  const willHitTarget = monthlyTarget ? projectedRevenue >= monthlyTarget : false;
  const projectedHitDay = monthlyTarget && dailyRate > 0
    ? Math.ceil(monthlyTarget / dailyRate)
    : null;

  return {
    currentRevenue,
    projectedRevenue,
    monthlyTarget,
    daysElapsed,
    daysTotal,
    daysRemaining,
    lastMonthRevenue,
    growthPercent,
    willHitTarget,
    projectedHitDay,
  };
}

// ─────────────────────────────────────────────────────────────
// Team Battle: ยอดทีมเดือนนี้ แยก source
// ─────────────────────────────────────────────────────────────
export type TeamBattleRow = {
  teamId: string;
  teamName: string;
  totalRevenue: number;
  newCustRevenue: number;
  reorderRevenue: number;
  reorderShare: number;
  memberCount: number;
};

export async function getTeamBattle(): Promise<TeamBattleRow[]> {
  const { start, end } = monthRange();

  const [teams, monthOrders, members, firstOrderMap] = await Promise.all([
    prisma.sheetTeam.findMany({ select: { id: true, name: true } }),
    prisma.sheetOrder.findMany({
      where: { date: { gte: start, lt: end } },
      select: { id: true, teamId: true, phone: true, date: true, createdAt: true, totalPrice: true },
    }),
    prisma.sheetUser.groupBy({
      by: ['teamId'],
      where: { isActive: 'ACTIVE', role: { not: 'PACKER' }, teamId: { not: null } },
      _count: { _all: true },
    }),
    getFirstOrderMap(),
  ]);

  const memberMap = new Map(members.map(m => [m.teamId, m._count._all]));

  // แยกยอดใหม่/รีออเดอร์ต่อทีม ด้วยนิยาม "ออเดอร์แรกของเบอร์" (ไม่พึ่ง source)
  const acc = new Map<string, { newR: number; reR: number }>();
  for (const o of monthOrders) {
    if (!o.teamId) continue;
    const bucket = acc.get(o.teamId) ?? { newR: 0, reR: 0 };
    const amt = Number(o.totalPrice ?? 0);
    if (isAcquisitionOrder(o, firstOrderMap)) bucket.newR += amt;
    else bucket.reR += amt;
    acc.set(o.teamId, bucket);
  }

  const rows: TeamBattleRow[] = teams.map(t => {
    const b = acc.get(t.id) ?? { newR: 0, reR: 0 };
    const total = b.newR + b.reR;
    return {
      teamId: t.id,
      teamName: t.name,
      totalRevenue: total,
      newCustRevenue: b.newR,
      reorderRevenue: b.reR,
      reorderShare: total > 0 ? (b.reR / total) * 100 : 0,
      memberCount: memberMap.get(t.id) ?? 0,
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

  return rows;
}

// ─────────────────────────────────────────────────────────────
// Acquisition Funnel: ลูกค้าใหม่ → ซื้อซ้ำ → VIP
// ─────────────────────────────────────────────────────────────
export type FunnelData = {
  newCustomers: number;       // ลูกค้าใหม่เดือนนี้ (เบอร์ที่ first order อยู่ในเดือนนี้)
  repeatCustomers: number;     // ลูกค้าที่ซื้อ ≥ 2 ครั้ง (total, ตลอดกาล)
  vipCustomers: number;        // ลูกค้าที่ซื้อ ≥ 3 ครั้ง หรือ spend ≥ 20K
  totalUniquePhones: number;
};

export async function getAcquisitionFunnel(): Promise<FunnelData> {
  const { start, end } = monthRange();

  // newCustomers — first order ของเบอร์อยู่ในเดือนนี้ (นิยามเดียวกับ getTeamBattle)
  const firstOrderMap = await getFirstOrderMap();
  let newCount = 0;
  const startMs = start.getTime(), endMs = end.getTime();
  for (const { t } of firstOrderMap.values()) {
    if (t >= startMs && t < endMs) newCount++;
  }

  // total + repeat + vip
  const aggRows = await prisma.sheetOrder.groupBy({
    by: ['phone'],
    where: { phone: { not: null } },
    _count: { _all: true },
    _sum: { totalPrice: true },
  });

  let repeat = 0, vip = 0;
  for (const r of aggRows) {
    const count = r._count._all;
    const spent = Number(r._sum.totalPrice ?? 0);
    if (count >= 2) repeat++;
    if (count >= 3 || spent >= 20000) vip++;
  }

  return {
    newCustomers: newCount,
    repeatCustomers: repeat,
    vipCustomers: vip,
    totalUniquePhones: aggRows.length,
  };
}

// ─────────────────────────────────────────────────────────────
// Product Performance Table (ADMIN view — all)
// ─────────────────────────────────────────────────────────────
export type ProductPerf = {
  name: string;
  units: number;
  revenue: number;
  orders: number;
  uniqueCustomers: number;
  reorderRate: number;          // % ที่ลูกค้าซื้อสินค้าตัวนี้ซ้ำ
};

export async function getProductPerformance(limit = 10, range?: DateRange): Promise<ProductPerf[]> {
  // มี range (เดือน/ปี/กำหนดเอง) → window ตามนั้น, reorder = ลูกค้าที่เคยซื้อ "ก่อนเริ่ม range"
  // ไม่มี range (ทั้งหมด) → window ทั้งหมด, reorder = ลูกค้าที่ซื้อสินค้านั้น ≥2 ออเดอร์ (lifetime)
  const hasRange = !!(range?.start && range?.end);
  const start = range?.start ?? new Date(0);
  const end = range?.end ?? new Date(Date.now() + 86400000);

  const orders = await prisma.sheetOrder.findMany({
    where: { createdAt: { gte: start, lt: end }, phone: { not: null } },
    select: { phone: true, productsJson: true },
  });

  // product → set of phones who bought it (within window)
  const productPhones = new Map<string, Set<string>>();
  // product → (phone → จำนวนออเดอร์ที่ซื้อสินค้านั้น) — ใช้คำนวณ reorder แบบ lifetime
  const productPhoneOrders = new Map<string, Map<string, number>>();
  const productStats = new Map<string, { units: number; revenue: number; orders: number }>();

  for (const o of orders) {
    const items: ProductRow[] = Array.isArray(o.productsJson) ? (o.productsJson as ProductRow[]) : [];
    const distinct = new Set<string>();
    for (const p of items) {
      const name = p?.name?.trim();
      if (!name) continue;
      const qty = Number(p.quantity ?? 1) || 1;
      const unit = Number(p.unitPrice ?? p.price ?? 0) || 0;
      const stat = productStats.get(name) ?? { units: 0, revenue: 0, orders: 0 };
      stat.units += qty;
      stat.revenue += qty * unit;
      productStats.set(name, stat);
      distinct.add(name);
    }
    for (const name of distinct) {
      const stat = productStats.get(name)!;
      stat.orders += 1;
      if (o.phone) {
        const set = productPhones.get(name) ?? new Set<string>();
        set.add(o.phone);
        productPhones.set(name, set);

        const cnt = productPhoneOrders.get(name) ?? new Map<string, number>();
        cnt.set(o.phone, (cnt.get(o.phone) ?? 0) + 1);
        productPhoneOrders.set(name, cnt);
      }
    }
  }

  const productNames = Array.from(productStats.keys());
  const reorderRateMap = new Map<string, number>();

  if (productNames.length > 0 && hasRange) {
    // ดูว่าลูกค้าที่ซื้อสินค้านี้ใน window "เคย" ซื้อสินค้าเดียวกันก่อนหน้าไหม
    const allPhones = Array.from(new Set(Array.from(productPhones.values()).flatMap(s => Array.from(s))));
    if (allPhones.length > 0) {
      const historicalOrders = await prisma.sheetOrder.findMany({
        where: { phone: { in: allPhones }, createdAt: { lt: start } },
        select: { phone: true, productsJson: true },
      });
      const beforeMap = new Map<string, Set<string>>();
      for (const o of historicalOrders) {
        const items: ProductRow[] = Array.isArray(o.productsJson) ? (o.productsJson as ProductRow[]) : [];
        for (const p of items) {
          const name = p?.name?.trim();
          if (!name || !o.phone) continue;
          const set = beforeMap.get(name) ?? new Set<string>();
          set.add(o.phone);
          beforeMap.set(name, set);
        }
      }
      for (const name of productNames) {
        const inWindow = productPhones.get(name) ?? new Set();
        const before = beforeMap.get(name) ?? new Set();
        let repeat = 0;
        for (const p of inWindow) if (before.has(p)) repeat++;
        reorderRateMap.set(name, inWindow.size > 0 ? (repeat / inWindow.size) * 100 : 0);
      }
    }
  } else if (productNames.length > 0) {
    // ทั้งหมด: reorder = สัดส่วนลูกค้าที่ซื้อสินค้านั้นซ้ำ (≥2 ออเดอร์) ตลอดกาล
    for (const name of productNames) {
      const phoneCounts = productPhoneOrders.get(name);
      if (!phoneCounts || phoneCounts.size === 0) { reorderRateMap.set(name, 0); continue; }
      let repeat = 0;
      for (const cnt of phoneCounts.values()) if (cnt >= 2) repeat++;
      reorderRateMap.set(name, (repeat / phoneCounts.size) * 100);
    }
  }

  const results: ProductPerf[] = productNames.map(name => {
    const s = productStats.get(name)!;
    return {
      name,
      units: s.units,
      revenue: s.revenue,
      orders: s.orders,
      uniqueCustomers: productPhones.get(name)?.size ?? 0,
      reorderRate: reorderRateMap.get(name) ?? 0,
    };
  }).sort((a, b) => b.units - a.units || b.orders - a.orders).slice(0, limit);

  return results;
}
