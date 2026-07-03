import { toYmd } from './dashboardFilters';

// นโยบายวันที่ปิดการขาย — เซลส์เลือกย้อนหลังได้ (ลูกค้าปิดจริงวันหนึ่ง แต่มาลงระบบทีหลัง)
// แต่จำกัดช่วงกันย้อนไกลเกินจริง/ไปแก้ยอดเดือนเก่าที่ปิดบัญชีไปแล้ว
export const MAX_BACKDATE_DAYS = 30;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** แปลง "YYYY-MM-DD" (จาก <input type=date>) → Date เที่ยงวันตามเวลาท้องถิ่น (กัน DST/boundary ตกขอบ) */
export function parseOrderDateInput(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), 12, 0, 0, 0);
  return isNaN(date.getTime()) ? null : date;
}

/** เช็คว่าวันที่อยู่ในช่วงที่อนุญาต: วันนี้ย้อนหลังได้ไม่เกิน MAX_BACKDATE_DAYS วัน ห้ามเป็นอนาคต */
export function isOrderDateAllowed(date: Date, now: Date = new Date()): boolean {
  const today = startOfLocalDay(now);
  const target = startOfLocalDay(date);
  const minAllowed = new Date(today);
  minAllowed.setDate(minAllowed.getDate() - MAX_BACKDATE_DAYS);
  return target >= minAllowed && target <= today;
}

export { toYmd };
