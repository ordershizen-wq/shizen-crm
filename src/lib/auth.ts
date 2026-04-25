import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { SheetUser } from '@prisma/client';

const COOKIE_NAME = 'sheet_user_id';

export type CurrentUser = SheetUser & {
  team: { id: string; name: string; color: string | null } | null;
};

/**
 * คืนค่า SheetUser (เซลส์) ปัจจุบัน จาก cookie
 * PACKER ไม่มีสิทธิ์เข้า CRM → return null
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(COOKIE_NAME)?.value;
  if (!userId) return null;

  const user = await prisma.sheetUser.findUnique({ where: { id: userId } });
  if (!user || user.isActive !== 'ACTIVE') return null;
  if (user.role === 'PACKER') return null;

  let team: CurrentUser['team'] = null;
  if (user.teamId) {
    team = await prisma.sheetTeam.findUnique({
      where: { id: user.teamId },
      select: { id: true, name: true, color: true },
    });
  }

  return { ...user, team };
}

/**
 * สร้าง Prisma filter สำหรับ SheetOrder ตาม role:
 * - ADMIN  → {} (เห็นทุกออเดอร์)
 * - LEADER → salesRepId IN [ทีมตัวเอง] (เห็นทั้งทีม)
 * - MEMBER → salesRepId = ตัวเอง (เห็นแค่ของตัวเอง)
 */
export async function getOrderFilter(user: CurrentUser | null): Promise<Record<string, unknown>> {
  if (!user) return {};

  if (user.role === 'ADMIN') return {};

  if (user.role === 'LEADER' && user.teamId) {
    const reps = await prisma.sheetUser.findMany({
      where: { teamId: user.teamId },
      select: { id: true },
    });
    return { salesRepId: { in: reps.map(r => r.id) } };
  }

  // MEMBER (หรือ LEADER ที่ไม่มีทีม) → เห็นแค่ของตัวเอง
  return { salesRepId: user.id };
}

/**
 * Filter สำหรับ Follow-up Queue (งานวันนี้)
 * ทั้ง LEADER และ MEMBER เห็นแค่ลูกค้าของตัวเอง
 * ADMIN เห็นทุกคน
 */
export function getQueueFilter(user: CurrentUser | null): Record<string, unknown> {
  if (!user) return {};
  if (user.role === 'ADMIN') return {};
  return { salesRepId: user.id };
}

export { COOKIE_NAME };
