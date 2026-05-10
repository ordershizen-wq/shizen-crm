'use client';

import { useState } from 'react';
import TaskDrawer, { type DrawerTask } from './TaskDrawer';

const TYPE_LABEL: Record<string, { label: string; icon: string; color: string }> = {
  FOLLOW_UP:  { label: 'ตามอาการ',     icon: 'ri-stethoscope-line', color: '#0ea5e9' },
  CALL:       { label: 'โทรหา',          icon: 'ri-phone-line',        color: '#10b981' },
  REPEAT_BUY: { label: 'เตือนซื้อซ้ำ',    icon: 'ri-repeat-line',        color: '#f59e0b' },
  DELIVERY:   { label: 'ตามของ',         icon: 'ri-truck-line',         color: '#8b5cf6' },
  CUSTOM:     { label: 'อื่นๆ',           icon: 'ri-bookmark-line',      color: '#64748b' },
};

const PRIORITY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  HIGH:   { label: 'ด่วน',     color: 'var(--danger)',  bg: 'var(--danger-light)' },
  NORMAL: { label: 'ปกติ',     color: 'var(--primary)', bg: 'var(--blue-light)'   },
  LOW:    { label: 'ไม่เร่ง',  color: '#64748b',         bg: '#f1f5f9'             },
};

function dueLabel(due: Date, status: string): { text: string; color: string } {
  if (status === 'DONE' || status === 'SKIPPED') return { text: due.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }), color: 'var(--text-muted)' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(due); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: `เลย ${-diff} วัน`, color: 'var(--danger)' };
  if (diff === 0) return { text: 'วันนี้', color: 'var(--orange)' };
  if (diff === 1) return { text: 'พรุ่งนี้', color: 'var(--orange)' };
  return { text: `อีก ${diff} วัน · ${due.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`, color: 'var(--text-dark)' };
}

export default function TasksList({ tasks }: { tasks: DrawerTask[] }) {
  const [selected, setSelected] = useState<DrawerTask | null>(null);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {tasks.map(t => {
          const ti = TYPE_LABEL[t.type] ?? TYPE_LABEL.CUSTOM;
          const pi = PRIORITY_LABEL[t.priority];
          const due = dueLabel(new Date(t.dueDate), t.status);
          const isPending = t.status !== 'DONE' && t.status !== 'SKIPPED';
          return (
            <div
              key={t.id}
              onClick={() => setSelected(t)}
              className="card p-3 task-row"
              style={{
                cursor: 'pointer',
                borderLeft: `3px solid ${ti.color}`,
                opacity: isPending ? 1 : 0.65,
              }}
            >
              <div className="flex-between" style={{ gap: '0.6rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fw-600" style={{ fontSize: 14, color: 'var(--text-dark)' }}>
                    {t.status === 'DONE' && <i className="ri-checkbox-circle-fill" style={{ color: 'var(--success)' }}></i>}
                    {t.status === 'SKIPPED' && <i className="ri-skip-forward-line" style={{ color: '#64748b' }}></i>}
                    {t.status === 'IN_PROGRESS' && <i className="ri-loader-4-line" style={{ color: '#b45309' }}></i>}
                    {t.status === 'WAITING_REPLY' && <i className="ri-chat-3-line" style={{ color: '#6d28d9' }}></i>}
                    {' '}{t.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    <i className="ri-user-line"></i> {t.customerName ?? t.customerPhone}
                    <span style={{ marginLeft: 6 }}>· {t.customerPhone}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: 6, fontSize: 11 }}>
                    <span style={{ color: ti.color, fontWeight: 600 }}>
                      <i className={ti.icon}></i> {ti.label}
                    </span>
                    {isPending && (
                      <span style={{ background: pi.bg, color: pi.color, padding: '0.1rem 0.5rem', borderRadius: 10, fontWeight: 600 }}>
                        {pi.label}
                      </span>
                    )}
                    <span style={{ color: due.color, fontWeight: 600 }}>
                      <i className="ri-calendar-line"></i> {due.text}
                    </span>
                    {t.assignedToName && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        <i className="ri-user-3-line"></i> {t.assignedToName}
                      </span>
                    )}
                  </div>
                  {t.note && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dark)', lineHeight: 1.5 }}>
                      {t.note}
                    </p>
                  )}
                </div>
                <i className="ri-arrow-right-s-line" style={{ color: 'var(--text-muted)', fontSize: 20 }}></i>
              </div>
            </div>
          );
        })}
      </div>

      <TaskDrawer task={selected} onClose={() => setSelected(null)} />
    </>
  );
}
