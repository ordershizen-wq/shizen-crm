'use client';

import { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TaskDrawer, { type DrawerTask } from './TaskDrawer';
import { updateTask, completeTask } from './actions';

type GroupBy = 'time' | 'type' | 'assignee' | 'workflow';

const TYPE_LABEL: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  FOLLOW_UP:  { label: 'ตามอาการ',     icon: 'ri-stethoscope-line',  color: '#0ea5e9', bg: '#e0f2fe' },
  CALL:       { label: 'โทรหา',          icon: 'ri-phone-line',         color: '#10b981', bg: '#d1fae5' },
  REPEAT_BUY: { label: 'เตือนซื้อซ้ำ',    icon: 'ri-repeat-line',         color: '#f59e0b', bg: '#fef3c7' },
  DELIVERY:   { label: 'ตามของ',         icon: 'ri-truck-line',          color: '#8b5cf6', bg: '#ede9fe' },
  CUSTOM:     { label: 'อื่นๆ',           icon: 'ri-bookmark-line',       color: '#64748b', bg: '#f1f5f9' },
};

const PRIORITY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  HIGH:   { label: 'ด่วน',     color: 'var(--danger)',  bg: 'var(--danger-light)' },
  NORMAL: { label: 'ปกติ',     color: 'var(--primary)', bg: 'var(--blue-light)'   },
  LOW:    { label: 'ไม่เร่ง',  color: '#64748b',         bg: '#f1f5f9'             },
};

type Column = {
  id: string;
  title: string;
  icon: string;
  color: string;
  bg: string;
};

const TIME_COLUMNS: Column[] = [
  { id: 'overdue', title: 'เลยกำหนด',    icon: 'ri-alarm-warning-line',   color: '#ef4444', bg: '#fee2e2' },
  { id: 'today',   title: 'วันนี้',         icon: 'ri-flashlight-line',       color: '#f97316', bg: '#ffedd5' },
  { id: 'three',   title: '3 วันนี้',        icon: 'ri-calendar-event-line',   color: '#0ea5e9', bg: '#e0f2fe' },
  { id: 'week',    title: 'สัปดาห์นี้',     icon: 'ri-calendar-line',         color: '#6b7f76', bg: '#eeeeee' },
  { id: 'done',    title: 'เสร็จแล้ว',      icon: 'ri-checkbox-circle-line',  color: '#2FA084', bg: '#E6F4EE' },
];

const TYPE_COLUMN_ORDER = ['FOLLOW_UP', 'CALL', 'REPEAT_BUY', 'DELIVERY', 'CUSTOM'] as const;

const WORKFLOW_COLUMNS: Column[] = [
  { id: 'PENDING',       title: 'รอทำ',          icon: 'ri-inbox-line',           color: '#64748b', bg: '#f1f5f9' },
  { id: 'IN_PROGRESS',   title: 'กำลังติดตาม',    icon: 'ri-loader-4-line',         color: '#b45309', bg: '#fef3c7' },
  { id: 'WAITING_REPLY', title: 'รอลูกค้าตอบ',    icon: 'ri-chat-3-line',           color: '#6d28d9', bg: '#ede9fe' },
  { id: 'DONE',          title: 'เสร็จแล้ว',      icon: 'ri-checkbox-circle-line',  color: '#2FA084', bg: '#E6F4EE' },
];

const TYPE_COLUMNS: Column[] = TYPE_COLUMN_ORDER.map(t => ({
  id: t,
  title: TYPE_LABEL[t].label,
  icon: TYPE_LABEL[t].icon,
  color: TYPE_LABEL[t].color,
  bg: TYPE_LABEL[t].bg,
}));

function timeBucket(t: DrawerTask): string | null {
  if (t.status === 'DONE' || t.status === 'SKIPPED') return 'done';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 3) return 'three';
  if (diff <= 7) return 'week';
  return null;
}

