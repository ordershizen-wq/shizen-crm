import { prisma } from './prisma';
import { getQueueFilter, type CurrentUser } from './auth';

export type ReorderItem = {
  phone: string;
  name: string;
  lastOrderAt: Date;
  daysSinceLast: number;
  avgCycleDays: number;
  /** วันที่คาดว่าเซ็ทจะหมด (lastOrderAt + avgCycle) */
  expectedDepleteAt: Date;
  /** วันที่ควรเริ่มเตือนซื้อซ้ำ = expectedDepleteAt - 5 วัน */
  reorderAt: Date;
  /** จำนวนวันถึงวันเตือน (ลบ = เลยกำหนดแล้ว) */
  daysUntilReorder: number;
  orderCount: number;
  totalSpent: number;
  /** 'overdue' | 'today' | 'soon' (7d) | 'upcoming' */
  bucket: 'overdue' | 'today' | 'soon' | 'upcoming';
};

const MS_DAY = 86_400_000;

/**
 * คำนวณคิวรีออเดอร์แบบ live จากประวัติการสั่งซื้อของลูกค้า
 * - ลูกค้าที่มีออเดอร์อย่างน้อย 1 ครั้ง
 * - reorderAt = lastOrderAt + (avgCycle - 5) วัน
 * - แสดงเฉพาะลูกค้าที่ reorderAt อยู่ในช่วง [-30d, +30d] รอบวันนี้
 *   (เลยมาเกิน 30 วัน = น่าจะหายไปแล้ว ถือเป็น LAPSED)
 */
export async function getReorderQueue(user: CurrentUser): Promise<ReorderItem[]> {
  const queueFilter = getQueueFilter(user);

  const orders = await prisma.sheetOrder.findMany({
    where: { ...queueFilter, phone: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: {
      phone: true,
      customerName: true,
      createdAt: true,
      totalPrice: true,
      isReturned: true,
    },
  });

  const phoneMap = new Map<string, {
    name: string; dates: Date[]; totalSpent: number;
  }>();
  for (const o of orders) {
    if (o.isReturned) continue; // ออเดอร์คืน ไม่นับเป็นรอบ
    const ph = o.phone!;
    const ex = phoneMap.get(ph);
    const price = Number(o.totalPrice ?? 0);
    if (!ex) {
      phoneMap.set(ph, {
        name: o.customerName || 'ไม่ระบุชื่อ',
        dates: [o.createdAt],
        totalSpent: price,
      });
    } else {
      if (o.customerName) ex.name = o.customerName;
      ex.dates.push(o.createdAt);
      ex.totalSpent += price;
    }
  }

  const now = Date.now();
  const items: ReorderItem[] = [];

  for (const [phone, data] of phoneMap) {
    const sorted = data.dates;
    const lastOrderAt = sorted[sorted.length - 1];
    const daysSinceLast = Math.floor((now - lastOrderAt.getTime()) / MS_DAY);

    let avgCycle = 30;
    if (sorted.length >= 2) {
      let total = 0;
      for (let i = 1; i < sorted.length; i++) {
        total += (sorted[i].getTime() - sorted[i - 1].getTime()) / MS_DAY;
      }
      avgCycle = Math.round(total / (sorted.length - 1));
      avgCycle = Math.max(10, Math.min(60, avgCycle));
    }

    const expectedDepleteTs = lastOrderAt.getTime() + avgCycle * MS_DAY;
    const reorderTs = expectedDepleteTs - 5 * MS_DAY;
    const daysUntilReorder = Math.floor((reorderTs - now) / MS_DAY);

    // window: -30 วัน (เลยกำหนดได้ไม่เกิน 30 วัน) → +30 วัน (มองข้างหน้า)
    if (daysUntilReorder < -30 || daysUntilReorder > 30) continue;

    const bucket: ReorderItem['bucket'] =
      daysUntilReorder < 0 ? 'overdue' :
      daysUntilReorder === 0 ? 'today' :
      daysUntilReorder <= 7 ? 'soon' :
      'upcoming';

    items.push({
      phone,
      name: data.name,
      lastOrderAt,
      daysSinceLast,
      avgCycleDays: avgCycle,
      expectedDepleteAt: new Date(expectedDepleteTs),
      reorderAt: new Date(reorderTs),
      daysUntilReorder,
      orderCount: sorted.length,
      totalSpent: data.totalSpent,
      bucket,
    });
  }

  // เลยกำหนดมาก่อน → วันนี้ → ใกล้ครบ → อนาคต
  items.sort((a, b) => a.daysUntilReorder - b.daysUntilReorder);
  return items;
}

/** นับจำนวนรายการในคิวรีออเดอร์ (ใช้สำหรับ badge) */
export async function getReorderCount(user: CurrentUser): Promise<number> {
  const queue = await getReorderQueue(user);
  return queue.length;
}
