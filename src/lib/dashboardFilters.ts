/**
 * Dashboard filters — date range + view scope (สำหรับ LEADER)
 */

export type RangeKey = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';
export type ViewKey = 'self' | 'team';

/** preset ที่แสดงเป็นปุ่มเรียงกัน (custom ไม่อยู่ในนี้ เพราะมี UI เฉพาะ) */
export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'day',   label: 'วันนี้' },
  { key: 'week',  label: 'สัปดาห์' },
  { key: 'month', label: 'เดือน' },
  { key: 'year',  label: 'ปี' },
  { key: 'all',   label: 'ทั้งหมด' },
];

export const VALID_RANGES = new Set<string>([...RANGE_OPTIONS.map(r => r.key), 'custom']);
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

/** แปลง Date เป็นสตริง YYYY-MM-DD ตาม local time (ตรงกับค่าใน <input type="date">) */
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * parse พารามิเตอร์วันที่ YYYY-MM-DD → Date (เที่ยงคืน local) หรือ null ถ้าไม่ถูกต้อง
 * ปฏิเสธวันที่เกินจริง เช่น 2026-02-31
 */
export function parseDateParam(raw: unknown): Date | null {
  if (typeof raw !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(mo) - 1 ||
    date.getDate() !== Number(d)
  ) return null;
  return date;
}

function fmtThai(d: Date, withYear: boolean): string {
  return d.toLocaleDateString('th-TH', withYear
    ? { day: 'numeric', month: 'short', year: '2-digit' }
    : { day: 'numeric', month: 'short' });
}

/**
 * ช่วงเวลาแบบกำหนดเอง (inclusive ทั้ง from และ to)
 * end จะถูกเลื่อนไปเที่ยงคืนของวันถัดจาก to เพื่อให้ครอบคลุมทั้งวัน to
 * ช่วงก่อนหน้า = ช่วงความยาวเท่ากันที่อยู่ติดกันก่อนหน้า (ไว้เทียบ growth)
 */
export function resolveCustomRange(from: Date, to: Date, _now: Date = new Date()): DateRange {
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() + 1);
  const span = end.getTime() - start.getTime();
  const prevEnd = new Date(start);
  const prevStart = new Date(start.getTime() - span);

  const lastDay = new Date(end.getTime() - 86400000); // = to ที่เที่ยงคืน
  const sameDay = start.getTime() === lastDay.getTime();
  const crossYear = start.getFullYear() !== lastDay.getFullYear();
  const label = sameDay
    ? fmtThai(start, true)
    : `${fmtThai(start, crossYear)} – ${fmtThai(lastDay, true)}`;

  return { start, end, prevStart, prevEnd, label };
}

/**
 * resolve ช่วงเวลาจาก search params รวม preset + custom ไว้ที่เดียว
 * ถ้า range=custom แต่วันที่ไม่ถูกต้อง → fallback เป็น 'month'
 */
export function resolveRange(
  params: { range?: string; from?: string; to?: string },
  now: Date = new Date(),
): { range: RangeKey; dateRange: DateRange; from?: string; to?: string } {
  const range = parseRange(params.range, 'month');
  if (range === 'custom') {
    const from = parseDateParam(params.from);
    const to = parseDateParam(params.to);
    if (from && to && from.getTime() <= to.getTime()) {
      return { range: 'custom', dateRange: resolveCustomRange(from, to, now), from: params.from, to: params.to };
    }
    return { range: 'month', dateRange: resolveDateRange('month', now) };
  }
  return { range, dateRange: resolveDateRange(range, now) };
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
