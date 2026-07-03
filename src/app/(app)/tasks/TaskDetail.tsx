'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { completeTask, skipTask, reopenTask, deleteTask, updateTask } from './actions';
import { typeInfo, PRIORITY_LABEL } from './taskLabels';
import { useToast, useConfirm } from '@/components/ui/Feedback';

export type TaskItem = {
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
  // บริบทลูกค้า (มาจาก page.tsx)
  lastOrderText: string;
  currentSet: string;
  lastContactText: string;
};

const callable = (phone: string) => /^[0-9+\-\s]{6,}$/.test(phone);

/** เนื้อหารายละเอียดงาน — ใช้ได้ทั้งแบบ pane (desktop) และ drawer (มือถือ) */
export default function TaskDetail({ task, onClose }: { task: TaskItem; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  // หมายเหตุ: parent render ด้วย key={task.id} → component remount เมื่อสลับงาน, resultNote รีเซ็ตเอง
  const [resultNote, setResultNote] = useState('');
  const [isPending, startTransition] = useTransition();

  const ti = typeInfo(task.type);
  const pi = PRIORITY_LABEL[task.priority];
  const isActive = task.status !== 'DONE' && task.status !== 'SKIPPED';

  const due = new Date(task.dueDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due); dueDay.setHours(0, 0, 0, 0);
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  const dueText = diff < 0 ? `เลย ${-diff} วัน` : diff === 0 ? 'วันนี้' : diff === 1 ? 'พรุ่งนี้' : `อีก ${diff} วัน`;
  const dueOverdue = diff < 0;

  const run = (fn: () => Promise<unknown>, close: boolean, successMsg?: string) => {
    startTransition(async () => {
      try {
        await fn();
        if (successMsg) toast.success(successMsg);
        if (close) onClose(); else router.refresh();
      } catch {
        toast.error('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
      }
    });
  };

  const handleDelete = async () => {
    if (!(await confirm({ title: 'ลบงานนี้?', message: 'การลบไม่สามารถย้อนกลับได้', danger: true, confirmLabel: 'ลบ' }))) return;
    run(() => deleteTask({ taskId: task.id }), true, 'ลบงานแล้ว');
  };

  return (
    <>
      {/* Header — type / priority / workflow badges */}
      <div className="t2-detail-head">
        <span className="t2-tag" style={{ background: ti.color, color: '#fff' }}>
          <i className={ti.icon}></i> {ti.label}
        </span>
        {isActive && (
          <span className="t2-tag" style={{ background: pi.bg, color: pi.color }}>{pi.label}</span>
        )}
        {task.status === 'IN_PROGRESS' && (
          <span className="t2-tag t2-tag--in-progress" style={{ background: '#fef3c7', color: '#b45309' }}><i className="ri-loader-4-line"></i> กำลังติดตาม</span>
        )}
        {task.status === 'WAITING_REPLY' && (
          <span className="t2-tag t2-tag--waiting" style={{ background: '#ede9fe', color: '#6d28d9' }}><i className="ri-chat-3-line"></i> รอลูกค้าตอบ</span>
        )}
        {task.status === 'DONE' && (
          <span className="t2-tag" style={{ background: 'var(--success-light)', color: 'var(--success)' }}><i className="ri-check-line"></i> เสร็จแล้ว</span>
        )}
        {task.status === 'SKIPPED' && (
          <span className="t2-tag t2-tag--skipped" style={{ background: '#f1f5f9', color: '#64748b' }}>ข้ามแล้ว</span>
        )}
        <button onClick={onClose} className="t2-detail-x" aria-label="ปิด"><i className="ri-close-line"></i></button>
      </div>

      {/* Body */}
      <div className="t2-detail-body">
        <div className="t2-detail-title">{task.title}</div>
        <div className="t2-detail-meta">
          <span className={dueOverdue ? 'od' : undefined}><i className="ri-calendar-line"></i> {dueText}</span>
          <span style={{ color: 'var(--text-light)' }}>·</span>
          <span>{due.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          {task.assignedToName && (
            <>
              <span style={{ color: 'var(--text-light)' }}>·</span>
              <span><i className="ri-user-3-line"></i> {task.assignedToName}</span>
            </>
          )}
        </div>

        {task.note && (
          <div className="t2-box note">
            <div className="t2-box-label"><i className="ri-sticky-note-line" style={{ color: 'var(--primary)' }}></i> โน้ต</div>
            <div style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.55 }}>{task.note}</div>
          </div>
        )}

        {task.resultNote && (
          <div className="t2-box result">
            <div className="t2-box-label" style={{ color: 'var(--success)' }}><i className="ri-chat-3-line"></i> ผลลัพธ์</div>
            <div style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.55, fontStyle: 'italic' }}>{task.resultNote}</div>
          </div>
        )}

        {/* Customer + channels + context */}
        <div className="t2-box">
          <div className="t2-box-label">ลูกค้า</div>
          <div className="t2-cust">
            <div className="t2-cust-av">{(task.customerName ?? task.customerPhone).slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="t2-cust-name">{task.customerName ?? 'ไม่ระบุชื่อ'}</div>
              <div className="t2-cust-phone"><i className="ri-phone-line"></i> {task.customerPhone}</div>
            </div>
            <Link href={`/customers/${encodeURIComponent(task.customerPhone)}`} className="t2-cust-open">
              <i className="ri-external-link-line"></i> เปิดเต็มหน้า
            </Link>
          </div>
          <div className="t2-channels">
            {callable(task.customerPhone) && (
              <a className="t2-ch-btn call" href={`tel:${task.customerPhone}`}><i className="ri-phone-line"></i> โทร</a>
            )}
            <a className="t2-ch-btn line" href="https://line.me/R/" target="_blank" rel="noreferrer"><i className="ri-line-fill"></i> เปิด LINE</a>
          </div>
          <div className="t2-ctx">
            <div className="t2-ctx-cell"><div className="t2-ctx-val">{task.lastOrderText}</div><div className="t2-ctx-lbl">ออเดอร์ล่าสุด</div></div>
            <div className="t2-ctx-cell"><div className="t2-ctx-val">{task.currentSet}</div><div className="t2-ctx-lbl">เซ็ทปัจจุบัน</div></div>
            <div className="t2-ctx-cell"><div className="t2-ctx-val">{task.lastContactText}</div><div className="t2-ctx-lbl">คุยล่าสุด</div></div>
          </div>
        </div>

        {/* Workflow switcher */}
        {isActive && (
          <div style={{ marginTop: '1rem' }}>
            <div className="t2-box-label" style={{ marginBottom: '0.45rem' }}>สถานะ workflow</div>
            <div className="t2-wf">
              <WfPill active={task.status === 'PENDING'} disabled={isPending} icon="ri-inbox-line" label="รอทำ" color="#64748b" bg="#f1f5f9"
                onClick={() => run(() => updateTask({ taskId: task.id, status: 'PENDING' }), false)} />
              <WfPill active={task.status === 'IN_PROGRESS'} disabled={isPending} icon="ri-loader-4-line" label="กำลังติดตาม" color="#b45309" bg="#fef3c7"
                onClick={() => run(() => updateTask({ taskId: task.id, status: 'IN_PROGRESS' }), false)} />
              <WfPill active={task.status === 'WAITING_REPLY'} disabled={isPending} icon="ri-chat-3-line" label="รอลูกค้าตอบ" color="#6d28d9" bg="#ede9fe"
                onClick={() => run(() => updateTask({ taskId: task.id, status: 'WAITING_REPLY' }), false)} />
            </div>
          </div>
        )}

        {/* Result note input */}
        {isActive && (
          <div style={{ marginTop: '1rem' }}>
            <div className="t2-box-label">บันทึกผลลัพธ์ (ไม่บังคับ)</div>
            <input className="t2-input" value={resultNote} onChange={e => setResultNote(e.target.value)} placeholder="เช่น ลูกค้าโอเค กินต่อ" />
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="t2-detail-foot">
        {isActive ? (
          <>
            <button className="t2-df-btn del" disabled={isPending} onClick={handleDelete} title="ลบงาน"><i className="ri-delete-bin-line"></i></button>
            <button className="t2-df-btn skip" disabled={isPending} onClick={() => run(() => skipTask({ taskId: task.id, resultNote }), true, 'ข้ามงานแล้ว')}>
              <i className="ri-skip-forward-line"></i> ข้าม
            </button>
            <button className="t2-df-btn done" disabled={isPending} onClick={() => run(() => completeTask({ taskId: task.id, resultNote }), true, 'ทำงานเสร็จแล้ว')}>
              {isPending ? <><i className="ri-loader-4-line"></i> กำลังบันทึก</> : <><i className="ri-check-line"></i> ทำเสร็จ</>}
            </button>
          </>
        ) : (
          <button className="t2-df-btn reopen" disabled={isPending} onClick={() => run(() => reopenTask({ taskId: task.id }), true, 'เปิดงานใหม่แล้ว')}>
            <i className="ri-restart-line"></i> เปิดใหม่
          </button>
        )}
      </div>
    </>
  );
}

function WfPill({ active, onClick, disabled, icon, label, color, bg }: {
  active: boolean; onClick: () => void; disabled: boolean; icon: string; label: string; color: string; bg: string;
}) {
  return (
    <button className="t2-wf-pill" onClick={onClick} disabled={disabled}
      style={{ background: active ? color : bg, color: active ? '#fff' : color, borderColor: active ? color : 'transparent' }}>
      <i className={icon} style={{ marginRight: 4 }}></i>{label}
    </button>
  );
}
