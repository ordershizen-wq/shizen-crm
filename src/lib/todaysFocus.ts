import { prisma } from './prisma';
import { aggregateOrdersByPhone } from './customer';
import type { CurrentUser } from './auth';
import { getOrderFilter, getQueueFilter } from './auth';
import { getTaskFilter } from './tasks';

export type VipAtRisk = {
  phone: string;
  name: string;
  daysSince: number;
  totalSpent: number;
  orderCount: number;
};

export type OverdueTask = {
  id: string;
  title: string;
  customerPhone: string;
  customerName: string;
  dueDate: Date;
  daysOverdue: number;
  assignedToName: string | null;
};

export type StuckOrder = {
  id: string;
  customerName: string | null;
  phone: string | null;
  totalPrice: number;
  hoursSince: number;
  salesRepName: string | null;
};

export type TodaysFocusData = {
  vipAtRisk: VipAtRisk[];
  vipAtRiskTotal: number;
  overdueTasks: OverdueTask[];
  overdueTasksTotal: number;
  stuckOrders: StuckOrder[];
  stuckOrdersTotal: number;
  isAllClear: boolean;
};

/**
 * ดึง "งานวันนี้ของคุณ" — items ที่ต้อง act ตอนนี้, ไม่ใช่แค่ FYI
 *
 * 3 หมวด:
 *  1. VIP/A ที่ใกล้หลุดเกรด (totalSpent ≥ 20K หรือ orderCount ≥ 3 + ห่าง > 30 วัน)
 *  2. Task เกินกำหนด (status active + dueDate < ตอนนี้)
 *  3. ออเดอร์ค้าง PENDING > 24 ชม.
 */
export async function getTodaysFocus(user: CurrentUser): Promise<TodaysFocusData> {
  const orderFilter = (await getOrderFilter(user)) ?? {};
  const queueFilter = getQueueFilter(user);
  const taskFilter = await getTaskFilter(user);

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // ── 1. VIP at risk ──
  // ดึง aggregate ลูกค้าทั้งหมดในขอบเขต, filter VIP-equivalent ที่ห่างไปนาน
  const phoneAggsPromise = aggregateOrdersByPhone(queueFilter);

  // ── 2. Overdue tasks ──
  const activeStatuses = ['PENDING', 'IN_PROGRESS', 'WAITING_REPLY'] as const;
  const overdueTasksPromise = prisma.customerTask.findMany({
    where: {
      AND: [
        taskFilter,
        { status: { in: [...activeStatuses] } },
        { dueDate: { lt: now } },
      ],
    },
    orderBy: { dueDate: 'asc' },
    take: 6,
    include: {
      assignedTo: { select: { fullName: true } },
    },
  });
  const overdueCountPromise = prisma.customerTask.count({
    where: {
      AND: [
        taskFilter,
        { status: { in: [...activeStatuses] } },
        { dueDate: { lt: now } },
      ],
    },
  });

  // ── 3. Stuck PENDING orders > 24h ──
  const stuckOrdersPromise = prisma.sheetOrder.findMany({
    where: {
      ...orderFilter,
      status: 'PENDING',
      createdAt: { lt: dayAgo },
    },
    orderBy: { createdAt: 'asc' },
    take: 5,
    select: {
      id: true,
      customerName: true,
      phone: true,
      totalPrice: true,
      createdAt: true,
      salesRepName: true,
    },
  });
  const stuckCountPromise = prisma.sheetOrder.count({
    where: {
      ...orderFilter,
      status: 'PENDING',
      createdAt: { lt: dayAgo },
    },
  });

  const [phoneAggs, overdueTasksRaw, overdueCount, stuckOrdersRaw, stuckCount] = await Promise.all([
    phoneAggsPromise,
    overdueTasksPromise,
    overdueCountPromise,
    stuckOrdersPromise,
    stuckCountPromise,
  ]);

  // VIP at risk: เคยมี totalSpent ≥ 20K หรือ orderCount ≥ 3, ห่างไป 30-120 วัน (LAPSED แล้วถือว่าเสีย)
  const vipAtRiskAll = phoneAggs.filter(r => {
    const daysSince = Math.floor((now.getTime() - r.lastOrderAt.getTime()) / 86400000);
    if (daysSince <= 30) return false;
    if (daysSince > 120) return false;
    const wasVip = r.totalSpent >= 20000 || r.orderCount >= 3;
    return wasVip;
  })
  .sort((a, b) => b.totalSpent - a.totalSpent);

  const vipAtRiskTop = vipAtRiskAll.slice(0, 5);

  // ดึงชื่อล่าสุดต่อเบอร์ของ top ที่จะแสดง
  const topPhones = vipAtRiskTop.map(r => r.phone);
  const latestNames = topPhones.length
    ? await prisma.sheetOrder.findMany({
        where: { ...queueFilter, phone: { in: topPhones } },
        orderBy: [{ phone: 'asc' }, { createdAt: 'desc' }],
        distinct: ['phone'],
        select: { phone: true, customerName: true },
      })
    : [];
  const nameMap = new Map(latestNames.map(o => [o.phone!, o.customerName || 'ไม่ระบุชื่อ']));

  const vipAtRisk: VipAtRisk[] = vipAtRiskTop.map(r => ({
    phone: r.phone,
    name: nameMap.get(r.phone) ?? 'ไม่ระบุชื่อ',
    daysSince: Math.floor((now.getTime() - r.lastOrderAt.getTime()) / 86400000),
    totalSpent: r.totalSpent,
    orderCount: r.orderCount,
  }));

  // Overdue tasks — ดึงชื่อลูกค้าจาก order ล่าสุด
  const taskPhones = Array.from(new Set(overdueTasksRaw.map(t => t.customerPhone)));
  const taskCustomers = taskPhones.length
    ? await prisma.sheetOrder.findMany({
        where: { phone: { in: taskPhones } },
        orderBy: [{ phone: 'asc' }, { createdAt: 'desc' }],
        distinct: ['phone'],
        select: { phone: true, customerName: true },
      })
    : [];
  const taskNameMap = new Map(taskCustomers.map(o => [o.phone!, o.customerName || 'ไม่ระบุชื่อ']));

  const overdueTasks: OverdueTask[] = overdueTasksRaw.map(t => ({
    id: t.id,
    title: t.title,
    customerPhone: t.customerPhone,
    customerName: taskNameMap.get(t.customerPhone) ?? 'ไม่ระบุชื่อ',
    dueDate: t.dueDate,
    daysOverdue: Math.max(1, Math.floor((now.getTime() - t.dueDate.getTime()) / 86400000)),
    assignedToName: t.assignedTo?.fullName ?? null,
  }));

  const stuckOrders: StuckOrder[] = stuckOrdersRaw.map(o => ({
    id: o.id,
    customerName: o.customerName,
    phone: o.phone,
    totalPrice: Number(o.totalPrice ?? 0),
    hoursSince: Math.floor((now.getTime() - o.createdAt.getTime()) / (60 * 60 * 1000)),
    salesRepName: o.salesRepName,
  }));

  const vipAtRiskTotal = vipAtRiskAll.length;
  const isAllClear =
    vipAtRiskTotal === 0 && overdueCount === 0 && stuckCount === 0;

  return {
    vipAtRisk,
    vipAtRiskTotal,
    overdueTasks,
    overdueTasksTotal: overdueCount,
    stuckOrders,
    stuckOrdersTotal: stuckCount,
    isAllClear,
  };
}
