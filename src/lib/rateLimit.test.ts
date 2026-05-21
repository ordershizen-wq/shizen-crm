import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit, getClientIp } from './rateLimit';

const opts = { max: 3, windowMs: 60_000, lockMs: 10_000 };

describe('checkRateLimit', () => {
  // ใช้ key unique ต่อ test เพื่อไม่ให้กระทบกัน
  let key = '';
  beforeEach(() => {
    key = `test:${Date.now()}:${Math.random()}`;
  });

  it('ยอมให้ครั้งแรกผ่าน', () => {
    const r = checkRateLimit(key, opts);
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.remaining).toBe(2);
  });

  it('นับ remaining ลงทีละครั้ง', () => {
    const r1 = checkRateLimit(key, opts);
    const r2 = checkRateLimit(key, opts);
    const r3 = checkRateLimit(key, opts);
    expect(r1.allowed && r1.remaining).toBe(2);
    expect(r2.allowed && r2.remaining).toBe(1);
    expect(r3.allowed && r3.remaining).toBe(0);
  });

  it('ครั้งที่ max+1 ถูก block', () => {
    checkRateLimit(key, opts);
    checkRateLimit(key, opts);
    checkRateLimit(key, opts);
    const r4 = checkRateLimit(key, opts);
    expect(r4.allowed).toBe(false);
    if (!r4.allowed) expect(r4.retryAfterMs).toBeGreaterThan(0);
  });

  it('หลัง block ยังคง block อยู่ ถ้ายังไม่หมด lockMs', () => {
    for (let i = 0; i < 5; i++) checkRateLimit(key, opts);
    const r = checkRateLimit(key, opts);
    expect(r.allowed).toBe(false);
  });

  it('resetRateLimit เคลียร์ counter', () => {
    checkRateLimit(key, opts);
    checkRateLimit(key, opts);
    resetRateLimit(key);
    const r = checkRateLimit(key, opts);
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.remaining).toBe(2);
  });

  it('key ต่างกันแยกกันนับ', () => {
    const k1 = key + ':a';
    const k2 = key + ':b';
    checkRateLimit(k1, opts);
    checkRateLimit(k1, opts);
    checkRateLimit(k1, opts);
    // k1 ใช้ครบ 3 แล้ว, แต่ k2 ยังใหม่
    const rB = checkRateLimit(k2, opts);
    expect(rB.allowed).toBe(true);
    if (rB.allowed) expect(rB.remaining).toBe(2);
  });
});

describe('getClientIp', () => {
  it('ดึงจาก x-forwarded-for', () => {
    const h = new Headers({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' });
    expect(getClientIp(h)).toBe('203.0.113.1');
  });

  it('fallback ไป x-real-ip', () => {
    const h = new Headers({ 'x-real-ip': '203.0.113.5' });
    expect(getClientIp(h)).toBe('203.0.113.5');
  });

  it("คืน 'unknown' ถ้าไม่มี header เลย", () => {
    const h = new Headers();
    expect(getClientIp(h)).toBe('unknown');
  });

  it('x-forwarded-for มาก่อน x-real-ip', () => {
    const h = new Headers({
      'x-forwarded-for': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
    });
    expect(getClientIp(h)).toBe('1.1.1.1');
  });
});
