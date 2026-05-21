import { describe, it, expect } from 'vitest';
import {
  calcAvgCycleDays,
  calcReorderAt,
  calcDaysUntilReorder,
  classifyReorderBucket,
  isInReorderWindow,
} from './reorderMath';

const MS_DAY = 86_400_000;
const NOW = new Date('2026-05-21T00:00:00Z');
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * MS_DAY);
const daysAgo = (n: number) => daysFromNow(-n);

describe('calcAvgCycleDays', () => {
  it('คืน 30 เมื่อมีออเดอร์เดียว (default cycle)', () => {
    expect(calcAvgCycleDays([daysAgo(20)])).toBe(30);
  });

  it('คืน 30 เมื่อไม่มีออเดอร์ (default)', () => {
    expect(calcAvgCycleDays([])).toBe(30);
  });

  it('คำนวณค่าเฉลี่ยระหว่าง 2 ออเดอร์', () => {
    // สั่ง 60 และ 30 วันก่อน → ห่างกัน 30 วัน
    expect(calcAvgCycleDays([daysAgo(60), daysAgo(30)])).toBe(30);
  });

  it('คำนวณค่าเฉลี่ยจาก 3+ ออเดอร์', () => {
    // ห่าง 25, 30 → เฉลี่ย ~27.5 → ปัดเป็น 28
    expect(calcAvgCycleDays([daysAgo(85), daysAgo(60), daysAgo(30)])).toBe(28);
  });

  it('clamp ที่ขั้นต่ำ 10 วันแม้จะสั่งถี่กว่านั้น', () => {
    // ห่าง 5 วัน → ควร clamp เป็น 10
    expect(calcAvgCycleDays([daysAgo(10), daysAgo(5)])).toBe(10);
  });

  it('clamp ที่ขั้นสูง 60 วันแม้จะสั่งห่างกว่านั้น', () => {
    // ห่าง 100 วัน → clamp เป็น 60
    expect(calcAvgCycleDays([daysAgo(110), daysAgo(10)])).toBe(60);
  });

  it('input ไม่เรียงก็คำนวณถูก', () => {
    // ใส่สลับลำดับ → ผลลัพธ์เหมือนใส่เรียง
    expect(calcAvgCycleDays([daysAgo(30), daysAgo(60), daysAgo(85)])).toBe(28);
  });
});

describe('calcReorderAt', () => {
  it('reorderAt = lastOrderAt + (avgCycle - 5) วัน', () => {
    const last = daysAgo(0); // วันนี้
    const r = calcReorderAt(last, 30);
    // ควรเป็นอีก 25 วันข้างหน้า
    const expected = new Date(last.getTime() + 25 * MS_DAY);
    expect(r.getTime()).toBe(expected.getTime());
  });

  it('cycle สั้น (10 วัน) → reorderAt = lastOrder + 5 วัน', () => {
    const last = daysAgo(0);
    const r = calcReorderAt(last, 10);
    const expected = new Date(last.getTime() + 5 * MS_DAY);
    expect(r.getTime()).toBe(expected.getTime());
  });
});

describe('calcDaysUntilReorder', () => {
  it('reorderAt วันนี้ → 0', () => {
    expect(calcDaysUntilReorder(NOW, NOW)).toBe(0);
  });

  it('reorderAt อนาคต → ค่าบวก', () => {
    expect(calcDaysUntilReorder(daysFromNow(5), NOW)).toBe(5);
  });

  it('reorderAt ในอดีต → ค่าลบ', () => {
    expect(calcDaysUntilReorder(daysAgo(3), NOW)).toBe(-3);
  });
});

describe('classifyReorderBucket', () => {
  it('< 0 → overdue', () => {
    expect(classifyReorderBucket(-1)).toBe('overdue');
    expect(classifyReorderBucket(-15)).toBe('overdue');
  });

  it('= 0 → today', () => {
    expect(classifyReorderBucket(0)).toBe('today');
  });

  it('1-7 → soon', () => {
    expect(classifyReorderBucket(1)).toBe('soon');
    expect(classifyReorderBucket(7)).toBe('soon');
  });

  it('> 7 → upcoming', () => {
    expect(classifyReorderBucket(8)).toBe('upcoming');
    expect(classifyReorderBucket(25)).toBe('upcoming');
  });
});

describe('isInReorderWindow', () => {
  it('±30 วันรอบ 0 = อยู่ใน window', () => {
    expect(isInReorderWindow(0)).toBe(true);
    expect(isInReorderWindow(-30)).toBe(true);
    expect(isInReorderWindow(30)).toBe(true);
  });

  it('เลย ±30 วัน = ตัดออก', () => {
    expect(isInReorderWindow(-31)).toBe(false);
    expect(isInReorderWindow(31)).toBe(false);
    expect(isInReorderWindow(-100)).toBe(false);
  });

  it('use case: ลูกค้าเลยกำหนด 5 วัน → ยังอยู่ในคิว', () => {
    expect(isInReorderWindow(-5)).toBe(true);
  });
});

describe('flow end-to-end: ลูกค้าจริง', () => {
  it('ลูกค้าซื้อทุก 30 วัน, ครั้งล่าสุด 28 วันก่อน → reorder วันนี้', () => {
    const dates = [daysAgo(58), daysAgo(28)];
    const avg = calcAvgCycleDays(dates);
    expect(avg).toBe(30);

    const last = dates[dates.length - 1];
    const reorderAt = calcReorderAt(last, avg);
    const days = calcDaysUntilReorder(reorderAt, NOW);

    // 28 วันก่อน + (30-5) = -3 วัน → เลยกำหนด 3 วัน
    expect(days).toBe(-3);
    expect(classifyReorderBucket(days)).toBe('overdue');
    expect(isInReorderWindow(days)).toBe(true);
  });

  it('ลูกค้าใหม่ ซื้อครั้งเดียว 25 วันก่อน → เตือนรีออเดอร์ในอนาคต', () => {
    const dates = [daysAgo(25)];
    const avg = calcAvgCycleDays(dates);    // default 30
    const last = dates[0];
    const reorderAt = calcReorderAt(last, avg);
    const days = calcDaysUntilReorder(reorderAt, NOW);

    // 25 วันก่อน + 25 = วันนี้
    expect(days).toBe(0);
    expect(classifyReorderBucket(days)).toBe('today');
  });
});
