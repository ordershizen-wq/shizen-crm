import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTaskFilter, getTaskSuggestions } from '@/lib/tasks';
import EmptyState from '@/components/EmptyState';
import TasksFilterClient from './TasksFilterClient';
import TasksList from './TasksList';
import TasksKanban from './TasksKanban';
import TaskSuggestionsSection from './TaskSuggestionsSection';

type Props = { searchParams: Promise<{ scope?: string; status?: string; range?: string; view?: string; groupBy?: string }> };

export default async function TasksPage({ searchParams }: Props) {
  const sp = await searchParams;
  const scope    = (sp.scope    ?? 'all')      as 'all' | 'me';
  const status   = (sp.status   ?? 'pending')  as 'pending' | 'done' | 'all';
  const range    = (sp.range    ?? 'all')      as 'today' | 'overdue' | 'week' | 'all';
  const view     = (sp.view     ?? 'list')     as 'list' | 'kanban';
  const user = (await getCurrentUser())!;
  const canSeeAssignee = user.role === 'ADMIN' || user.role === 'LEADER';
  const rawGroup = (sp.groupBy ?? 'time') as 'time' | 'type' | 'assignee' | 'workflow';
  const groupBy: 'time' | 'type' | 'assignee' | 'workflow' =
    rawGroup === 'assignee' && !canSeeAssignee ? 'time' : rawGroup;

  const baseFilter = await getTaskFilter(user);

  // status filter — "pending" = ค้างอยู่ (PENDING + IN_PROGRESS + WAITING_REPLY)
  const statusFilter =
    status === 'pending' ? { status: { in: ['PENDING' as const, 'IN_PROGRESS' as const, 'WAITING_REPLY' as const] } } :
    status === 'done'    ? { status: { in: ['DONE' as const, 'SKIPPED' as const] } } :
    {};

  // scope filter (override permission filter when "ของฉัน")
  const scopeFilter = scope === 'me' ? { assignedToId: user.id } : {};

  // range filter (เฉพาะตอน status=pending)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

  // kanban shows time-buckets เอง — ignore range filter
  const rangeFilter = (status === 'pending' && view === 'list')
    ? range === 'today'   ? { dueDate: { gte: today, lt: tomorrow } }
    : range === 'overdue' ? { dueDate: { lt: today } }
    : range === 'week'    ? { dueDate: { gte: today, lt: weekEnd } }
    : {}
    : {};

  // Kanban needs broader window. Active = PENDING/IN_PROGRESS/WAITING_REPLY.
  // - time mode: active ≤ 7 days + done last 14 days (bucket by due date)
  // - workflow mode: all active (no dueDate cap) + recent done
  // - type/assignee: active (≤ 7 days for size cap) + recent done
  let kanbanWhere: object = {};
  if (view === 'kanban') {
    const sevenDays = new Date(today); sevenDays.setDate(sevenDays.getDate() + 8);
    const fourteenDaysAgo = new Date(today); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const activeStatuses = ['PENDING', 'IN_PROGRESS', 'WAITING_REPLY'] as const;
    const activeFilter = groupBy === 'workflow'
      ? { status: { in: activeStatuses } }
      : { status: { in: activeStatuses }, dueDate: { lt: sevenDays } };
    kanbanWhere = {
      OR: [
        activeFilter,
        { status: { in: ['DONE', 'SKIPPED'] }, completedAt: { gte: fourteenDaysAgo } },
      ],
    };
  }

  const tasks = await prisma.customerTask.findMany({
    where: view === 'kanban'
      ? { AND: [baseFilter, scopeFilter, kanbanWhere] }
      : { AND: [baseFilter, scopeFilter, statusFilter, rangeFilter] },
    orderBy: status === 'pending' ? [{ dueDate: 'asc' }] : [{ completedAt: 'desc' }],
    include: {
      assignedTo: { select: { id: true, fullName: true } },
    },
    take: view === 'kanban' ? 400 : 200,
  });

  // ดึงชื่อลูกค้าจาก order ล่าสุด — distinct on phone ให้ DB คืน 1 row ต่อเบอร์
  const phones = Array.from(new Set(tasks.map(t => t.customerPhone)));
  const orders = phones.length ? await prisma.sheetOrder.findMany({
    where: { phone: { in: phones } },
    orderBy: [{ phone: 'asc' }, { createdAt: 'desc' }],
    distinct: ['phone'],
    select: { phone: true, customerName: true },
  }) : [];
  const nameMap = new Map<string, string>();
  for (const o of orders) {
    if (o.phone && o.customerName) nameMap.set(o.phone, o.customerName);
  }

  // counters สำหรับ summary — รันขนาน
  const activeStatuses = ['PENDING' as const, 'IN_PROGRESS' as const, 'WAITING_REPLY' as const];
  const [allMyPending, todayCount, overdueCount] = await Promise.all([
    prisma.customerTask.count({
      where: { AND: [baseFilter, { status: { in: activeStatuses } }] },
    }),
    prisma.customerTask.count({
      where: { AND: [baseFilter, { status: { in: activeStatuses }, dueDate: { gte: today, lt: tomorrow } }] },
    }),
    prisma.customerTask.count({
      where: { AND: [baseFilter, { status: { in: activeStatuses }, dueDate: { lt: today } }] },
    }),
  ]);

  // Suggestions โชว์เมื่อดูงาน "ค้างอยู่" — แต่ไม่โชว์ให้ ADMIN (ADMIN supervise ไม่ใช่ทำงานตามรายลูกค้า)
  const showSuggestions =
    user.role !== 'ADMIN' &&
    status === 'pending' &&
    (view === 'list' || (view === 'kanban' && groupBy === 'time'));
  const suggestions = showSuggestions ? await getTaskSuggestions(user) : [];

  const teamLabel =
    user.role === 'ADMIN' ? 'ทั้งระบบ' :
    user.role === 'LEADER' ? `ทีม ${user.team?.name ?? ''}` :
    'ของฉัน';

  return (
    <>
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">
            <i className="ri-task-line text-primary"></i> งานทั้งหมด
          </h1>
          <p className="text-sm text-muted mt-1">
            {teamLabel} · ค้างทั้งหมด {allMyPending} งาน
          </p>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          <i className="ri-calendar-line text-blue"></i>{' '}
          {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="tasks-summary-pills">
        <SummaryPill label="วันนี้" count={todayCount} color="var(--orange)" bg="var(--orange-light)" />
        <SummaryPill label="เลยกำหนด" count={overdueCount} color="var(--danger)" bg="var(--danger-light)" />
        <SummaryPill label="ค้างทั้งหมด" count={allMyPending} color="var(--primary)" bg="var(--blue-light)" />
      </div>

      <TasksFilterClient scope={scope} status={status} range={range} view={view} groupBy={groupBy} canSeeAssignee={canSeeAssignee} />

      {(() => {
        const taskList = tasks.map(t => ({
          id: t.id,
          title: t.title,
          note: t.note,
          dueDate: t.dueDate.toISOString(),
          type: t.type,
          status: t.status,
          priority: t.priority,
          customerPhone: t.customerPhone,
          customerName: nameMap.get(t.customerPhone) ?? null,
          assignedToId: t.assignedTo?.id ?? null,
          assignedToName: t.assignedTo?.fullName ?? null,
          resultNote: t.resultNote,
        }));

        if (view === 'kanban') {
          return (
            <>
              {showSuggestions && <TaskSuggestionsSection suggestions={suggestions} />}
              <TasksKanban tasks={taskList} groupBy={groupBy} />
            </>
          );
        }

        if (tasks.length === 0 && suggestions.length === 0) {
          return (
            <EmptyState
              icon="ri-checkbox-circle-line"
              variant="success"
              title={status === 'pending' ? 'เคลียร์งานหมดแล้ว!' : 'ไม่มีงานในเงื่อนไขนี้'}
              description={status === 'pending'
                ? 'ไม่มีงานค้างในเงื่อนไขที่เลือก ลองเปลี่ยน filter หรือสร้างงานใหม่จากหน้าโปรไฟล์ลูกค้า'
                : 'ลองเปลี่ยนเงื่อนไขด้านบนเพื่อดูงานอื่น'}
              action={{ label: 'ดูลูกค้าทั้งหมด', href: '/customers', icon: 'ri-group-2-line' }}
            />
          );
        }

        return (
          <>
            {showSuggestions && <TaskSuggestionsSection suggestions={suggestions} />}
            <TasksList tasks={taskList} />
          </>
        );
      })()}
    </>
  );
}

function SummaryPill({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      background: bg, color, borderRadius: 20, padding: '0.4rem 1rem',
      fontSize: 13, fontWeight: 600,
    }}>
      <span>{label}</span>
      <span style={{
        background: color, color: '#fff', borderRadius: 20,
        minWidth: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, padding: '0 6px',
      }}>{count}</span>
    </div>
  );
}

