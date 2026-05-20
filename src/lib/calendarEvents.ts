import { prisma } from './prisma';
import { getQueueFilter, type CurrentUser } from './auth';
import { getTaskFilter } from './tasks';

export type CalendarEvent = {
  date: string;           // 'YYYY-MM-DD'
  type: 'followup' | 'reorder' | 'lapsed_warning' | 'task';
  phone: string;
  name: string;
  note?: string;
  daysSinceOrder?: number;
  avgCycleDays?: number;
  taskId?: string;
  taskTitle?: string;
  taskType?: string;
  priority?: string;
  assigneeName?: string;
  isOverdue?: boolean;
};

function toDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function getCalendarEvents(user: CurrentUser): Promise<CalendarEvent[]> {
  const queueFilter = getQueueFilter(user);

  const orders = await prisma.sheetOrder.findMany({
    where: { ...queueFilter, phone: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { phone: true, customerName: true, createdAt: true },
  });

  const phoneMap = new Map<string, { name: string; dates: Date[] }>();
  for (const o of orders) {
    const ph = o.phone!;
    const ex = phoneMap.get(ph);
    if (!ex) {
      phoneMap.set(ph, { name: o.customerName || 'ไม่ระบุชื่อ', dates: [o.createdAt] });
    } else {
      if (o.customerName) ex.name = o.customerName;
      ex.dates.push(o.createdAt);
    }
  }

  const MS_DAY = 86_400_000;
  const now = Date.now();
  const cutoff = now - 7 * MS_DAY;
  const horizon = now + 60 * MS_DAY;

  const events: CalendarEvent[] = [];
  const phones = Array.from(phoneMap.keys());

  for (const [phone, data] of phoneMap) {
    const sorted = [...data.dates].sort((a, b) => a.getTime() - b.getTime());
    const lastOrderAt = sorted[sorted.length - 1];
    const daysSince = Math.floor((now - lastOrderAt.getTime()) / MS_DAY);

    let avgCycle = 30;
    if (sorted.length >= 2) {
      let total = 0;
      for (let i = 1; i < sorted.length; i++) {
        total += (sorted[i].getTime() - sorted[i - 1].getTime()) / MS_DAY;
      }
      avgCycle = Math.round(total / (sorted.length - 1));
      avgCycle = Math.max(10, Math.min(60, avgCycle));
    }

    const reorderTs = lastOrderAt.getTime() + (avgCycle - 5) * MS_DAY;
    if (reorderTs >= cutoff && reorderTs <= horizon) {
      events.push({
        date: toDateStr(new Date(reorderTs)),
        type: 'reorder',
        phone,
        name: data.name,
        daysSinceOrder: daysSince,
        avgCycleDays: avgCycle,
      });
    }

    const lapsedTs = lastOrderAt.getTime() + 60 * MS_DAY;
    if (lapsedTs >= cutoff && lapsedTs <= horizon) {
      events.push({
        date: toDateStr(new Date(lapsedTs)),
        type: 'lapsed_warning',
        phone,
        name: data.name,
        daysSinceOrder: daysSince,
      });
    }
  }

  const followUps = await prisma.crmFollowUp.findMany({
    where: {
      customerPhone: { in: phones },
      nextActionAt: { not: null, gte: new Date(cutoff) },
      sheetUserId: user.id,
    },
    orderBy: { createdAt: 'desc' },
    select: { customerPhone: true, nextActionAt: true, note: true },
  });

  const seen = new Set<string>();
  for (const fu of followUps) {
    if (!fu.nextActionAt || seen.has(fu.customerPhone)) continue;
    seen.add(fu.customerPhone);
    const data = phoneMap.get(fu.customerPhone);
    if (!data) continue;
    events.push({
      date: toDateStr(fu.nextActionAt),
      type: 'followup',
      phone: fu.customerPhone,
      name: data.name,
      note: fu.note ?? undefined,
    });
  }

  const taskFilter = await getTaskFilter(user);
  const taskRangeStart = new Date(cutoff);
  const taskRangeEnd = new Date(horizon);
  const pendingTasks = await prisma.customerTask.findMany({
    where: {
      AND: [
        taskFilter,
        { status: 'PENDING' as const },
        { dueDate: { gte: taskRangeStart, lte: taskRangeEnd } },
      ],
    },
    include: { assignedTo: { select: { fullName: true } } },
    orderBy: { dueDate: 'asc' },
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const t of pendingTasks) {
    const data = phoneMap.get(t.customerPhone);
    const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
    events.push({
      date: toDateStr(t.dueDate),
      type: 'task',
      phone: t.customerPhone,
      name: data?.name ?? t.customerPhone,
      taskId: t.id,
      taskTitle: t.title,
      taskType: t.type,
      priority: t.priority,
      note: t.note ?? undefined,
      assigneeName: t.assignedTo?.fullName,
      isOverdue: due < today,
    });
  }

  return events;
}
