/**
 * Reorder cycle math — pure functions (testable, no DB)
 * แยกออกจาก reorderQueue.ts เพื่อ test ได้
 */

export type ReorderBucket = 'overdue' | 'today' | 'soon' | 'upcoming';

const MS_DAY = 86_400_000;

/**
 * คำนวณรอบเฉลี่ย (วัน) จากวันที่สั่งของลูกค้าคนหนึ่ง
 * - ถ้ามีออเดอร์เดียว → คืน 30 (default)
 * - ถ้า ≥ 2 ออเดอร์ → ค่าเฉลี่ยช่องว่างระหว่างแต่ละครั้ง clamp [10, 60]
 */
export function calcAvgCycleDays(orderDates: Date[]): number {
  if (orderDates.length < 2) return 30;
  const sorted = [...orderDates].sort((a, b) => a.getTime() - b.getTime());
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += (sorted[i].getTime() - sorted[i - 1].getTime()) / MS_DAY;
  }
  const avg = Math.round(total / (sorted.length - 1));
  return Math.max(10, Math.min(60, avg));
}

/**
 * คำนวณวันที่ควรเตือนรีออเดอร์ = lastOrderAt + (avgCycle - 5) วัน
 */
export function calcReorderAt(lastOrderAt: Date, avgCycleDays: number): Date {
  return new Date(lastOrderAt.getTime() + (avgCycleDays - 5) * MS_DAY);
}

/**
 * จำนวนวันถึงวัน reorderAt (ลบ = เลยกำหนดมาแล้ว)
 */
export function calcDaysUntilReorder(reorderAt: Date, now: Date): number {
  return Math.floor((reorderAt.getTime() - now.getTime()) / MS_DAY);
}

/**
 * Bucket ตามจำนวนวันถึงรีออเดอร์
 * - < 0   → overdue
 * - = 0   → today
 * - ≤ 7   → soon
 * - > 7   → upcoming
 */
export function classifyReorderBucket(daysUntilReorder: number): ReorderBucket {
  if (daysUntilReorder < 0) return 'overdue';
  if (daysUntilReorder === 0) return 'today';
  if (daysUntilReorder <= 7) return 'soon';
  return 'upcoming';
}

/**
 * ลูกค้าควรอยู่ในคิวไหม
 * - window: ±30 วัน รอบวันนี้ (เลยมาเกิน 30 วัน = LAPSED, ตัดออก)
 */
export function isInReorderWindow(daysUntilReorder: number): boolean {
  return daysUntilReorder >= -30 && daysUntilReorder <= 30;
}
