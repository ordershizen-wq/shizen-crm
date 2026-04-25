/**
 * คำนวณ stage ของลูกค้าจาก lastOrderDate + orderCount + totalSpent
 * ใช้งานกับลูกค้าที่ group จาก SheetOrder แล้ว
 */

export type CustomerStage = 'NEW' | 'ACTIVE' | 'AT_RISK' | 'LAPSED' | 'LOST' | 'VIP';

export function calculateStage(params: {
  lastOrderAt: Date | null;
  orderCount: number;
  totalSpent: number;
}): CustomerStage {
  const { lastOrderAt, orderCount, totalSpent } = params;
  if (!lastOrderAt) return 'NEW';

  const daysSince = Math.floor(
    (Date.now() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24)
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
