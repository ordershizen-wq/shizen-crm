'use client';

import { useState, useTransition } from 'react';
import { createTask, completeTask, reopenTask, skipTask, deleteTask } from '@/app/(app)/tasks/actions';
import { useToast, useConfirm } from '@/components/ui/Feedback';

type TaskItem = {
  id: string;
  title: string;
  note: string | null;
  dueDate: Date;
  type: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'WAITING_REPLY' | 'DONE' | 'SKIPPED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  assignedTo: { id: string; fullName: string } | null;
  createdBy: { id: string; fullName: string } | null;
  completedAt: Date | null;
  resultNote: string | null;
};

type Member = { id: string; fullName: string };

type Props = {
  phone: string;
  currentUserId: string;
  tasks: TaskItem[];
  members: Member[];
};

const TYPE_LABEL: Record<string, { label: string; icon: string; color: string }> = {
  FOLLOW_UP:  { label: 'ตามอาการ',     icon: 'ri-stethoscope-line',  color: '#0ea5e9' },
  CALL:       { label: 'โทรหา',          icon: 'ri-phone-line',         color: '#10b981' },
  REPEAT_BUY: { label: 'เตือนซื้อซ้ำ',    icon: 'ri-repeat-line',         color: '#f59e0b' },
  DELIVERY:   { label: 'ตามของ',         icon: 'ri-truck-line',          color: '#8b5cf6' },
  CUSTOM:     { label: 'อื่นๆ',           icon: 'ri-bookmark-line',       color: '#64748b' },
};

const PRIORITY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  HIGH:   { label: 'ด่วน',     color: 'var(--danger)',  bg: 'var(--danger-light)'  },
  NORMAL: { label: 'ปกติ',     color: 'var(--primary)', bg: 'var(--blue-light)'    },
  LOW:    { label: 'ไม่เร่ง',  color: '#64748b',         bg: '#f1f5f9'              },
};

function fmtDateInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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

