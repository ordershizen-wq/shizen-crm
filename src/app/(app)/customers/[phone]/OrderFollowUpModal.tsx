'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { batchCreateTasks } from '@/app/(app)/tasks/actions';
import { typeInfo, TYPE_LABEL, TYPE_ORDER } from '@/app/(app)/tasks/taskLabels';

type Member = { id: string; fullName: string };

type Props = {
  open: boolean;
  onClose: () => void;
  customerPhone: string;
  orderId: string;
  orderDate: Date;
  productNames: string[];
  isFirstOrder: boolean;
  currentUserId: string;
  members: Member[];
};

type DraftRow = {
  uid: string;
  daysFromOrder: number;
  title: string;
  type: string;
  priority: string;
  note: string;
};

const PRIORITIES = [
  { value: 'HIGH',   label: 'ด่วน',    color: 'var(--danger)' },
  { value: 'NORMAL', label: 'ปกติ',    color: 'var(--primary)' },
  { value: 'LOW',    label: 'ไม่เร่ง',  color: 'var(--text-muted)' },
];

// Preset แบ่งตามว่าเป็นออเดอร์แรกของลูกค้าหรือไม่
const PRESET_NEW: DraftRow[] = [
  { uid: 'p1', daysFromOrder: 1,  title: 'ขอบคุณลูกค้า + แจ้งเลขพัสดุ',  type: 'CALL',       priority: 'NORMAL', note: '' },
  { uid: 'p2', daysFromOrder: 3,  title: 'เช็คว่าได้รับของแล้วหรือยัง',     type: 'DELIVERY',   priority: 'NORMAL', note: '' },
  { uid: 'p3', daysFromOrder: 7,  title: 'ถามอาการเริ่มต้นหลังกิน',         type: 'FOLLOW_UP',  priority: 'NORMAL', note: '' },
  { uid: 'p4', daysFromOrder: 14, title: 'ติดตามครั้งที่ 2',                 type: 'FOLLOW_UP',  priority: 'NORMAL', note: '' },
  { uid: 'p5', daysFromOrder: 25, title: 'เตือนซื้อซ้ำ (เหลือ ~5 วัน)',     type: 'REPEAT_BUY', priority: 'HIGH',   note: '' },
];

const PRESET_REPEAT: DraftRow[] = [
  { uid: 'p1', daysFromOrder: 3,  title: 'เช็คว่าได้รับของแล้วหรือยัง',     type: 'DELIVERY',   priority: 'NORMAL', note: '' },
  { uid: 'p2', daysFromOrder: 7,  title: 'ถามอาการ',                          type: 'FOLLOW_UP',  priority: 'NORMAL', note: '' },
  { uid: 'p3', daysFromOrder: 25, title: 'เตือนซื้อซ้ำ',                       type: 'REPEAT_BUY', priority: 'HIGH',   note: '' },
];

let uidCounter = 100;
const newUid = () => `r${++uidCounter}`;

