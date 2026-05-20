'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getCurrentUser } from '@/lib/auth';

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

  const user = await prisma.sheetUser.findUnique({
    where: { employeeId: cleanId },
    select: {
      id: true, password: true, isActive: true, role: true,
    },
  });

  if (!user || user.isActive !== 'ACTIVE' || user.role === 'PACKER' || !user.password) {
    return { ok: false, error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' };
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return { ok: false, error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' };
  }

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
 * - verify รหัสเดิม
 * - hash ใหม่ + clear mustChangePassword flag
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
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) return { ok: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.sheetUser.update({
    where: { id: user.id },
    data: {
      password: newHash,
      passwordChangedAt: new Date(),
    },
  });

  return { ok: true };
}
