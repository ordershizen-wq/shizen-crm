/**
 * Dashboard filters — date range + view scope (สำหรับ LEADER)
 */

export type RangeKey = 'day' | 'week' | 'month' | 'year' | 'all';
export type ViewKey = 'self' | 'team';

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'day',   label: 'วันนี้' },
  { key: 'week',  label: 'สัปดาห์' },
  { key: 'month', label: 'เดือน' },
  { key: 'year',  label: 'ปี' },
  { key: 'all',   label: 'ทั้งหมด' },
];

export const VALID_RANGES = new Set<string>(RANGE_OPTIONS.map(r => r.key));
export const VALID_VIEWS = new Set<string>(['self', 'team']);

export type DateRange = {
  start?: Date;
  end?: Date;
  label: string;
  prevStart?: Date;   // ช่วงก่อนหน้าเพื่อเปรียบเทียบ
  prevEnd?: Date;
};

/**
 * คำนวณ start/end + ช่วงก่อนหน้า (เพื่อ growth comparison)
 *
 * day   → วันนี้ vs เมื่อวาน
 * week  → สัปดาห์นี้ (จ-อา) vs สัปดาห์ก่อน
 * month → เดือนนี้ vs เดือนก่อน
 * year  → ปีนี้ vs ปีก่อน
 * all   → ไม่มี filter, ไม่มีช่วงเทียบ
 */
export function resolveDateRange(range: RangeKey, now: Date = new Date()): DateRange {
  if (range === 'all') return { label: 'ทั้งหมด' };

  if (range === 'day') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1);
    const prevEnd = new Date(start);
    return { start, end, prevStart, prevEnd, label: 'วันนี้' };
  }

  if (range === 'week') {
    // Monday-start week
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const dow = start.getDay(); // 0=Sun..6=Sat
    const offset = (dow + 6) % 7; // distance from Monday
    start.setDate(start.getDate() - offset);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(start);
    return { start, end, prevStart, prevEnd, label: 'สัปดาห์นี้' };
  }

  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end, prevStart, prevEnd, label: 'เดือนนี้' };
  }

  // year
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  const prevStart = new Date(now.getFullYear() - 1, 0, 1);
  const prevEnd = new Date(now.getFullYear(), 0, 1);
  return { start, end, prevStart, prevEnd, label: 'ปีนี้' };
}

export function parseRange(raw: unknown, fallback: RangeKey = 'month'): RangeKey {
  if (typeof raw === 'string' && VALID_RANGES.has(raw)) return raw as RangeKey;
  return fallback;
}

export function parseView(raw: unknown, fallback: ViewKey = 'team'): ViewKey {
  if (typeof raw === 'string' && VALID_VIEWS.has(raw)) return raw as ViewKey;
  return fallback;
}

/** ใส่ where clause createdAt ถ้ามี range */
export function applyDateFilter<T extends { createdAt?: object }>(
  where: T,
  range: DateRange,
): T {
  if (!range.start || !range.end) return where;
  return { ...where, createdAt: { gte: range.start, lt: range.end } };
}
