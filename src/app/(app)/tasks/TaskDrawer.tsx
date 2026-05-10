'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { completeTask, skipTask, reopenTask, deleteTask, updateTask } from './actions';

export type DrawerTask = {
  id: string;
  title: string;
  note: string | null;
  dueDate: string;            // ISO
  type: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'WAITING_REPLY' | 'DONE' | 'SKIPPED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  customerPhone: string;
  customerName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  resultNote: string | null;
};

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

export default function TaskDrawer({
  task, onClose,
}: {
  task: DrawerTask | null;
  onClose: () => void;
}) {
  const [resultNote, setResultNote] = useState('');
  const [isPending, startTransition] = useTransition();

  // Reset note when task changes
  useEffect(() => { setResultNote(''); }, [task?.id]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (task) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [task, onClose]);

  if (!task) return null;

  const typeInfo = TYPE_LABEL[task.type] ?? TYPE_LABEL.CUSTOM;
  const priInfo = PRIORITY_LABEL[task.priority];
  const isActive = task.status !== 'DONE' && task.status !== 'SKIPPED';
  const isPending_ = isActive;
  const due = new Date(task.dueDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due); dueDay.setHours(0, 0, 0, 0);
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  const dueText =
    diff < 0  ? `เลย ${-diff} วัน` :
    diff === 0 ? 'วันนี้' :
    diff === 1 ? 'พรุ่งนี้' :
    `อีก ${diff} วัน`;
  const dueColor =
    diff < 0  ? 'var(--danger)' :
    diff <= 1 ? 'var(--orange)' :
    'var(--text-dark)';

  const handleComplete = () => {
    startTransition(async () => { await completeTask({ taskId: task.id, resultNote }); onClose(); });
  };
  const handleSkip = () => {
    startTransition(async () => { await skipTask({ taskId: task.id, resultNote }); onClose(); });
  };
  const handleReopen = () => {
    startTransition(async () => { await reopenTask({ taskId: task.id }); onClose(); });
  };
  const handleDelete = () => {
    if (!confirm('ลบงานนี้?')) return;
    startTransition(async () => { await deleteTask({ taskId: task.id }); onClose(); });
  };

  return (
    <>
      <div className="task-drawer-backdrop" onClick={onClose} />
      <aside className="task-drawer" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="task-drawer-header">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{
              background: typeInfo.color, color: '#fff',
              padding: '0.3rem 0.65rem', borderRadius: 999,
              fontSize: 11, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <i className={typeInfo.icon}></i> {typeInfo.label}
            </span>
            {isPending_ && (
              <span style={{
                background: priInfo.bg, color: priInfo.color,
                padding: '0.25rem 0.6rem', borderRadius: 999,
                fontSize: 11, fontWeight: 700,
              }}>
                {priInfo.label}
              </span>
            )}
            {task.status === 'IN_PROGRESS' && (
              <span style={{
                background: '#fef3c7', color: '#b45309',
                padding: '0.25rem 0.6rem', borderRadius: 999, fontSize: 11, fontWeight: 700,
              }}>
                <i className="ri-loader-4-line"></i> กำลังติดตาม
              </span>
            )}
            {task.status === 'WAITING_REPLY' && (
              <span style={{
                background: '#ede9fe', color: '#6d28d9',
                padding: '0.25rem 0.6rem', borderRadius: 999, fontSize: 11, fontWeight: 700,
              }}>
                <i className="ri-chat-3-line"></i> รอลูกค้าตอบ
              </span>
            )}
            {task.status === 'DONE' && (
              <span style={{
                background: 'var(--success-light)', color: 'var(--success)',
                padding: '0.25rem 0.6rem', borderRadius: 999, fontSize: 11, fontWeight: 700,
              }}>
                <i className="ri-check-line"></i> เสร็จแล้ว
              </span>
            )}
            {task.status === 'SKIPPED' && (
              <span style={{
                background: '#f1f5f9', color: '#64748b',
                padding: '0.25rem 0.6rem', borderRadius: 999, fontSize: 11, fontWeight: 700,
              }}>
                ข้ามแล้ว
              </span>
            )}
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="ปิด" style={{ width: 36, height: 36 }}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        {/* Body */}
        <div className="task-drawer-body">
          {/* Title */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.3, margin: 0 }}>
            {task.title}
          </h2>

          {/* Meta */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.6rem', fontSize: 13 }}>
            <span style={{ color: dueColor, fontWeight: 700 }}>
              <i className="ri-calendar-line"></i> {dueText}
              <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>
                ({due.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })})
              </span>
            </span>
            {task.assignedToName && (
              <>
                <span style={{ color: 'var(--border)' }}>•</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  <i className="ri-user-3-line"></i> {task.assignedToName}
                </span>
              </>
            )}
          </div>

          {task.note && (
            <div className="card p-3" style={{ marginTop: '1rem', background: 'var(--primary-tint)', borderColor: 'var(--primary-soft)' }}>
              <div className="text-sm fw-600" style={{ marginBottom: 4 }}>
                <i className="ri-sticky-note-line text-primary"></i> โน้ต
              </div>
              <p className="text-sm" style={{ color: 'var(--text-dark)', lineHeight: 1.6, margin: 0 }}>
                {task.note}
              </p>
            </div>
          )}

          {task.resultNote && (
            <div className="card p-3" style={{ marginTop: '0.75rem', background: 'var(--success-light)', borderColor: 'var(--primary-soft)' }}>
              <div className="text-sm fw-600" style={{ marginBottom: 4, color: 'var(--success)' }}>
                <i className="ri-chat-3-line"></i> ผลลัพธ์
              </div>
              <p className="text-sm" style={{ color: 'var(--text-dark)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                {task.resultNote}
              </p>
            </div>
          )}

          {/* Customer card */}
          <div className="card p-3" style={{ marginTop: '1rem' }}>
            <div className="text-sm text-muted fw-600" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
              ลูกค้า
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6FCF97, #2FA084)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>
                {(task.customerName ?? task.customerPhone).slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fw-700" style={{ fontSize: 14, color: 'var(--text-dark)' }}>
                  {task.customerName ?? 'ไม่ระบุชื่อ'}
                </div>
                <div className="text-sm text-muted">
                  <i className="ri-phone-line"></i> {task.customerPhone}
                </div>
              </div>
              <Link
                href={`/customers/${encodeURIComponent(task.customerPhone)}`}
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '0 0.85rem', height: 36 }}
              >
                <i className="ri-external-link-line"></i> เปิดเต็มหน้า
              </Link>
            </div>
          </div>

          {/* Workflow status switcher */}
          {isActive && (
            <div style={{ marginTop: '1.25rem' }}>
              <div className="text-sm fw-600 mb-2">สถานะ workflow</div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <StatusPill
                  active={task.status === 'PENDING'}
                  onClick={() => startTransition(async () => { await updateTask({ taskId: task.id, status: 'PENDING' }); })}
                  disabled={isPending}
                  icon="ri-inbox-line"
                  label="รอทำ"
                  color="#64748b"
                  bg="#f1f5f9"
                />
                <StatusPill
                  active={task.status === 'IN_PROGRESS'}
                  onClick={() => startTransition(async () => { await updateTask({ taskId: task.id, status: 'IN_PROGRESS' }); })}
                  disabled={isPending}
                  icon="ri-loader-4-line"
                  label="กำลังติดตาม"
                  color="#b45309"
                  bg="#fef3c7"
                />
                <StatusPill
                  active={task.status === 'WAITING_REPLY'}
                  onClick={() => startTransition(async () => { await updateTask({ taskId: task.id, status: 'WAITING_REPLY' }); })}
                  disabled={isPending}
                  icon="ri-chat-3-line"
                  label="รอลูกค้าตอบ"
                  color="#6d28d9"
                  bg="#ede9fe"
                />
              </div>
            </div>
          )}

          {/* Action zone */}
          {isPending_ && (
            <div style={{ marginTop: '1.25rem' }}>
              <div className="text-sm fw-600 mb-2">บันทึกผลลัพธ์ (ไม่บังคับ)</div>
              <input
                value={resultNote}
                onChange={e => setResultNote(e.target.value)}
                className="form-control"
                placeholder="เช่น ลูกค้าโอเค กินต่อ"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="task-drawer-footer">
          {isPending_ ? (
            <>
              <button onClick={handleDelete} disabled={isPending} className="btn btn-secondary"
                style={{ flex: '0 0 auto', color: 'var(--danger)' }} title="ลบงาน">
                <i className="ri-delete-bin-line"></i>
              </button>
              <button onClick={handleSkip} disabled={isPending} className="btn btn-secondary" style={{ flex: 1 }}>
                <i className="ri-skip-forward-line"></i> ข้าม
              </button>
              <button onClick={handleComplete} disabled={isPending} className="btn btn-primary" style={{ flex: 2 }}>
                {isPending
                  ? <><i className="ri-loader-4-line"></i> กำลังบันทึก</>
                  : <><i className="ri-check-line"></i> ทำเสร็จ</>}
              </button>
            </>
          ) : (
            <button onClick={handleReopen} disabled={isPending} className="btn btn-secondary" style={{ flex: 1 }}>
              <i className="ri-restart-line"></i> เปิดใหม่
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

function StatusPill({
  active, onClick, disabled, icon, label, color, bg,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  icon: string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn"
      style={{
        fontSize: 12,
        padding: '0.35rem 0.75rem',
        background: active ? color : bg,
        color: active ? '#fff' : color,
        border: `1px solid ${active ? color : 'transparent'}`,
        fontWeight: 600,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <i className={icon} style={{ marginRight: 4 }}></i>{label}
    </button>
  );
}
