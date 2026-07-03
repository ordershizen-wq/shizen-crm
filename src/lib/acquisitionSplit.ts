import { prisma } from './prisma';

// ─────────────────────────────────────────────────────────────
// นิยามเดียวของ "ลูกค้าใหม่ vs รีออเดอร์" ทั้ง Dashboard
// ─────────────────────────────────────────────────────────────
// ยึด "ออเดอร์แรกสุดของเบอร์" เป็นเกณฑ์ acquisition — ไม่พึ่ง source label
// เพราะ legacy SHEET ปนออเดอร์ซื้อซ้ำไว้เป็น "ใหม่" ทำให้ยอดเพี้ยน
// (createOrder ยุค CRM บังคับ 1 เบอร์ = CRM_NEW ได้ครั้งเดียวอยู่แล้ว จึงให้ผลตรงกัน
//  ต่างกันเฉพาะ legacy SHEET ที่วิธีนี้จะแก้ให้ถูกอัตโนมัติ)
//
// ใช้ order.date (วันที่ปิดการขายจริง — เซลส์เลือกลงย้อนหลังได้ ดู orderDate.ts)
// ไม่ใช่ createdAt (เวลาพิมพ์เข้าระบบ) กันเคสลงย้อนหลังทำให้ลำดับ "ใครมาก่อน" ผิด
// createdAt ยังเก็บไว้เป็น audit trail แยกต่างหาก ไม่ถูกแก้ไข

type DatedOrder = { phone: string | null; date: Date | null; createdAt: Date };

function effectiveTime(order: { date: Date | null; createdAt: Date }): number {
  return (order.date ?? order.createdAt).getTime();
}

/**
 * แผนที่ เบอร์ → เวลาออเดอร์แรกสุดของเบอร์นั้น (ทั้งหมดตลอดกาล, epoch ms)
 * ใช้เป็นแหล่งความจริงเดียวสำหรับตัดสิน new-vs-reorder ทุกที่
 *
 * ดึงมาคำนวณ MIN ฝั่ง JS แทน Prisma _min เพราะต้อง coalesce(date, createdAt)
 * ต่อแถวก่อนหา MIN ซึ่ง Prisma aggregate ทำที่ระดับ DB ไม่ได้
 */
export async function getFirstOrderMap(): Promise<Map<string, number>> {
  const rows = await prisma.sheetOrder.findMany({
    where: { phone: { not: null } },
    select: { phone: true, date: true, createdAt: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.phone) continue;
    const t = effectiveTime(r);
    const cur = map.get(r.phone);
    if (cur === undefined || t < cur) map.set(r.phone, t);
  }
  return map;
}

/**
 * ออเดอร์นี้เป็น "ลูกค้าใหม่" (acquisition = ออเดอร์แรกสุดของเบอร์) หรือไม่
 *  - ไม่มีเบอร์ → แยกไม่ได้ นับเป็นใหม่ (กันยอดหายจากยอดรวม)
 *  - มีเบอร์   → ใหม่ก็ต่อเมื่อเวลาตรงกับออเดอร์แรกสุดของเบอร์
 */
export function isAcquisitionOrder(
  order: DatedOrder,
  firstOrderMap: Map<string, number>,
): boolean {
  if (!order.phone) return true;
  const first = firstOrderMap.get(order.phone);
  return first === undefined || first === effectiveTime(order);
}
