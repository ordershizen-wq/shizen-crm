import { describe, it, expect } from 'vitest';
import {
  parseRange, parseView, resolveDateRange,
  parseDateParam, toYmd, resolveCustomRange, resolveRange,
} from './dashboardFilters';

describe('parseRange', () => {
  it('คืนค่าที่ valid', () => {
    expect(parseRange('day')).toBe('day');
    expect(parseRange('week')).toBe('week');
    expect(parseRange('month')).toBe('month');
    expect(parseRange('year')).toBe('year');
    expect(parseRange('all')).toBe('all');
  });

  it('คืน fallback ถ้า input ไม่ valid', () => {
    expect(parseRange('garbage')).toBe('month');
    expect(parseRange(undefined)).toBe('month');
    expect(parseRange(null)).toBe('month');
    expect(parseRange(123)).toBe('month');
  });

  it('ใช้ fallback ที่ส่งมาได้', () => {
    expect(parseRange(undefined, 'week')).toBe('week');
  });
});

describe('parseView', () => {
  it('คืนค่าที่ valid', () => {
    expect(parseView('self')).toBe('self');
    expect(parseView('team')).toBe('team');
  });

  it('คืน fallback ถ้า invalid', () => {
    expect(parseView('all')).toBe('team');
    expect(parseView(undefined)).toBe('team');
  });
});

describe('resolveDateRange', () => {
  const NOW = new Date('2026-05-21T10:30:00'); // วันพฤหัส

  it('range=all → ไม่มี start/end', () => {
    const r = resolveDateRange('all', NOW);
    expect(r.start).toBeUndefined();
    expect(r.end).toBeUndefined();
    expect(r.label).toBe('ทั้งหมด');
  });

  it('range=day → start=วันนี้ 00:00, end=พรุ่งนี้ 00:00', () => {
    const r = resolveDateRange('day', NOW);
    expect(r.start?.getDate()).toBe(21);
    expect(r.start?.getHours()).toBe(0);
    expect(r.end?.getDate()).toBe(22);
    expect(r.prevStart?.getDate()).toBe(20);
  });

  it('range=month → start=วันแรกของเดือน, end=วันแรกของเดือนถัดไป', () => {
    const r = resolveDateRange('month', NOW);
    expect(r.start?.getMonth()).toBe(4); // May = 4
    expect(r.start?.getDate()).toBe(1);
    expect(r.end?.getMonth()).toBe(5);   // June
    expect(r.end?.getDate()).toBe(1);
    expect(r.prevStart?.getMonth()).toBe(3); // April
  });

  it('range=year → ทั้งปี', () => {
    const r = resolveDateRange('year', NOW);
    expect(r.start?.getFullYear()).toBe(2026);
    expect(r.start?.getMonth()).toBe(0);
    expect(r.start?.getDate()).toBe(1);
    expect(r.end?.getFullYear()).toBe(2027);
    expect(r.prevStart?.getFullYear()).toBe(2025);
  });

  it('range=week → start=วันจันทร์ของสัปดาห์, end=จันทร์ถัดไป', () => {
    // NOW = พฤหัส 21 พ.ค. 2026 → จันทร์คือ 18 พ.ค.
    const r = resolveDateRange('week', NOW);
    expect(r.start?.getDate()).toBe(18);
    expect(r.start?.getDay()).toBe(1); // Monday
    expect(r.end?.getDate()).toBe(25);
    expect(r.prevStart?.getDate()).toBe(11);
  });

  it('week ที่เป็นวันอาทิตย์ → start ยังเป็นจันทร์ของสัปดาห์ที่ผ่านมา', () => {
    const sunday = new Date('2026-05-24T10:00:00'); // อาทิตย์
    const r = resolveDateRange('week', sunday);
    // 24 พ.ค. อาทิตย์ → จันทร์ที่ผ่านมาคือ 18
    expect(r.start?.getDate()).toBe(18);
  });
});

describe('parseRange — custom', () => {
  it('ยอมรับ custom เป็นค่า valid', () => {
    expect(parseRange('custom')).toBe('custom');
  });
});

describe('toYmd', () => {
  it('แปลงเป็น YYYY-MM-DD ตาม local (เลขเดือน/วันเติม 0)', () => {
    expect(toYmd(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toYmd(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('parseDateParam', () => {
  it('parse วันที่ถูกต้องเป็น Date เที่ยงคืน local', () => {
    const d = parseDateParam('2026-05-21');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(21);
    expect(d?.getHours()).toBe(0);
  });

  it('ปฏิเสธ input ที่ไม่ถูกต้อง', () => {
    expect(parseDateParam('2026-13-01')).toBeNull(); // เดือนเกิน
    expect(parseDateParam('2026-02-31')).toBeNull(); // วันเกินจริง
    expect(parseDateParam('21-05-2026')).toBeNull(); // ผิดรูปแบบ
    expect(parseDateParam('garbage')).toBeNull();
    expect(parseDateParam(undefined)).toBeNull();
    expect(parseDateParam(123)).toBeNull();
  });
});

describe('resolveCustomRange', () => {
  it('inclusive ทั้ง from และ to (end = วันถัดจาก to เที่ยงคืน)', () => {
    const r = resolveCustomRange(new Date(2026, 4, 1), new Date(2026, 4, 21));
    expect(r.start?.getDate()).toBe(1);
    expect(r.start?.getHours()).toBe(0);
    expect(r.end?.getDate()).toBe(22); // 21 + 1
    expect(r.end?.getMonth()).toBe(4);
  });

  it('ช่วงก่อนหน้า = ความยาวเท่ากันที่อยู่ติดกันก่อนหน้า', () => {
    // 1–7 พ.ค. (7 วัน) → ช่วงก่อนหน้า 24–30 เม.ย.
    const r = resolveCustomRange(new Date(2026, 4, 1), new Date(2026, 4, 7));
    expect(r.prevEnd?.getTime()).toBe(r.start?.getTime());
    expect(r.prevStart?.getDate()).toBe(24);
    expect(r.prevStart?.getMonth()).toBe(3); // เมษายน
  });
});

describe('resolveRange', () => {
  it('preset ปกติ → ใช้ resolveDateRange', () => {
    const r = resolveRange({ range: 'week' }, new Date('2026-05-21T10:00:00'));
    expect(r.range).toBe('week');
    expect(r.dateRange.start?.getDate()).toBe(18);
  });

  it('custom ที่ valid → ช่วงตามที่เลือก + ส่ง from/to กลับ', () => {
    const r = resolveRange({ range: 'custom', from: '2026-05-01', to: '2026-05-21' });
    expect(r.range).toBe('custom');
    expect(r.from).toBe('2026-05-01');
    expect(r.to).toBe('2026-05-21');
    expect(r.dateRange.start?.getDate()).toBe(1);
    expect(r.dateRange.end?.getDate()).toBe(22);
  });

  it('custom ที่ from > to → fallback เป็น month', () => {
    const r = resolveRange({ range: 'custom', from: '2026-05-21', to: '2026-05-01' });
    expect(r.range).toBe('month');
    expect(r.from).toBeUndefined();
  });

  it('custom ที่วันที่ไม่ถูกต้อง → fallback เป็น month', () => {
    const r = resolveRange({ range: 'custom', from: 'garbage', to: '2026-05-01' });
    expect(r.range).toBe('month');
  });
});
