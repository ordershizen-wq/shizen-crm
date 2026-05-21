/**
 * Rate limiter แบบ in-memory (per server instance)
 * — เหมาะกับทีมเล็ก ๆ 10-50 คน, traffic ต่ำ
 * — Vercel: รัน per-region; แต่ละ instance มี Map ของตัวเอง
 *   (พอเพียงสำหรับกัน brute-force พื้นฐาน, ไม่ใช่ DDoS)
 *
 * ใช้คู่กับ key เช่น `login:<ip>` หรือ `login:<employeeId>`
 */

type Entry = {
  count: number;
  firstAt: number;
  lockedUntil: number;
};

const store = new Map<string, Entry>();

export type RateLimitOptions = {
  /** จำนวนครั้งสูงสุดที่ผิดได้ในช่วง windowMs ก่อนถูก lock */
  max: number;
  /** ช่วงเวลานับ (ms) */
  windowMs: number;
  /** ระยะเวลาที่ถูก lock หลังเกิน max (ms) */
  lockMs: number;
};

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (entry?.lockedUntil && entry.lockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - now };
  }

  // นอก window → reset
  if (!entry || (now - entry.firstAt) > opts.windowMs) {
    store.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return { allowed: true, remaining: opts.max - 1 };
  }

  // ใน window — เพิ่ม count
  entry.count += 1;
  if (entry.count > opts.max) {
    entry.lockedUntil = now + opts.lockMs;
    store.set(key, entry);
    return { allowed: false, retryAfterMs: opts.lockMs };
  }
  store.set(key, entry);
  return { allowed: true, remaining: opts.max - entry.count };
}

/** เรียกหลัง login สำเร็จ — รีเซ็ต counter */
export function resetRateLimit(key: string) {
  store.delete(key);
}

/** Helper สำหรับสร้าง key จาก IP ของ request */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
