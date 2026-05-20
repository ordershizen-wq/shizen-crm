import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';

export type SessionData = {
  userId?: string;
};

const password = process.env.IRON_SESSION_PASSWORD;
if (!password || password.length < 32) {
  // ไม่ throw ระหว่าง build เพื่อไม่ให้ Next.js ดับ — แต่ runtime ที่ใช้ session จะล้ม
  // ตั้งใน .env: IRON_SESSION_PASSWORD = string ยาว ≥32 ตัวอักษร (random)
  console.warn(
    '[session] IRON_SESSION_PASSWORD missing or <32 chars. Session will fail at runtime.',
  );
}

export const sessionOptions: SessionOptions = {
  password: password || 'placeholder-build-time-only-must-be-replaced-32+chars',
  cookieName: 'shizen_session',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 วัน
    path: '/',
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
