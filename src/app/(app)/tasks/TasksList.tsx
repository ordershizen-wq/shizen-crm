'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import TaskDetail, { type TaskItem } from './TaskDetail';
import TaskDrawer from './TaskDrawer';
import { completeTask, updateTask } from './actions';
import { typeInfo, PRIORITY_LABEL, dueLabel, timeBucket, TIME_BUCKET_META, type TimeBucket } from './taskLabels';

const callable = (phone: string) => /^[0-9+\-\s]{6,}$/.test(phone);
const BUCKET_ORDER: TimeBucket[] = ['overdue', 'today', 'week', 'later'];

/** desktop ≥1001px → ใช้ pane, มือถือ → drawer */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1001px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

export default function TasksList({ tasks, doneToday, total }: { tasks: TaskItem[]; doneToday: number; total: number }) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [selectedId, setSelectedId] = useState<string | null>(tasks[0]?.id ?? null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { active, closed } = useMemo(() => {
    const a: TaskItem[] = []; const c: TaskItem[] = [];
    for (const t of tasks) (t.status === 'DONE' || t.status === 'SKIPPED' ? c : a).push(t);
    return { active: a, closed: c };
  }, [tasks]);

  const buckets = useMemo(() => {
    const map: Record<TimeBucket, TaskItem[]> = { overdue: [], today: [], week: [], later: [] };
    for (const t of active) map[timeBucket(new Date(t.dueDate))].push(t);
    return map;
  }, [active]);

  // derive ระหว่าง render — ถ้า id ที่เลือกหายไป (หลังทำเสร็จ) fallback เป็นตัวแรก (ไม่ใช้ effect)
  const selectedTask = tasks.find(t => t.id === selectedId) ?? tasks[0] ?? null;
  const drawerTask = tasks.find(t => t.id === drawerId) ?? null;

  const openTask = (t: TaskItem) => {
    setSelectedId(t.id);
    if (!isDesktop) setDrawerId(t.id);
  };

  const quick = (fn: () => Promise<unknown>) => startTransition(async () => { await fn(); router.refresh(); });

  const renderRow = (t: TaskItem) => {
    const ti = typeInfo(t.type);
    const pi = PRIORITY_LABEL[t.priority];
    const due = dueLabel(new Date(t.dueDate), t.status);
    const isClosed = t.status === 'DONE' || t.status === 'SKIPPED';
    const nextDue = new Date(t.dueDate); nextDue.setDate(nextDue.getDate() + 1);
    return (
      <div
        key={t.id}
        className={`t2-task${selectedTask && t.id === selectedTask.id ? ' sel' : ''}${isClosed ? ' is-closed' : ''}`}
        style={{ '--accent': ti.color } as React.CSSProperties}
        onClick={() => openTask(t)}
      >
        <div className="t2-task-ticon" style={{ background: ti.bg, color: ti.color }}><i className={ti.icon}></i></div>
        <div className="t2-task-main">
          <div className="t2-task-title">{t.title}</div>
          <div className="t2-task-sub"><i className="ri-user-line"></i> {t.customerName ?? t.customerPhone} · {t.customerPhone}</div>
        </div>
        <div className="t2-task-right">
          {!isClosed && <span className="t2-pri" style={{ background: pi.bg, color: pi.color }}>{pi.label}</span>}
          <span className={`t2-due ${due.cls}`}>{due.text}</span>
        </div>
        {!isClosed && (
          <div className="t2-task-quick" onClick={e => e.stopPropagation()}>
            {callable(t.customerPhone) && (
              <a className="t2-qbtn call" href={`tel:${t.customerPhone}`} title="โทร"><i className="ri-phone-line"></i></a>
            )}
            <button className="t2-qbtn snooze" title="เลื่อนไป 1 วัน" disabled={isPending}
              onClick={() => quick(() => updateTask({ taskId: t.id, dueDate: nextDue.toISOString() }))}>
              <i className="ri-time-line"></i>
            </button>
            <button className="t2-qbtn done" title="เสร็จ" disabled={isPending}
              onClick={() => quick(() => completeTask({ taskId: t.id }))}>
              <i className="ri-check-line"></i>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="t2-split">
      {/* Queue (master) */}
      <div className="t2-queue">
        <div className="t2-queue-head">
          <span className="t">คิวงาน · {tasks.length} รายการ</span>
          {total > 0 && (
            <span className="t2-progress-mini">
              วันนี้ {doneToday}/{total}
              <span className="t2-progress-track"><span className="t2-progress-fill" style={{ width: `${Math.round((doneToday / total) * 100)}%` }} /></span>
            </span>
          )}
        </div>
        <div className="t2-queue-list">
          {BUCKET_ORDER.map(b => buckets[b].length > 0 && (
            <div key={b}>
              <div className="t2-qsection">
                <span className="qs-dot" style={{ background: TIME_BUCKET_META[b].dot }}></span>
                {TIME_BUCKET_META[b].label}
                <span className="qs-n">{buckets[b].length}</span>
              </div>
              {buckets[b].map(renderRow)}
            </div>
          ))}
          {closed.length > 0 && closed.map(renderRow)}
        </div>
      </div>

      {/* Detail pane (desktop) */}
      {isDesktop && selectedTask && (
        <div className="t2-detail as-pane">
          <TaskDetail key={selectedTask.id} task={selectedTask} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {/* Drawer (mobile) */}
      <TaskDrawer key={drawerTask?.id ?? 'none'} task={drawerTask} onClose={() => setDrawerId(null)} />
    </div>
  );
}
