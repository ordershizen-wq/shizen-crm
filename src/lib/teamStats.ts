import { prisma } from './prisma';
import type { CurrentUser } from './auth';
import { getFirstOrderMap, isAcquisitionOrder } from './acquisitionSplit';

export type SalesStats = {
  userId: string;
  fullName: string;
  teamId: string | null;
  teamName: string | null;
  totalRevenue: number;
  totalOrders: number;
  newCustRevenue: number;       // ออเดอร์แรกของเบอร์ (acquisition)
  newCustOrders: number;
  reorderRevenue: number;       // ออเดอร์ซ้ำของเบอร์ (retention)
  reorderOrders: number;
  tasksDone: number;
  monthlyTarget: number;
  goalPercent: number;          // % of monthlyTarget achieved
};

export type LeaderboardData = {
  rows: SalesStats[];
  monthLabel: string;
  monthValue: string;           // 'YYYY-MM'
  myUserId: string;
  myRank: number | null;        // index +1 in rows; null if not in scope
  totalRevenueAll: number;
  totalOrdersAll: number;
};

/**
 * คำนวณ start/end ของเดือน (local time → UTC date range สำหรับ DB)
 */
function getMonthRange(monthValue: string): { start: Date; end: Date; label: string } {
  // monthValue: 'YYYY-MM'
  const [y, m] = monthValue.split('-').map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 1, 0, 0, 0, 0);
  const label = start.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

export function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Scope ที่เห็น:
 *  - ADMIN  → ทุกเซลส์
 *  - LEADER → เซลส์ในทีมเดียวกัน (รวมตัวเอง)
 *  - MEMBER → เซลส์ในทีมเดียวกัน (เพื่อให้เห็น rank ของตัวเอง — แต่ไม่ใช่ทั้งบริษัท)
 */
async function getScopedUserIds(user: CurrentUser): Promise<string[] | null> {
  if (user.role === 'ADMIN') return null; // null = ทั้งหมด ไม่ filter

  if (user.teamId) {
    const members = await prisma.sheetUser.findMany({
      where: { teamId: user.teamId, isActive: 'ACTIVE', role: { not: 'PACKER' } },
      select: { id: true },
    });
    return members.map(m => m.id);
  }

  return [user.id]; // ไม่มีทีม → เห็นแค่ตัวเอง
}

export async function getLeaderboard(user: CurrentUser, monthValue?: string): Promise<LeaderboardData> {
  const month = monthValue || currentMonthValue();
  const { start, end, label } = getMonthRange(month);

  const scopedIds = await getScopedUserIds(user);
  const userWhere = scopedIds === null ? {} : { id: { in: scopedIds } };
  const orderWhere = {
    date: { gte: start, lt: end },
    ...(scopedIds === null ? {} : { salesRepId: { in: scopedIds } }),
  };

  // ดึง users ในขอบเขต + orders ในช่วงเดือน + tasks ที่ DONE
  const [users, orderAggBySalesRep, monthOrders, tasksByUser, firstOrderMap] = await Promise.all([
    prisma.sheetUser.findMany({
      where: { ...userWhere, isActive: 'ACTIVE', role: { not: 'PACKER' } },
      select: {
        id: true,
        fullName: true,
        teamId: true,
        monthlySales: true,
        team: { select: { name: true } },
      },
    }),
    prisma.sheetOrder.groupBy({
      by: ['salesRepId'],
      where: orderWhere,
      _sum: { totalPrice: true },
      _count: { _all: true },
    }),
    prisma.sheetOrder.findMany({
      where: orderWhere,
      select: { id: true, salesRepId: true, phone: true, date: true, createdAt: true, totalPrice: true },
    }),
    prisma.customerTask.groupBy({
      by: ['completedById'],
      where: {
        status: 'DONE',
        completedAt: { gte: start, lt: end },
        ...(scopedIds === null ? {} : { completedById: { in: scopedIds } }),
      },
      _count: { _all: true },
    }),
    getFirstOrderMap(),
  ]);

  // Build lookup maps
  const orderMap = new Map(orderAggBySalesRep.map(r => [r.salesRepId, r]));
  const taskMap = new Map(tasksByUser.map(t => [t.completedById, t._count._all]));

  // แยกยอดใหม่/รีออเดอร์ต่อเซลส์ ด้วยนิยาม "ออเดอร์แรกของเบอร์" (ไม่พึ่ง source)
  const splitMap = new Map<string, { newR: number; newC: number; reR: number; reC: number }>();
  for (const o of monthOrders) {
    if (!o.salesRepId) continue;
    const s = splitMap.get(o.salesRepId) ?? { newR: 0, newC: 0, reR: 0, reC: 0 };
    const amt = Number(o.totalPrice ?? 0);
    if (isAcquisitionOrder(o, firstOrderMap)) { s.newR += amt; s.newC++; }
    else { s.reR += amt; s.reC++; }
    splitMap.set(o.salesRepId, s);
  }

  const rows: SalesStats[] = users.map(u => {
    const agg = orderMap.get(u.id);
    const totalRevenue = Number(agg?._sum.totalPrice ?? 0);
    const totalOrders = agg?._count._all ?? 0;

    const s = splitMap.get(u.id) ?? { newR: 0, newC: 0, reR: 0, reC: 0 };

    const target = Number(u.monthlySales ?? 0) || 50000;
    const goalPercent = target > 0 ? (totalRevenue / target) * 100 : 0;

    return {
      userId: u.id,
      fullName: u.fullName,
      teamId: u.teamId,
      teamName: u.team?.name ?? null,
      totalRevenue,
      totalOrders,
      newCustRevenue: s.newR,
      newCustOrders: s.newC,
      reorderRevenue: s.reR,
      reorderOrders: s.reC,
      tasksDone: taskMap.get(u.id) ?? 0,
      monthlyTarget: target,
      goalPercent,
    };
  });

  // Sort by totalRevenue DESC
  rows.sort((a, b) => b.totalRevenue - a.totalRevenue);

  const myIdx = rows.findIndex(r => r.userId === user.id);
  const myRank = myIdx >= 0 ? myIdx + 1 : null;

  const totalRevenueAll = rows.reduce((s, r) => s + r.totalRevenue, 0);
  const totalOrdersAll = rows.reduce((s, r) => s + r.totalOrders, 0);

  return {
    rows,
    monthLabel: label,
    monthValue: month,
    myUserId: user.id,
    myRank,
    totalRevenueAll,
    totalOrdersAll,
  };
}

/**
 * Stats รายบุคคลของ user คนปัจจุบัน (สำหรับ widget ใน Dashboard)
 */
export async function getMyMonthStats(user: CurrentUser, monthValue?: string): Promise<SalesStats | null> {
  const data = await getLeaderboard(user, monthValue);
  return data.rows.find(r => r.userId === user.id) ?? null;
}
