import { cache } from 'react';
import { prisma } from './prisma';
import { getSession } from './session';
import type { SheetUser } from '@prisma/client';

export type CurrentUser = SheetUser & {
  team: { id: string; name: string; color: string | null } | null;
};

/**
 * คืนค่า SheetUser ปัจจุบันจาก iron-session
 * - PACKER ไม่มีสิทธิ์เข้า CRM → return null
 * - INACTIVE → return null
 * - ไม่ได้ login → return null
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.sheetUser.findUnique({
    where: { id: session.userId },
    include: { team: { select: { id: true, name: true, color: true } } },
  });
  if (!user || user.isActive !== 'ACTIVE') return null;
  if (user.role === 'PACKER') return null;

  return user as CurrentUser;
});

/**
 * สร้าง Prisma filter สำหรับ SheetOrder ตาม role
 */
export async function getOrderFilter(
  user: CurrentUser | null,
  view: 'self' | 'team' = 'team',
): Promise<Record<string, unknown>> {
  if (!user) return {};

  if (user.role === 'ADMIN') return {};

  if (user.role === 'LEADER' && user.teamId) {
    if (view === 'self') return { salesRepId: user.id };
    const reps = await prisma.sheetUser.findMany({
      where: { teamId: user.teamId },
      select: { id: true },
    });
    return { salesRepId: { in: reps.map(r => r.id) } };
  }

  return { salesRepId: user.id };
}

export function getQueueFilter(user: CurrentUser | null): Record<string, unknown> {
  if (!user) return {};
  if (user.role === 'ADMIN') return {};
  return { salesRepId: user.id };
}
