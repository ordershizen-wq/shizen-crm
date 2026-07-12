'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit, resetRateLimit, getClientIp } from '@/lib/rateLimit';

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Login ด้วย employeeId + password (รหัสเดิมจากระบบ AppScript)
 * - verify bcrypt hash
 * - set iron-session
 */
export async function loginWithCredentials(
  employeeId: string,
  password: string,
): Promise<LoginResult> {
  const cleanId = employeeId.trim();
  if (!cleanId || !password) {
    return { ok: false, error: 'กรุณากรอกรหัสพนักงานและรหัสผ่าน' };
  }

  // Rate limit: 5 ครั้งผิดติด ๆ ต่อ IP+employeeId → lock 5 นาที
  const ip = getClientIp(await headers());
  const rlKey = `login:${ip}:${cleanId.toLowerCase()}`;
  const rl = checkRateLimit(rlKey, {
    max: 5,
    windowMs: 15 * 60 * 1000,  // นับใน 15 นาที
    lockMs: 5 * 60 * 1000,     // lock 5 นาที
  });
  if (!rl.allowed) {
    const mins = Math.ceil(rl.retryAfterMs / 60000);
    return { ok: false, error: `พยายามเข้าระบบเกินจำนวนที่กำหนด รอ ${mins} นาทีแล้วลองใหม่` };
  }

  const user = await prisma.sheetUser.findUnique({
    where: { employeeId: cleanId },
    select: {
      id: true, password: true, isActive: true, role: true,
    },
  });

  if (!user || user.isActive !== 'ACTIVE' || user.role === 'PACKER' || !user.password) {
    return { ok: false, error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' };
  }

  // ระบบภายในบริษัท: รหัสจาก AppScript เก็บเป็น plaintext → เทียบตรง ๆ
  // ส่วนรหัสที่เคยตั้งผ่านเว็บรุ่นก่อนเป็น bcrypt hash ($2...) → เทียบด้วย bcrypt (ไม่ให้บัญชีเดิมพัง)
  const match = user.password.startsWith('$2')
    ? await bcrypt.compare(password, user.password)
    : password === user.password;
  if (!match) {
    return { ok: false, error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' };
  }

  // ผ่าน — เคลียร์ counter
  resetRateLimit(rlKey);

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  return { ok: true };
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect('/login');
}

export async function updateCustomerNote(phone: string, note: string) {
  // ต้อง login ก่อน
  const user = await getCurrentUser();
  if (!user) throw new Error('ไม่ได้เข้าสู่ระบบ');

  await prisma.sheetCustomerExtra.upsert({
    where: { phone },
    update: { note },
    create: { phone, note },
  });
}

/**
 * เปลี่ยนรหัสผ่านของผู้ใช้ปัจจุบัน
 * - verify รหัสเดิม (รองรับทั้ง plaintext และ bcrypt hash เดิม)
 * - เก็บรหัสใหม่แบบ plaintext (ระบบภายใน แอดมินต้องดูรหัสได้)
 */
export async function changeMyPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' };

  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัว' };
  }
  if (newPassword === currentPassword) {
    return { ok: false, error: 'รหัสผ่านใหม่ต้องไม่เหมือนรหัสเดิม' };
  }

  if (!user.password) return { ok: false, error: 'บัญชีนี้ยังไม่ได้ตั้งรหัส' };
  const match = user.password.startsWith('$2')
    ? await bcrypt.compare(currentPassword, user.password)
    : currentPassword === user.password;
  if (!match) return { ok: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };

  await prisma.sheetUser.update({
    where: { id: user.id },
    data: {
      password: newPassword,
      passwordChangedAt: new Date(),
    },
  });

  return { ok: true };
}