function dateForTimeColumn(col: string): string {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  switch (col) {
    case 'overdue': d.setDate(d.getDate() - 1); break;
    case 'today':   break;
    case 'three':   d.setDate(d.getDate() + 2); break;
    case 'week':    d.setDate(d.getDate() + 5); break;
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const ASSIGNEE_PALETTE = [
  { color: '#0ea5e9', bg: '#e0f2fe' },
  { color: '#10b981', bg: '#d1fae5' },
  { color: '#f59e0b', bg: '#fef3c7' },
  { color: '#8b5cf6', bg: '#ede9fe' },
  { color: '#ef4444', bg: '#fee2e2' },
  { color: '#06b6d4', bg: '#cffafe' },
  { color: '#84cc16', bg: '#ecfccb' },
  { color: '#ec4899', bg: '#fce7f3' },
];

function buildAssigneeColumns(tasks: DrawerTask[]): Column[] {
  const seen = new Map<string, string>(); // id -> name
  let hasUnassigned = false;
  for (const t of tasks) {
    if (t.assignedToId) {
      if (!seen.has(t.assignedToId)) seen.set(t.assignedToId, t.assignedToName ?? 'ไม่ระบุชื่อ');
    } else {
      hasUnassigned = true;
    }
  }
  const cols: Column[] = Array.from(seen.entries())
    .sort((a, b) => a[1].localeCompare(b[1], 'th'))
    .map(([id, name], i) => {
      const c = ASSIGNEE_PALETTE[i % ASSIGNEE_PALETTE.length];
      return { id, title: name, icon: 'ri-user-3-line', color: c.color, bg: c.bg };
    });
  if (hasUnassigned) {
    cols.push({ id: '__unassigned__', title: 'ยังไม่มีคนรับ', icon: 'ri-user-add-line', color: '#64748b', bg: '#f1f5f9' });
  }
  return cols;
}

function columnIdOf(t: DrawerTask, groupBy: GroupBy): string | null {
  if (groupBy === 'time') return timeBucket(t);
  if (groupBy === 'workflow') {
    if (t.status === 'SKIPPED') return null;
    return t.status;
  }
  const isActive = t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_REPLY';
  if (!isActive) return null;
  if (groupBy === 'type') return t.type;
  if (groupBy === 'assignee') return t.assignedToId ?? '__unassigned__';
  return null;
}

export default function TasksKanban({ tasks, groupBy }: { tasks: DrawerTask[]; groupBy: GroupBy }) {
  const router = useRouter();
  const [selected, setSelected] = useState<DrawerTask | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Map<string, string>>(new Map());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const columns = useMemo<Column[]>(() => {
    if (groupBy === 'time')     return TIME_COLUMNS;
    if (groupBy === 'type')     return TYPE_COLUMNS;
    if (groupBy === 'workflow') return WORKFLOW_COLUMNS;
    return buildAssigneeColumns(tasks);
  }, [groupBy, tasks]);

  const grouped = useMemo(() => {
    const map: Record<string, DrawerTask[]> = {};
    for (const c of columns) map[c.id] = [];
    for (const t of tasks) {
      if (completedIds.has(t.id)) continue; // hide optimistically completed
      const override = optimistic.get(t.id);
      const bucket = override ?? columnIdOf(t, groupBy);
      if (bucket && map[bucket]) map[bucket].push(t);
    }
    const priorityRank = (p: string) => p === 'HIGH' ? 0 : p === 'NORMAL' ? 1 : 2;
    const isDoneCol = (k: string) => k === 'done' || k === 'DONE';
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        if (isDoneCol(k)) return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      if (isDoneCol(k)) map[k] = map[k].slice(0, 30);
    }
    return map;
  }, [tasks, optimistic, completedIds, columns, groupBy]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overCol !== col) setOverCol(col);
  };

  const handleDragLeave = () => setOverCol(null);
  const handleDragEnd = () => { setDraggedId(null); setOverCol(null); };

  const handleDrop = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedId;
    setOverCol(null);
    setDraggedId(null);
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentBucket = optimistic.get(taskId) ?? columnIdOf(task, groupBy);
    if (currentBucket === col) return;

    setOptimistic(prev => new Map(prev).set(taskId, col));

    startTransition(async () => {
      try {
        if (groupBy === 'time') {
          if (col === 'done') {
            await completeTask({ taskId });
          } else {
            await updateTask({ taskId, dueDate: dateForTimeColumn(col) });
          }
        } else if (groupBy === 'type') {
          await updateTask({ taskId, type: col });
        } else if (groupBy === 'assignee') {
          await updateTask({ taskId, assignedToId: col === '__unassigned__' ? null : col });
        } else if (groupBy === 'workflow') {
          if (col === 'DONE') {
            await completeTask({ taskId });
          } else {
            await updateTask({ taskId, status: col });
          }
        }
        router.refresh();
        setTimeout(() => setOptimistic(prev => {
          const n = new Map(prev); n.delete(taskId); return n;
        }), 600);
      } catch {
        setOptimistic(prev => {
          const n = new Map(prev); n.delete(taskId); return n;
        });
      }
    });
  };

  // K2: Quick complete handler — optimistic hide + server action
  const handleQuickComplete = (taskId: string) => {
    setCompletedIds(prev => new Set(prev).add(taskId));
    startTransition(async () => {
      try {
        await completeTask({ taskId });
        router.refresh();
        setTimeout(() => setCompletedIds(prev => {
          const n = new Set(prev); n.delete(taskId); return n;
        }), 800);
      } catch {
        setCompletedIds(prev => {
          const n = new Set(prev); n.delete(taskId); return n;
        });
      }
    });
  };

  // K4: Mobile column indicator (active dot + label)
  const boardRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const [activeColIdx, setActiveColIdx] = useState(0);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onScroll = () => {
      const colWidth = el.scrollWidth / columns.length;
      if (colWidth > 0) {
        const idx = Math.round(el.scrollLeft / colWidth);
        setActiveColIdx(Math.min(Math.max(idx, 0), columns.length - 1));
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [columns.length]);

  useEffect(() => {
    const dots = dotsRef.current;
    if (!dots) return;
    const active = dots.querySelector<HTMLElement>('.kanban-dot.is-active');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeColIdx]);

  if (groupBy === 'assignee' && columns.length === 0) {
    return (
      <div className="card p-4 text-center text-muted">
        ยังไม่มีงานที่จะแสดงในมุมมองนี้
      </div>
    );
  }

  const activeCol = columns[activeColIdx];
  const activeCount = activeCol ? (grouped[activeCol.id]?.length ?? 0) : 0;

  return (
    <>
      {/* K4: Mobile sticky column label */}
      {activeCol && (
        <div className="t2-kanban-cur-label" style={{ '--col-color': activeCol.color } as React.CSSProperties}>
          <span className="t2-kanban-cur-icon" style={{ background: activeCol.bg, color: activeCol.color }}>
            <i className={activeCol.icon}></i>
          </span>
          <span className="t2-kanban-cur-title">{activeCol.title}</span>
          <span className="t2-kanban-cur-count">{activeCount}</span>
        </div>
      )}

      <div
        ref={boardRef}
        className="kanban-board"
        style={{ ['--col-count' as string]: columns.length }}
      >
        {columns.map(col => {
          const items = grouped[col.id] ?? [];
          const isOver = overCol === col.id;
          return (
            <div
              key={col.id}
              className={`kanban-col${isOver ? ' drag-over' : ''}`}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className="kanban-col-header" style={{ borderTopColor: col.color }}>
                <div className="kanban-col-title">
                  <span className="kanban-col-icon" style={{ background: col.bg, color: col.color }}>
                    <i className={col.icon}></i>
                  </span>
                  <span>{col.title}</span>
                </div>
                <span className="kanban-col-count">{items.length}</span>
              </div>

              <div className="kanban-col-body">
                {/* K1: Empty state */}
                {items.length === 0 ? (
                  <div className="t2-kanban-empty">
                    {isOver ? (
                      <>
                        <i className="ri-drag-drop-line"></i>
                        <span>วางที่นี่</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-inbox-2-line"></i>
                        <span>ไม่มีงานในกลุ่มนี้</span>
                      </>
                    )}
                  </div>
                ) : (
                  items.map(t => (
                    <KanbanCard
                      key={t.id}
                      task={t}
                      groupBy={groupBy}
                      dragging={draggedId === t.id}
                      onClick={() => setSelected(t)}
                      onDragStart={e => handleDragStart(e, t.id)}
                      onDragEnd={handleDragEnd}
                      onComplete={handleQuickComplete}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile-only column indicator dots */}
      <div ref={dotsRef} className="kanban-dots" role="tablist" aria-label="คอลัมน์ kanban">
        {columns.map((col, i) => (
          <button
            key={col.id}
            type="button"
            role="tab"
            aria-selected={i === activeColIdx}
            aria-label={`ไปยัง ${col.title}`}
            className={`kanban-dot${i === activeColIdx ? ' is-active' : ''}`}
            onClick={() => {
              const el = boardRef.current;
              if (!el) return;
              const colWidth = el.scrollWidth / columns.length;
              el.scrollTo({ left: colWidth * i, behavior: 'smooth' });
            }}
          >
            <span className="kanban-dot-inner" style={i === activeColIdx ? { background: col.color } : undefined}></span>
            <span className="kanban-dot-label">{col.title}</span>
          </button>
        ))}
      </div>

      <TaskDrawer task={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function KanbanCard({
  task, groupBy, dragging, onClick, onDragStart, onDragEnd, onComplete,
}: {
  task: DrawerTask;
  groupBy: GroupBy;
  dragging: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onComplete: (taskId: string) => void;
}) {
  const ti = TYPE_LABEL[task.type] ?? TYPE_LABEL.CUSTOM;
  const pi = PRIORITY_LABEL[task.priority];
  const isClosed = task.status === 'DONE' || task.status === 'SKIPPED';

  const due = new Date(task.dueDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dDay = new Date(due); dDay.setHours(0, 0, 0, 0);
  const diff = Math.round((dDay.getTime() - today.getTime()) / 86400000);
  const dueText = isClosed
    ? due.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    : diff < 0  ? `เลย ${-diff} วัน`
    : diff === 0 ? 'วันนี้'
    : diff === 1 ? 'พรุ่งนี้'
    : `อีก ${diff} วัน`;

  // K3: priority overrides type color on left border
  const borderColor = task.priority === 'HIGH' ? '#ef4444' : ti.color;

  return (
    <div
      draggable={!isClosed}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`kanban-card t2-bcard${dragging ? ' dragging' : ''}${isClosed ? ' done' : ''}${task.priority === 'HIGH' ? ' high-priority' : ''}`}
      style={{ borderLeftColor: borderColor }}
      data-priority={task.priority}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <div className="kanban-card-head">
        {groupBy !== 'type' ? (
          <span className="kanban-card-type" style={{ color: ti.color }}>
            <i className={ti.icon}></i> {ti.label}
          </span>
        ) : <span />}
        {!isClosed && (
          <span className="kanban-card-priority" style={{ background: pi.bg, color: pi.color }}>
            {pi.label}
          </span>
        )}
      </div>

      <div className="kanban-card-title">
        {task.status === 'DONE' && <i className="ri-checkbox-circle-fill" style={{ color: 'var(--success)', marginRight: 4 }}></i>}
        {task.status === 'SKIPPED' && <i className="ri-skip-forward-line" style={{ color: '#64748b', marginRight: 4 }}></i>}
        {groupBy !== 'workflow' && task.status === 'IN_PROGRESS' && <i className="ri-loader-4-line" style={{ color: '#b45309', marginRight: 4 }}></i>}
        {groupBy !== 'workflow' && task.status === 'WAITING_REPLY' && <i className="ri-chat-3-line" style={{ color: '#6d28d9', marginRight: 4 }}></i>}
        {task.title}
      </div>

      <div className="kanban-card-meta">
        <span>
          <i className="ri-user-line"></i> {task.customerName ?? task.customerPhone}
        </span>
      </div>

      <div className="kanban-card-foot">
        <span className="kanban-card-due">
          <i className="ri-calendar-line"></i> {dueText}
        </span>
        {groupBy !== 'assignee' && task.assignedToName && (
          <span className="kanban-card-assignee" title={task.assignedToName}>
            {task.assignedToName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        )}
        {/* K2: inside foot so mobile (hover:none) flows naturally in the row */}
        {!isClosed && (
          <div className="t2-kcard-quick" onClick={e => { e.stopPropagation(); onComplete(task.id); }}>
            <button
              type="button"
              title="ทำเสร็จแล้ว"
              aria-label="ทำเสร็จแล้ว"
              tabIndex={-1}
            >
              <i className="ri-check-line"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
