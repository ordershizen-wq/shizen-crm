'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { COOKIE_NAME } from '@/lib/auth';

export async function loginAsSheetUser(userId: string) {
  const user = await prisma.sheetUser.findUnique({ where: { id: userId } });
  if (!user || user.isActive !== 'ACTIVE' || user.role === 'PACKER') {
    throw new Error('ผู้ใช้งานไม่ถูกต้อง');
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  redirect('/');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect('/login');
}

export async function updateCustomerNote(phone: string, note: string) {
  await prisma.sheetCustomerExtra.upsert({
    where: { phone },
    update: { note },
    create: { phone, note },
  });
}
