import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTaskFilter, getTaskSuggestions } from '@/lib/tasks';
import { getCalendarEvents } from '@/lib/calendarEvents';
import { getReorderQueue } from '@/lib/reorderQueue';
import EmptyState from '@/components/EmptyState';
import TasksFilterClient from './TasksFilterClient';
import TasksList from './TasksList';
import TasksKanban from './TasksKanban';
import TaskSuggestionsSection from './TaskSuggestionsSection';
import TaskFocusHero, { type FocusTask } from './TaskFocusHero';
import CalendarView from './CalendarView';
import ReorderList from './ReorderList';
import KindTabs from './KindTabs';

type Props = { searchParams: Promise<{ kind?: string; scope?: string; status?: string; range?: string; view?: string; groupBy?: string }> };

export default async function TasksPage({ searchParams }: Props) {
  const sp = await searchParams;
  const kind     = (sp.kind     ?? 'care')     as 'care' | 'reorder';
  const scope    = (sp.scope    ?? 'all')      as 'all' | 'me';
  const status   = (sp.status   ?? 'pending')  as 'pending' | 'done' | 'all';
  const range    = (sp.range    ?? 'all')      as 'today' | 'overdue' | 'week' | 'all';
  const view     = (sp.view     ?? 'list')     as 'list' | 'kanban' | 'calendar';
  const user = (await getCurrentUser())!;

  const baseFilter = await getTaskFilter(user);
  const activeStatuses = ['PENDING' as const, 'IN_PROGRESS' as const, 'WAITING_REPLY' as const];

  // นับ badge ของแต่ละ kind — ใช้กับ KindTabs
  const [careCount, reorderQueueForCount] = await Promise.all([
    prisma.customerTask.count({
      where: { AND: [baseFilter, { status: { in: activeStatuses } }] },
    }),
    // คำนวณคิวรีออเดอร์ครั้งเดียว ใช้ทั้ง badge และ render
    kind === 'reorder' ? getReorderQueue(user) : null,
  ]);

  // ถ้ายังไม่ได้คำนวณ reorder queue (อยู่ tab care) → นับเฉพาะตอนแสดงผล
  const reorderQueue = kind === 'reorder'
    ? reorderQueueForCount!
    : await getReorderQueue(user);
  const reorderCount = reorderQueue.length;

  const teamLabel =
    user.role === 'ADMIN' ? 'ทั้งระบบ' :
    user.role === 'LEADER' ? `ทีม ${user.team?.name ?? ''}` :
    'ของฉัน';

  const pageHeader = (
    <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
      <div>
        <h1 className="page-title">
          <i className="ri-task-line text-primary"></i> งานทั้งหมด
        </h1>
        <p className="text-sm text-muted mt-1">
          {teamLabel} · {kind === 'reorder' ? `รีออเดอร์ ${reorderCount} คน` : `ดูแลลูกค้า ${careCount} งาน`}
        </p>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        <i className="ri-calendar-line text-blue"></i>{' '}
        {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );

  const kindTabs = <KindTabs kind={kind} careCount={careCount} reorderCount={reorderCount} />;

  // ═══════════════════════════════════════════════════════════
  // TAB: ตามรีออเดอร์ — virtual list, ไม่ใช้ filter/view เดิม
  // ═══════════════════════════════════════════════════════════
  if (kind === 'reorder') {
    return (
      <div className="tasks-page">
        {pageHeader}
        {kindTabs}
        <ReorderList items={reorderQueue} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // TAB: ดูแลลูกค้า — flow เดิม (list/kanban/calendar)
  // ═══════════════════════════════════════════════════════════

  // Calendar view — โหลด events อย่างเดียว
  if (view === 'calendar') {
    const events = await getCalendarEvents(user);
    return (
      <div className="tasks-page">
        {pageHeader}
        {kindTabs}
        <TasksFilterClient scope={scope} status={status} range={range} view={view} groupBy={'time'} canSeeAssignee={user.role === 'ADMIN' || user.role === 'LEADER'} />
        <CalendarView
          events={events}
          initialYear={new Date().getFullYear()}
          initialMonth={new Date().getMonth()}
          userName={user.fullName}
        />
      </div>
    );
  }

  const canSeeAssignee = user.role === 'ADMIN' || user.role === 'LEADER';
  const rawGroup = (sp.groupBy ?? 'time') as 'time' | 'type' | 'assignee' | 'workflow';
  const groupBy: 'time' | 'type' | 'assignee' | 'workflow' =
    rawGroup === 'assignee' && !canSeeAssignee ? 'time' : rawGroup;

  const statusFilter =
    status === 'pending' ? { status: { in: activeStatuses } } :
    status === 'done'    ? { status: { in: ['DONE' as const, 'SKIPPED' as const] } } :
    {};

  const scopeFilter = scope === 'me' ? { assignedToId: user.id } : {};

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

  const rangeFilter = (status === 'pending' && view === 'list')
    ? range === 'today'   ? { dueDate: { gte: today, lt: tomorrow } }
    : range === 'overdue' ? { dueDate: { lt: today } }
    : range === 'week'    ? { dueDate: { gte: today, lt: weekEnd } }
    : {}
    : {};

  let kanbanWhere: object = {};
  if (view === 'kanban') {
    const sevenDays = new Date(today); sevenDays.setDate(sevenDays.getDate() + 8);
    const fourteenDaysAgo = new Date(today); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
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

  const phones = Array.from(new Set(tasks.map(t => t.customerPhone)));
  // ออเดอร์ล่าสุดต่อเบอร์ (distinct + order by createdAt desc) → ชื่อ + บริบทลูกค้า
  const orders = phones.length ? await prisma.sheetOrder.findMany({
    where: { phone: { in: phones } },
    orderBy: [{ phone: 'asc' }, { createdAt: 'desc' }],
    distinct: ['phone'],
    select: { phone: true, customerName: true, totalPrice: true, productsJson: true },
  }) : [];
  // คุยล่าสุดต่อเบอร์ จาก CrmFollowUp
  const lastContacts = phones.length ? await prisma.crmFollowUp.groupBy({
    by: ['customerPhone'],
    where: { customerPhone: { in: phones } },
    _max: { createdAt: true },
  }) : [];
  const contactMap = new Map<string, Date>();
  for (const c of lastContacts) {
    if (c._max.createdAt) contactMap.set(c.customerPhone, c._max.createdAt);
  }

  const fmtBaht = (n: number) => `฿${n.toLocaleString('th-TH')}`;
  const daysAgoText = (d: Date | undefined): string => {
    if (!d) return '—';
    const diff = Math.floor((today.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
    if (diff <= 0) return 'วันนี้';
    if (diff === 1) return 'เมื่อวาน';
    return `${diff} วันก่อน`;
  };

  type TaskContext = { lastOrderText: string; currentSet: string; lastContactText: string };
  const nameMap = new Map<string, string>();
  const contextMap = new Map<string, TaskContext>();
  for (const o of orders) {
    if (!o.phone) continue;
    if (o.customerName) nameMap.set(o.phone, o.customerName);
    const products = Array.isArray(o.productsJson) ? (o.productsJson as { name?: string }[]) : [];
    contextMap.set(o.phone, {
      lastOrderText: o.totalPrice != null ? fmtBaht(Number(o.totalPrice)) : '—',
      currentSet: products[0]?.name?.trim() || '—',
      lastContactText: daysAgoText(contactMap.get(o.phone)),
    });
  }

  const [todayCount, overdueCount, weekCount, doneTodayCount] = await Promise.all([
    prisma.customerTask.count({
      where: { AND: [baseFilter, { status: { in: activeStatuses }, dueDate: { gte: today, lt: tomorrow } }] },
    }),
    prisma.customerTask.count({
      where: { AND: [baseFilter, { status: { in: activeStatuses }, dueDate: { lt: today } }] },
    }),
    prisma.customerTask.count({
      where: { AND: [baseFilter, { status: { in: activeStatuses }, dueDate: { gte: today, lt: weekEnd } }] },
    }),
    // ทำเสร็จแล้ววันนี้ — ใช้กับแถบความคืบหน้า
    prisma.customerTask.count({
      where: { AND: [baseFilter, { status: { in: ['DONE' as const, 'SKIPPED' as const] }, completedAt: { gte: today, lt: tomorrow } }] },
    }),
  ]);

  // pills สรุป = ตัวกรองช่วงเวลา (กดได้เฉพาะ list + ค้างอยู่)
  const rangeActive = status === 'pending' && view === 'list';
  const buildRangeHref = (r: 'all' | 'today' | 'overdue' | 'week') => {
    const p = new URLSearchParams();
    if (scope !== 'all') p.set('scope', scope);
    if (status !== 'pending') p.set('status', status);
    if (view !== 'list') p.set('view', view);
    if (r !== 'all') p.set('range', r);
    return `/tasks${p.toString() ? `?${p.toString()}` : ''}`;
  };

  // จุดโฟกัส "ทำต่อไป" = งานค้างที่ด่วนสุด (due เก่าสุด)
  const nextTaskRaw = await prisma.customerTask.findFirst({
    where: { AND: [baseFilter, { status: { in: activeStatuses } }] },
    orderBy: [{ dueDate: 'asc' }],
    select: { id: true, title: true, dueDate: true, customerPhone: true },
  });
  let focusTask: FocusTask | null = null;
  if (nextTaskRaw) {
    const dueDay = new Date(nextTaskRaw.dueDate); dueDay.setHours(0, 0, 0, 0);
    const overdue = dueDay.getTime() < today.getTime();
    const daysOverdue = overdue ? Math.floor((today.getTime() - dueDay.getTime()) / 86400000) : 0;
    const isToday = dueDay.getTime() === today.getTime();
    focusTask = {
      id: nextTaskRaw.id,
      title: nextTaskRaw.title,
      customerName: nameMap.get(nextTaskRaw.customerPhone) ?? nextTaskRaw.customerPhone,
      customerPhone: nextTaskRaw.customerPhone,
      overdue,
      daysOverdue,
      dueText: isToday ? 'กำหนดวันนี้' : `กำหนด ${nextTaskRaw.dueDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`,
    };
  }

  const showSuggestions =
    user.role !== 'ADMIN' &&
    status === 'pending' &&
    (view === 'list' || (view === 'kanban' && groupBy === 'time'));
  const suggestions = showSuggestions ? await getTaskSuggestions(user) : [];

  const progressTotal = doneTodayCount + careCount;

  return (
    <div className="tasks-page">
      {pageHeader}
      {kindTabs}

      {focusTask && <TaskFocusHero task={focusTask} remaining={Math.max(0, careCount - 1)} />}

      <div className="t2-chips">
        <SummaryPill label="ค้างทั้งหมด" count={careCount} dot={null}
          href={rangeActive ? buildRangeHref('all') : undefined} active={rangeActive && range === 'all'} />
        <SummaryPill label="วันนี้" count={todayCount} dot="var(--orange)"
          href={rangeActive ? buildRangeHref('today') : undefined} active={rangeActive && range === 'today'} />
        <SummaryPill label="เลยกำหนด" count={overdueCount} dot="var(--danger)"
          href={rangeActive ? buildRangeHref('overdue') : undefined} active={rangeActive && range === 'overdue'} />
        <SummaryPill label="ใน 7 วัน" count={weekCount} dot="var(--success)"
          href={rangeActive ? buildRangeHref('week') : undefined} active={rangeActive && range === 'week'} />
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
          lastOrderText: contextMap.get(t.customerPhone)?.lastOrderText ?? '—',
          currentSet: contextMap.get(t.customerPhone)?.currentSet ?? '—',
          lastContactText: contextMap.get(t.customerPhone)?.lastContactText ?? '—',
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
            <TasksList tasks={taskList} doneToday={doneTodayCount} total={progressTotal} />
          </>
        );
      })()}
    </div>
  );
}

function SummaryPill({ label, count, dot, href, active }: {
  label: string; count: number; dot: string | null;
  href?: string; active?: boolean;
}) {
  const inner = (
    <>
      {dot && <span className="dot" style={{ background: dot }}></span>}
      <span className="n tnum">{count}</span> {label}
    </>
  );
  const cls = `t2-chip${active ? ' active' : ''}`;
  if (href) {
    return <Link href={href} className={cls}>{inner}</Link>;
  }
  return <span className={cls}>{inner}</span>;
}
