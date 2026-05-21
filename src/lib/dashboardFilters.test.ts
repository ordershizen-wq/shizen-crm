import { describe, it, expect } from 'vitest';
import { parseRange, parseView, resolveDateRange } from './dashboardFilters';

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