export default function TasksPanel({ phone, currentUserId, tasks, members }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const isClosed = (s: string) => s === 'DONE' || s === 'SKIPPED';
  const pending = tasks.filter(t => !isClosed(t.status)).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const done = tasks.filter(t => isClosed(t.status)).sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));

  return (
    <div>
      <div className="flex-between mb-3">
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          ค้างอยู่ <b style={{ color: 'var(--text-dark)' }}>{pending.length}</b> งาน
          {done.length > 0 && <> · เสร็จแล้ว {done.length}</>}
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="btn btn-primary"
          style={{ fontSize: 13, padding: '0.4rem 0.85rem' }}
        >
          <i className={showForm ? 'ri-close-line' : 'ri-add-line'}></i>
          {showForm ? ' ยกเลิก' : ' เพิ่มงาน'}
        </button>
      </div>

      {showForm && (
        <NewTaskForm
          phone={phone}
          currentUserId={currentUserId}
          members={members}
          onDone={() => setShowForm(false)}
        />
      )}

      {pending.length === 0 && !showForm && (
        <div className="text-center text-muted text-sm" style={{ padding: '1.5rem 0' }}>
          <i className="ri-checkbox-circle-line" style={{ fontSize: 28, color: 'var(--success)' }}></i>
          <p className="mt-1">ไม่มีงานค้าง</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {pending.map(t => <TaskRow key={t.id} task={t} />)}
      </div>

      {done.length > 0 && (
        <>
          <button
            onClick={() => setShowDone(s => !s)}
            className="btn btn-secondary mt-3"
            style={{ fontSize: 12, padding: '0.3rem 0.7rem' }}
          >
            <i className={showDone ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
            {showDone ? ' ซ่อน' : ' ดู'}งานที่เสร็จแล้ว ({done.length})
          </button>
          {showDone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
              {done.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NewTaskForm({ phone, currentUserId, members, onDone }: {
  phone: string; currentUserId: string; members: Member[]; onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('FOLLOW_UP');
  const [priority, setPriority] = useState('NORMAL');
  const [assignedToId, setAssignedToId] = useState(currentUserId);
  const [daysFromNow, setDaysFromNow] = useState(7);
  const [customDate, setCustomDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const handleSubmit = () => {
    setError('');
    if (!title.trim()) { setError('กรุณาระบุชื่องาน'); return; }

    let dueDate: string;
    if (customDate) {
      dueDate = customDate;
    } else {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      dueDate = fmtDateInput(d);
    }

    startTransition(async () => {
      try {
        const result = await createTask({
          customerPhone: phone, title, note, dueDate, type, priority, assignedToId,
        });
        if (result && 'error' in result) {
          setError(result.error);
        } else {
          toast.success('สร้างงานแล้ว');
          onDone();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
      }
    });
  };

  return (
    <div className="card p-3 mb-3" style={{ background: 'var(--blue-light)', border: '1px solid var(--primary)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="form-control"
          placeholder="ชื่องาน เช่น โทรเช็คอาการ Sentina วันที่ 7"
          style={{ fontSize: 14 }}
        />

        <div className="tasks-panel-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <select value={type} onChange={e => setType(e.target.value)} className="form-control" style={{ fontSize: 13 }}>
            {Object.entries(TYPE_LABEL).map(([v, t]) => (
              <option key={v} value={v}>{t.label}</option>
            ))}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="form-control" style={{ fontSize: 13 }}>
            <option value="HIGH">🔴 ด่วน</option>
            <option value="NORMAL">🔵 ปกติ</option>
            <option value="LOW">⚪ ไม่เร่ง</option>
          </select>
        </div>

        <div>
          <div className="text-sm text-muted mb-1">กำหนดวัน</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[1, 3, 7, 14, 30].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => { setDaysFromNow(d); setCustomDate(''); }}
                className="btn"
                style={{
                  fontSize: 12, padding: '0.3rem 0.7rem',
                  background: !customDate && daysFromNow === d ? 'var(--primary)' : '#fff',
                  color: !customDate && daysFromNow === d ? '#fff' : 'var(--text-dark)',
                  border: '1px solid var(--border)',
                }}
              >
                +{d} วัน
              </button>
            ))}
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="form-control"
              style={{ fontSize: 12, padding: '0.3rem 0.5rem', width: 'auto' }}
            />
          </div>
        </div>

        <div>
          <div className="text-sm text-muted mb-1">มอบหมายให้</div>
          <select
            value={assignedToId}
            onChange={e => setAssignedToId(e.target.value)}
            className="form-control"
            style={{ fontSize: 13 }}
          >
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.fullName}{m.id === currentUserId ? ' (ฉัน)' : ''}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          className="form-control"
          rows={2}
          placeholder="โน้ต (ไม่บังคับ)"
          style={{ fontSize: 13, resize: 'vertical' }}
        />

        {error && <div className="text-sm" style={{ color: 'var(--danger)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onDone} className="btn btn-secondary" style={{ fontSize: 13 }}>ยกเลิก</button>
          <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary" style={{ fontSize: 13 }}>
            {isPending ? <><i className="ri-loader-4-line"></i> กำลังบันทึก</> : <><i className="ri-save-line"></i> บันทึกงาน</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: TaskItem }) {
  const [expanded, setExpanded] = useState(false);
  const [resultNote, setResultNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();

  const typeInfo = TYPE_LABEL[task.type] ?? TYPE_LABEL.CUSTOM;
  const priInfo = PRIORITY_LABEL[task.priority];
  const due = dueLabel(task.dueDate, task.status);
  const isPending_ = task.status !== 'DONE' && task.status !== 'SKIPPED';

  const handleComplete = () => {
    startTransition(async () => {
      try {
        await completeTask({ taskId: task.id, resultNote });
        setExpanded(false);
        setResultNote('');
        toast.success('ทำงานเสร็จแล้ว');
      } catch {
        toast.error('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
      }
    });
  };

  const handleSkip = () => {
    startTransition(async () => {
      try {
        await skipTask({ taskId: task.id, resultNote });
        setExpanded(false);
        setResultNote('');
        toast.success('ข้ามงานแล้ว');
      } catch {
        toast.error('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
      }
    });
  };

  const handleReopen = () => startTransition(async () => {
    try { await reopenTask({ taskId: task.id }); toast.success('เปิดงานใหม่แล้ว'); }
    catch { toast.error('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'); }
  });
  const handleDelete = async () => {
    if (!(await confirm({ title: 'ลบงานนี้?', message: 'การลบไม่สามารถย้อนกลับได้', danger: true, confirmLabel: 'ลบ' }))) return;
    startTransition(async () => {
      try { await deleteTask({ taskId: task.id }); toast.success('ลบงานแล้ว'); }
      catch { toast.error('ลบไม่สำเร็จ ลองใหม่อีกครั้ง'); }
    });
  };

  return (
    <div className="card p-3" style={{
      borderLeft: `3px solid ${typeInfo.color}`,
      opacity: isPending_ ? 1 : 0.65,
    }}>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-between" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div className="fw-600" style={{ fontSize: 14, color: 'var(--text-dark)' }}>
                {task.status === 'DONE' && <i className="ri-checkbox-circle-fill" style={{ color: 'var(--success)' }}></i>}
                {task.status === 'SKIPPED' && <i className="ri-skip-forward-line kanban-icon--skipped" style={{ color: '#64748b' }}></i>}
                {' '}{task.title}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: 4, fontSize: 11 }}>
                <span style={{ color: typeInfo.color, fontWeight: 600 }}>
                  <i className={typeInfo.icon}></i> {typeInfo.label}
                </span>
                {isPending_ && (
                  <span style={{
                    background: priInfo.bg, color: priInfo.color,
                    padding: '0.1rem 0.5rem', borderRadius: 10, fontWeight: 600,
                  }}>{priInfo.label}</span>
                )}
                <span style={{ color: due.color, fontWeight: 600 }}>
                  <i className="ri-calendar-line"></i> {due.text}
                </span>
                {task.assignedTo && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    <i className="ri-user-line"></i> {task.assignedTo.fullName}
                  </span>
                )}
              </div>
              {task.note && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-dark)', lineHeight: 1.5 }}>
                  {task.note}
                </p>
              )}
              {task.resultNote && (
                <p className="text-sm mt-1" style={{ color: 'var(--success)', fontStyle: 'italic' }}>
                  <i className="ri-chat-3-line"></i> {task.resultNote}
                </p>
              )}
            </div>
          </div>

          {isPending_ && expanded && (
            <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.4rem', flexDirection: 'column' }}>
              <input
                value={resultNote}
                onChange={e => setResultNote(e.target.value)}
                className="form-control"
                placeholder="ผลลัพธ์ (ไม่บังคับ) เช่น ลูกค้าโอเค กินต่อ"
                style={{ fontSize: 13 }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setExpanded(false)} className="btn btn-secondary" style={{ fontSize: 12, padding: '0.25rem 0.6rem' }}>
                  ปิด
                </button>
                <button onClick={handleSkip} disabled={isPending} className="btn" style={{ fontSize: 12, padding: '0.25rem 0.6rem', background: '#f1f5f9' }}>
                  <i className="ri-skip-forward-line"></i> ข้าม
                </button>
                <button onClick={handleComplete} disabled={isPending} className="btn btn-success" style={{ fontSize: 12, padding: '0.25rem 0.6rem', background: 'var(--success)', color: '#fff' }}>
                  <i className="ri-check-line"></i> เสร็จแล้ว
                </button>
              </div>
            </div>
          )}

          {isPending_ && !expanded && (
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
              <button onClick={() => setExpanded(true)} className="btn btn-success" style={{ fontSize: 12, padding: '0.25rem 0.65rem', background: 'var(--success)', color: '#fff' }}>
                <i className="ri-check-line"></i> ทำเสร็จ
              </button>
              <button onClick={handleDelete} disabled={isPending} className="btn" style={{ fontSize: 12, padding: '0.25rem 0.5rem', color: 'var(--danger)' }}>
                <i className="ri-delete-bin-line"></i>
              </button>
            </div>
          )}

          {!isPending_ && (
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
              <button onClick={handleReopen} disabled={isPending} className="btn btn-secondary" style={{ fontSize: 12, padding: '0.25rem 0.6rem' }}>
                <i className="ri-restart-line"></i> เปิดใหม่
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
