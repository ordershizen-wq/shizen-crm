import { prisma } from './prisma';
import type { CurrentUser } from './auth';

/**
 * เช็คว่า user มีสิทธิ์ "เข้าถึง" ลูกค้าเบอร์นี้ไหม
 *
 *  ADMIN  → ทุกคน
 *  LEADER → ลูกค้าที่ salesRep อยู่ในทีมเดียวกัน
 *  MEMBER → ลูกค้าที่ salesRepId = user.id เท่านั้น
 *
 * คืนค่า reason ถ้าไม่มีสิทธิ์ (ใช้แสดงในข้อความ error)
 */
export async function canAccessCustomer(
  user: CurrentUser | null,
  phone: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!user) return { ok: false, reason: 'ไม่ได้เข้าสู่ระบบ' };
  if (user.role === 'ADMIN') return { ok: true };

  // ดู orders ของลูกค้า → เช็ค salesRepId
  const orders = await prisma.sheetOrder.findMany({
    where: { phone },
    select: { salesRepId: true },
    take: 50,
  });
  if (orders.length === 0) return { ok: false, reason: 'ไม่พบลูกค้านี้ในระบบ' };

  if (user.role === 'LEADER' && user.teamId) {
    const teamMembers = await prisma.sheetUser.findMany({
      where: { teamId: user.teamId },
      select: { id: true },
    });
    const teamIds = new Set(teamMembers.map(m => m.id));
    const inTeam = orders.some(o => o.salesRepId && teamIds.has(o.salesRepId));
    if (!inTeam) return { ok: false, reason: 'ลูกค้าคนนี้ไม่ใช่ของทีมคุณ' };
    return { ok: true };
  }

  // MEMBER → ต้องเป็น salesRep ของอย่างน้อย 1 order
  const isMine = orders.some(o => o.salesRepId === user.id);
  if (!isMine) return { ok: false, reason: 'ลูกค้าคนนี้ไม่ใช่ของคุณ' };
  return { ok: true };
}

/**
 * เช็คว่า user "แก้ไขข้อมูลของลูกค้าได้" ไหม
 *
 *  ADMIN  → ✅
 *  LEADER → ลูกค้าของทีม
 *  MEMBER → เฉพาะลูกค้าตัวเอง
 *
 * Grade / โอนลูกค้า / โน้ตสำคัญ → ใช้ฟังก์ชันนี้
 */
export async function canModifyCustomer(
  user: CurrentUser | null,
  phone: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return canAccessCustomer(user, phone);
}
