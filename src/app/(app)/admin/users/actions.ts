'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export type ResetResult =
  | { ok: true; userName: string; newPassword: string }
  | { ok: false; error: string };

/**
 * Admin reset รหัสผ่านของผู้ใช้คนอื่น
 * - ต้องเป็น ADMIN
 * - เก็บรหัสใหม่แบบ plaintext (ระบบภายใน แอดมินดูรหัสได้ที่ตารางผู้ใช้)
 * - คืนค่ารหัสใหม่กลับไปให้ admin บอกพนักงาน
 */
export async function resetUserPassword(
  targetUserId: string,
  newPassword: string,
): Promise<ResetResult> {
  const caller = await getCurrentUser();
  if (!caller) return { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' };
  if (caller.role !== 'ADMIN') {
    return { ok: false, error: 'เฉพาะแอดมินเท่านั้น' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'รหัสใหม่ต้องยาวอย่างน้อย 6 ตัว' };
  }

  const target = await prisma.sheetUser.findUnique({
    where: { id: targetUserId },
    select: { id: true, fullName: true, role: true },
  });
  if (!target) return { ok: false, error: 'ไม่พบผู้ใช้นี้' };
  if (target.role === 'PACKER') {
    return { ok: false, error: 'PACKER ไม่มีสิทธิ์ใช้ CRM' };
  }

  await prisma.sheetUser.update({
    where: { id: targetUserId },
    data: {
      password: newPassword,
      passwordChangedAt: new Date(),
    },
  });

  revalidatePath('/admin/users');
  return { ok: true, userName: target.fullName, newPassword };
}
