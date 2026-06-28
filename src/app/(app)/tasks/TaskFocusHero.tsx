'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { completeTask, skipTask } from './actions';

export type FocusTask = {
  id: string;
  title: string;
  customerName: string;
  customerPhone: string;
  overdue: boolean;
  daysOverdue: number;
  dueText: string;
};

export default function TaskFocusHero({ task, remaining }: { task: FocusTask; remaining: number }) {
  const [pending, start] = useTransition();

  const callable = /^[0-9+\-\s]{6,}$/.test(task.customerPhone);

  const run = (fn: () => Promise<void>) => start(() => { void fn(); });

  return (
    <section className={`task-hero${task.overdue ? ' is-overdue' : ''}`} aria-busy={pending}>
      <div className="task-hero-eyebrow">
        <i className="ri-focus-3-line"></i> ทำต่อไป
      </div>

      <Link href={`/customers/${task.customerPhone}`} className="task-hero-title">
        {task.title}
      </Link>

      <div className="task-hero-sub">
        <i className="ri-user-line"></i> {task.customerName}
        <span className="task-hero-dot">·</span>
        {task.overdue ? (
          <span className="task-hero-overdue">
            <i className="ri-alarm-warning-line"></i> เลยกำหนด {task.daysOverdue} วัน
          </span>
        ) : (
          <span>{task.dueText}</span>
        )}
      </div>

      <div className="task-hero-actions">
        {callable && (
          <a href={`tel:${task.customerPhone}`} className="btn task-hero-btn primary">
            <i className="ri-phone-line"></i> โทร
          </a>
        )}
        <button
          type="button"
          className="btn task-hero-btn"
          disabled={pending}
          onClick={() => run(() => completeTask({ taskId: task.id }))}
        >
          <i className="ri-checkbox-circle-line"></i> เสร็จแล้ว
        </button>
        <button
          type="button"
          className="btn task-hero-btn ghost"
          disabled={pending}
          onClick={() => run(() => skipTask({ taskId: task.id }))}
        >
          <i className="ri-skip-forward-line"></i> ข้าม
        </button>
      </div>

      {remaining > 0 && (
        <div className="task-hero-foot">
          เหลืออีก <b>{remaining}</b> งานค้าง
        </div>
      )}
    </section>
  );
}
