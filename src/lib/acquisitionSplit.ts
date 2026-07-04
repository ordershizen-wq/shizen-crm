import { cache } from 'react';
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
//
// order.date ถูก normalize เป็นเที่ยงวันเสมอ (ดู orderDate.ts) ทำให้หลายออเดอร์ของเบอร์
// เดียวกันในวันเดียวกันมี effectiveTime ชนกันได้ — จึงระบุ "ออเดอร์แรก" ด้วย id จริง
// ของแถวนั้น ไม่ใช่แค่เทียบเวลา (เลือก MIN เวลาก่อน, เท่ากัน tie-break ด้วย createdAt,
// เท่ากันอีก tie-break ด้วย id)

type DatedOrder = { id: string; phone: string | null; date: Date | null; createdAt: Date };
type FirstOrder = { id: string; t: number };

function effectiveTime(order: { date: Date | null; createdAt: Date }): number {
  return (order.date ?? order.createdAt).getTime();
}

/**
 * แผนที่ เบอร์ → ออเดอร์แรกสุดของเบอร์นั้น (ทั้งหมดตลอดกาล) เก็บทั้ง id และเวลา (epoch ms)
 * ใช้เป็นแหล่งความจริงเดียวสำหรับตัดสิน new-vs-reorder ทุกที่
 *
 * ดึงมาคำนวณ MIN ฝั่ง JS แทน Prisma _min เพราะต้อง coalesce(date, createdAt)
 * ต่อแถวก่อนหา MIN ซึ่ง Prisma aggregate ทำที่ระดับ DB ไม่ได้
 *
 * เลือก "ออเดอร์แรก" แบบ deterministic: effectiveTime ต่ำสุดก่อน,
 * เท่ากัน → createdAt ต่ำสุด, เท่ากันอีก → id ต่ำสุด
 *
 * ห่อด้วย React cache() → ต่อ 1 request จะยิง query ตารางออเดอร์แค่ครั้งเดียว
 * แม้ถูกเรียกหลายที่ (เช่น หน้า Dashboard + getLeaderboard ภายใน request เดียวกัน)
 * ประหยัด round-trip DB ที่แพง (~0.7s/ครั้ง) โดยไม่แคชข้ามคำขอ (ข้อมูลยังสดเสมอ)
 */
export const getFirstOrderMap = cache(async function getFirstOrderMap(): Promise<Map<string, FirstOrder>> {
  const rows = await prisma.sheetOrder.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true, date: true, createdAt: true },
  });
  // เก็บ createdAt คู่กับ id/t ระหว่างคำนวณ เพื่อใช้ tie-break โดยไม่ต้องปนกับ type ที่ return
  const best = new Map<string, { id: string; t: number; createdAtMs: number }>();
  for (const r of rows) {
    if (!r.phone) continue;
    const t = effectiveTime(r);
    const createdAtMs = r.createdAt.getTime();
    const cur = best.get(r.phone);
    const isEarlier =
      !cur ||
      t < cur.t ||
      (t === cur.t && createdAtMs < cur.createdAtMs) ||
      (t === cur.t && createdAtMs === cur.createdAtMs && r.id < cur.id);
    if (isEarlier) best.set(r.phone, { id: r.id, t, createdAtMs });
  }
  const map = new Map<string, FirstOrder>();
  for (const [phone, v] of best) map.set(phone, { id: v.id, t: v.t });
  return map;
});

/**
 * ออเดอร์นี้เป็น "ลูกค้าใหม่" (acquisition = ออเดอร์แรกสุดของเบอร์ ระบุด้วย id) หรือไม่
 *  - ไม่มีเบอร์ → แยกไม่ได้ นับเป็นใหม่ (กันยอดหายจากยอดรวม)
 *  - มีเบอร์   → ใหม่ก็ต่อเมื่อ id ตรงกับออเดอร์แรกสุดของเบอร์
 */
export function isAcquisitionOrder(
  order: DatedOrder,
  firstOrderMap: Map<string, FirstOrder>,
): boolean {
  if (!order.phone) return true;
  const first = firstOrderMap.get(order.phone);
  return first === undefined || first.id === order.id;
}