function dateFromOrder(orderDate: Date, days: number): string {
  const d = new Date(orderDate);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function OrderFollowUpModal({
  open, onClose, customerPhone, orderId, orderDate, productNames, isFirstOrder, currentUserId, members,
}: Props) {
  const [rows, setRows] = useState<DraftRow[]>(() =>
    (isFirstOrder ? PRESET_NEW : PRESET_REPEAT).map(r => ({ ...r }))
  );
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((isFirstOrder ? PRESET_NEW : PRESET_REPEAT).map(r => [r.uid, true]))
  );
  const [assignedToId, setAssignedToId] = useState(currentUserId);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // open เริ่มเป็น false เสมอ → ตอน SSR return null ก่อนถึง createPortal (document.body ปลอดภัย)
  if (!open) return null;

  const updateRow = (uid: string, patch: Partial<DraftRow>) => {
    setRows(rs => rs.map(r => r.uid === uid ? { ...r, ...patch } : r));
  };

  const addRow = () => {
    const uid = newUid();
    setRows(rs => [...rs, {
      uid, daysFromOrder: 7, title: '', type: 'CUSTOM', priority: 'NORMAL', note: '',
    }]);
    setEnabledMap(m => ({ ...m, [uid]: true }));
  };

  const removeRow = (uid: string) => {
    setRows(rs => rs.filter(r => r.uid !== uid));
    setEnabledMap(m => { const n = { ...m }; delete n[uid]; return n; });
  };

  const selectedCount = rows.filter(r => enabledMap[r.uid] && r.title.trim()).length;

  const handleSubmit = () => {
    setError('');
    const selected = rows.filter(r => enabledMap[r.uid] && r.title.trim());
    if (!selected.length) { setError('กรุณาเลือกหรือกรอกอย่างน้อย 1 งาน'); return; }

    startTransition(async () => {
      try {
        await batchCreateTasks({
          customerPhone,
          orderId,
          tasks: selected.map(r => ({
            title: r.title,
            note: r.note,
            dueDate: dateFromOrder(orderDate, r.daysFromOrder),
            type: r.type,
            priority: r.priority,
            assignedToId,
          })),
        });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
      }
    });
  };

  const orderDateStr = orderDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(20, 20, 40, 0.42)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeInUp 240ms ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, maxWidth: 660, width: '100%',
          maxHeight: '92vh', overflowY: 'auto', position: 'relative',
          boxShadow: '0 24px 64px rgba(20, 20, 50, 0.28), 0 8px 20px rgba(20, 20, 50, 0.10)',
        }}
      >
        {/* Header (sticky) */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 2, background: '#fff',
          padding: '1.15rem 1.4rem 1rem', borderBottom: '1px solid var(--border-light)',
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: 'var(--primary-tint)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21,
            }}>
              <i className="ri-calendar-todo-line"></i>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className="fw-700" style={{ fontSize: 17, color: 'var(--text-dark)', margin: 0 }}>
                ตั้งงานติดตามลูกค้า
              </h3>
              <p className="text-sm text-muted" style={{ margin: '3px 0 0' }}>
                จากออเดอร์ {orderDateStr}{productNames.length > 0 && <> · {productNames.join(', ')}</>}
              </p>
            </div>
            <button onClick={onClose} className="icon-btn" aria-label="ปิด" style={{ flexShrink: 0 }}>
              <i className="ri-close-line"></i>
            </button>
          </div>
          {isFirstOrder && (
            <div style={{
              marginTop: 12, fontSize: 12.5, fontWeight: 600, color: 'var(--success)',
              background: 'var(--success-light)', padding: '0.4rem 0.8rem', borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <i className="ri-sparkling-2-line"></i> ออเดอร์แรกของลูกค้า — แนะนำแผนติดตาม 5 ขั้น
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '1.1rem 1.4rem' }}>
          <div className="text-sm text-muted" style={{ marginBottom: 14 }}>
            ติ๊กเลือกงานที่ต้องการ — ปรับวัน ชื่อ ประเภท และความสำคัญได้
          </div>

          {/* Timeline list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(r => {
              const enabled = enabledMap[r.uid] ?? false;
              const meta = typeInfo(r.type);
              const dueStr = dateFromOrder(orderDate, r.daysFromOrder);
              return (
                <div
                  key={r.uid}
                  style={{
                    border: `1px solid ${enabled ? 'var(--border)' : 'var(--border-light)'}`,
                    borderLeft: `3px solid ${enabled ? meta.color : 'var(--border)'}`,
                    borderRadius: 12, padding: '0.85rem 0.9rem',
                    background: enabled ? '#fff' : 'var(--bg-app)',
                    boxShadow: enabled ? 'var(--shadow-card)' : 'none',
                    opacity: enabled ? 1 : 0.6,
                    transition: 'opacity 160ms ease, border-color 160ms ease',
                  }}
                >
                  <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                    {/* checkbox */}
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={e => setEnabledMap(m => ({ ...m, [r.uid]: e.target.checked }))}
                      style={{ marginTop: 5, width: 20, height: 20, cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }}
                    />
                    {/* type icon badge */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: meta.bg, color: meta.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginTop: 1,
                    }}>
                      <i className={meta.icon}></i>
                    </div>
                    {/* content */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          value={r.title}
                          onChange={e => updateRow(r.uid, { title: e.target.value })}
                          placeholder="ชื่องาน"
                          className="form-control"
                          style={{ fontSize: 14.5, fontWeight: 600, flex: 1, minWidth: 0 }}
                        />
                        <button
                          onClick={() => removeRow(r.uid)}
                          className="icon-btn"
                          style={{ color: 'var(--text-muted)', flexShrink: 0, width: 32, height: 32 }}
                          title="ลบงานนี้"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>

                      {/* controls */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        {/* days */}
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: 'var(--bg-app)', border: '1px solid var(--border-light)',
                          borderRadius: 999, padding: '3px 10px',
                        }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>หลัง</span>
                          <input
                            type="number" min={0} max={365}
                            value={r.daysFromOrder}
                            onChange={e => updateRow(r.uid, { daysFromOrder: Number(e.target.value) || 0 })}
                            style={{
                              width: 42, textAlign: 'center', border: 'none', background: 'transparent',
                              fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', outline: 'none',
                              MozAppearance: 'textfield',
                            }}
                            aria-label="จำนวนวันหลังออเดอร์"
                          />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>วัน</span>
                        </div>

                        {/* type */}
                        <select
                          value={r.type}
                          onChange={e => updateRow(r.uid, { type: e.target.value })}
                          className="form-control"
                          style={{ fontSize: 13, width: 'auto', padding: '5px 8px', fontWeight: 600 }}
                        >
                          {TYPE_ORDER.map(v => <option key={v} value={v}>{TYPE_LABEL[v].label}</option>)}
                        </select>

                        {/* priority pills */}
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          {PRIORITIES.map(p => {
                            const active = r.priority === p.value;
                            return (
                              <button
                                key={p.value}
                                onClick={() => updateRow(r.uid, { priority: p.value })}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                                  border: `1.5px solid ${active ? p.color : 'var(--border)'}`,
                                  background: active ? p.color : '#fff',
                                  color: active ? '#fff' : 'var(--text-muted)',
                                  transition: 'all 140ms ease',
                                }}
                                title={`ความสำคัญ: ${p.label}`}
                              >
                                <span style={{
                                  width: 7, height: 7, borderRadius: '50%',
                                  background: active ? '#fff' : p.color, display: 'inline-block',
                                }}></span>
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* due date */}
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="ri-calendar-event-line" style={{ color: meta.color }}></i>
                        กำหนด {new Date(dueStr).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={addRow}
            style={{
              marginTop: 12, width: '100%', padding: '0.6rem',
              border: '1.5px dashed var(--primary-soft)', borderRadius: 10,
              background: 'var(--primary-tint)', color: 'var(--primary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <i className="ri-add-line"></i> เพิ่มงานเอง
          </button>

          {/* Assigned to */}
          <div style={{ marginTop: 16 }}>
            <div className="text-sm fw-600" style={{ color: 'var(--text-dark)', marginBottom: 6 }}>
              <i className="ri-user-follow-line text-primary"></i> มอบหมายให้ (ทุกงานในรอบนี้)
            </div>
            <select
              value={assignedToId}
              onChange={e => setAssignedToId(e.target.value)}
              className="form-control"
              style={{ fontSize: 14 }}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.fullName}{m.id === currentUserId ? ' (ฉัน)' : ''}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{
              marginTop: 12, fontSize: 13, color: 'var(--danger)',
              background: 'var(--danger-light)', padding: '0.5rem 0.75rem', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className="ri-error-warning-line"></i> {error}
            </div>
          )}
        </div>

        {/* Footer (sticky) */}
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 2, background: '#fff',
          padding: '0.9rem 1.4rem', borderTop: '1px solid var(--border-light)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            <i className="ri-checkbox-circle-line" style={{ color: 'var(--primary)' }}></i> เลือกแล้ว <b style={{ color: 'var(--text-dark)' }}>{selectedCount}</b> งาน
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: 13 }}>ยกเลิก</button>
            <button
              onClick={handleSubmit}
              disabled={isPending || selectedCount === 0}
              className="btn btn-primary"
              style={{ fontSize: 13, opacity: isPending || selectedCount === 0 ? 0.6 : 1 }}
            >
              {isPending
                ? <><i className="ri-loader-4-line ri-spin"></i> กำลังสร้าง</>
                : <><i className="ri-check-line"></i> สร้าง {selectedCount} งาน</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
