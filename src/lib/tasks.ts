import { prisma } from './prisma';
import { getQueueFilter, type CurrentUser } from './auth';
import { aggregateOrdersByPhone, calculateStage, type CustomerStage } from './customer';
import type { Prisma } from '@prisma/client';

/**
 * Filter Tasks ตาม role:
 * - ADMIN  → เห็นทุก task
 * - LEADER → เห็น task ที่ assign ให้คนในทีมตัวเอง (รวมตัวเอง)
 * - MEMBER → เห็นแค่ที่ assign ให้ตัวเอง (หรือที่ตัวเองสร้าง)
 */
export async function getTaskFilter(user: CurrentUser | null): Promise<Prisma.CustomerTaskWhereInput> {
  if (!user) return { id: '__none__' };

  if (user.role === 'ADMIN') return {};

  if (user.role === 'LEADER' && user.teamId) {
    const teamMembers = await prisma.sheetUser.findMany({
      where: { teamId: user.teamId },
      select: { id: true },
    });
    const ids = teamMembers.map(m => m.id);
    return {
      OR: [
        { assignedToId: { in: ids } },
        { createdById: { in: ids } },
      ],
    };
  }

  return {
    OR: [
      { assignedToId: user.id },
      { createdById: user.id },
    ],
  };
}

export type TaskSuggestion = {
  phone: string;
  name: string;
  stage: CustomerStage;          // AT_RISK | LAPSED
  daysSince: number;
  orderCount: number;
  totalSpent: number;
  reason: string;                // ข้อความสั้นบอกเหตุผล
};

/**
 * คำนวณลูกค้าที่ "ควรติดตามวันนี้" — มาจาก stage rule, ไม่ใช่ CustomerTask
 *
 * Exclude:
 * - ลูกค้าที่มี active CustomerTask อยู่แล้ว (กันสร้างงานซ้ำ)
 * - ลูกค้าที่มี CrmFollowUp.nextActionAt อนาคต (มีนัดอยู่แล้ว)
 */
export async function getTaskSuggestions(user: CurrentUser | null): Promise<TaskSuggestion[]> {
  if (!user) return [];
  const queueFilter = getQueueFilter(user);

  // 1) Aggregate ใน DB
  const phoneAggs = await aggregateOrdersByPhone(queueFilter);
  if (phoneAggs.length === 0) return [];

  // 2) เอาเฉพาะลูกค้าที่ stage เป็น AT_RISK/LAPSED ก่อน (filter ฝั่ง JS แต่ทำกับ aggregate ไม่ใช่ทุก row)
  const candidates = phoneAggs.filter(r => {
    const stage = calculateStage(r);
    return stage === 'AT_RISK' || stage === 'LAPSED';
  });
  if (candidates.length === 0) return [];

  const phones = candidates.map(r => r.phone);

  // 3) ดึงชื่อล่าสุดต่อเบอร์ (distinct on phone — เร็วเพราะ filter ด้วยรายชื่อเบอร์ที่ลดลงแล้ว)
  const latestNames = await prisma.sheetOrder.findMany({
    where: { ...queueFilter, phone: { in: phones } },
    orderBy: [{ phone: 'asc' }, { createdAt: 'desc' }],
    distinct: ['phone'],
    select: { phone: true, customerName: true },
  });
  const nameMap = new Map(latestNames.map(o => [o.phone!, o.customerName || 'ไม่ระบุชื่อ']));

  // ลูกค้าที่มีงาน active อยู่แล้ว
  const activeTasks = await prisma.customerTask.findMany({
    where: {
      customerPhone: { in: phones },
      status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING_REPLY'] },
    },
    select: { customerPhone: true },
  });
  const hasActiveTask = new Set(activeTasks.map(t => t.customerPhone));

  // ลูกค้าที่มี CrmFollowUp นัดอนาคต — ไม่นับลูกค้าซ้ำ
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const futureNudges = await prisma.crmFollowUp.findMany({
    where: { customerPhone: { in: phones }, nextActionAt: { gt: todayEnd } },
    select: { customerPhone: true },
  });
  const hasFutureNudge = new Set(futureNudges.map(n => n.customerPhone));

  const suggestions: TaskSuggestion[] = [];
  for (const row of candidates) {
    if (hasActiveTask.has(row.phone)) continue;
    if (hasFutureNudge.has(row.phone)) continue;

    const stage = calculateStage(row) as 'AT_RISK' | 'LAPSED';
    const daysSince = Math.floor((Date.now() - row.lastOrderAt.getTime()) / 86400000);
    const reason = stage === 'AT_RISK'
      ? `ห่างไป ${daysSince} วัน — ถึงเวลารีออเดอร์`
      : `ห่างไป ${daysSince} วัน — เริ่มห่างหาย`;

    suggestions.push({
      phone: row.phone,
      name: nameMap.get(row.phone) ?? 'ไม่ระบุชื่อ',
      stage,
      daysSince,
      orderCount: row.orderCount,
      totalSpent: row.totalSpent,
      reason,
    });
  }

  // เรียง: AT_RISK ก่อน LAPSED, แล้ว totalSpent มาก→น้อย
  suggestions.sort((a, b) => {
    if (a.stage !== b.stage) return a.stage === 'AT_RISK' ? -1 : 1;
    return b.totalSpent - a.totalSpent;
  });

  return suggestions;
}

export function canManageTask(
  user: CurrentUser | null,
  task: { assignedToId: string | null; createdById: string | null },
  teamMemberIds?: Set<string>,
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'LEADER' && teamMemberIds) {
    if (task.assignedToId && teamMemberIds.has(task.assignedToId)) return true;
    if (task.createdById && teamMemberIds.has(task.createdById)) return true;
  }
  return task.assignedToId === user.id || task.createdById === user.id;
}
