/**
 * คำนวณ stage ของลูกค้าจาก lastOrderDate + orderCount + totalSpent
 * ใช้งานกับลูกค้าที่ group จาก SheetOrder แล้ว
 */

export type CustomerStage = 'NEW' | 'ACTIVE' | 'AT_RISK' | 'LAPSED' | 'LOST' | 'VIP';

export function calculateStage(params: {
  lastOrderAt: Date | null;
  orderCount: number;
  totalSpent: number;
  /** สำหรับ test — default = วันนี้ */
  now?: Date;
}): CustomerStage {
  const { lastOrderAt, orderCount, totalSpent } = params;
  if (!lastOrderAt) return 'NEW';

  const nowMs = (params.now ?? new Date()).getTime();
  const daysSince = Math.floor(
    (nowMs - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // VIP = ซื้อ ≥ 3 ครั้ง หรือยอดรวม ≥ 20,000
  if ((orderCount >= 3 || totalSpent >= 20000) && daysSince <= 60) {
    return 'VIP';
  }

  if (daysSince <= 14) return 'NEW';
  if (daysSince <= 30) return 'ACTIVE';
  if (daysSince <= 60) return 'AT_RISK';
  if (daysSince <= 120) return 'LAPSED';
  return 'LOST';
}

export const STAGE_LABELS: Record<CustomerStage, string> = {
  NEW: 'พึ่งสั่ง',
  ACTIVE: 'ยังใช้อยู่',
  AT_RISK: 'ต้องรีออเดอร์แล้ว',
  LAPSED: 'ห่างหายไปนาน',
  LOST: 'หยุดใช้สินค้า',
  VIP: 'ลูกค้าประจำ VIP',
};

export const STAGE_ICONS: Record<CustomerStage, string> = {
  NEW: 'ri-seedling-line',
  ACTIVE: 'ri-heart-pulse-line',
  AT_RISK: 'ri-alarm-warning-line',
  LAPSED: 'ri-time-line',
  LOST: 'ri-close-circle-line',
  VIP: 'ri-vip-crown-line',
};

/**
 * Normalize เบอร์โทร - เอาเฉพาะตัวเลข
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9]/g, '');
  return cleaned.length >= 9 ? cleaned : null;
}

/**
 * กฎการจัดเก็บเบอร์ใน DB — **ตัวเลขล้วนเสมอ** (หรือ null ถ้าไม่มีตัวเลขเลย)
 * ใช้ทุกจุดที่เขียน/ค้นเบอร์ (createOrder, createReorder, lookup, webhook)
 * ต่างจาก normalizePhone ตรงที่ไม่ทิ้งเบอร์สั้น — เก็บตามจริงเพื่อไม่ให้ข้อมูลหาย
 * (เบอร์ format เพี้ยน เช่น "081-234-5678", "โทร.08x" เคยทำให้ลูกค้าคนเดียวแตกเป็น 2 โปรไฟล์)
 */
export function toPhoneDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length > 0 ? digits : null;
}

import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

export type PhoneAggregate = {
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Date;
};

/**
 * รวมยอดต่อเบอร์ในระดับ DB (Postgres GROUP BY) แทนการดึงทุก row มา reduce ใน JS
 * เร็วกว่า findMany หลายเท่าเมื่อมี order หลักหมื่น+
 */
export async function aggregateOrdersByPhone(
  where: Prisma.SheetOrderWhereInput,
): Promise<PhoneAggregate[]> {
  const rows = await prisma.sheetOrder.groupBy({
    by: ['phone'],
    where: { ...where, phone: { not: null } },
    _count: { _all: true },
    _sum: { totalPrice: true },
    _max: { createdAt: true },
  });

  const out: PhoneAggregate[] = [];
  for (const r of rows) {
    if (!r.phone || !r._max.createdAt) continue;
    out.push({
      phone: r.phone,
      orderCount: r._count._all,
      totalSpent: Number(r._sum.totalPrice ?? 0),
      lastOrderAt: r._max.createdAt,
    });
  }
  return out;
}

export function tallyStages(rows: PhoneAggregate[]): Record<CustomerStage, number> {
  const tally: Record<CustomerStage, number> = {
    VIP: 0, NEW: 0, ACTIVE: 0, AT_RISK: 0, LAPSED: 0, LOST: 0,
  };
  for (const r of rows) {
    tally[calculateStage(r)] += 1;
  }
  return tally;
}
