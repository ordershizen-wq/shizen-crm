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
    <section className={`t2-upnext${task.overdue ? ' is-overdue' : ''}`} aria-busy={pending}>
      <span className="t2-upnext-flag"><i className="ri-focus-3-line"></i> ทำต่อไป</span>

      <div className="t2-upnext-body">
        <Link href={`/customers/${task.customerPhone}`} className="t2-upnext-title">{task.title}</Link>
        <div className="t2-upnext-meta">
          {task.customerName}
          <span style={{ margin: '0 4px', color: 'var(--text-light)' }}>·</span>
          {task.overdue
            ? <span className="od"><i className="ri-alarm-warning-line"></i> เลยกำหนด {task.daysOverdue} วัน</span>
            : <span>{task.dueText}</span>}
          {remaining > 0 && <span style={{ marginLeft: 8, color: 'var(--text-light)' }}>· เหลืออีก {remaining} งาน</span>}
        </div>
      </div>

      <div className="t2-upnext-actions">
        {callable && (
          <a href={`tel:${task.customerPhone}`} className="t2-un-btn call"><i className="ri-phone-line"></i> โทร</a>
        )}
        <button type="button" className="t2-un-btn done" disabled={pending}
          onClick={() => run(() => completeTask({ taskId: task.id }))}>
          <i className="ri-checkbox-circle-line"></i> เสร็จ
        </button>
        <button type="button" className="t2-un-btn skip" disabled={pending}
          onClick={() => run(() => skipTask({ taskId: task.id }))}>
          <i className="ri-skip-forward-line"></i> ข้าม
        </button>
      </div>
    </section>
  );
}
