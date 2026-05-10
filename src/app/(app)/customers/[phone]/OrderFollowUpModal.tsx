'use client';

import { useState, useTransition } from 'react';
import { batchCreateTasks } from '@/app/(app)/tasks/actions';

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

const TYPES: { value: string; label: string }[] = [
  { value: 'DELIVERY',   label: 'ตามของ' },
  { value: 'FOLLOW_UP',  label: 'ตามอาการ' },
  { value: 'CALL',       label: 'โทรหา' },
  { value: 'REPEAT_BUY', label: 'เตือนซื้อซ้ำ' },
  { value: 'CUSTOM',     label: 'อื่นๆ' },
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

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(20, 52, 43, 0.45)',
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
          background: '#fff', borderRadius: 24, maxWidth: 720, width: '100%',
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 32px 80px rgba(20, 52, 43, 0.25), 0 12px 24px rgba(20, 52, 43, 0.10)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
          <div className="flex-between">
            <div>
              <h3 className="fw-700" style={{ fontSize: 17, color: 'var(--text-dark)' }}>
                <i className="ri-task-line text-primary"></i> ตั้งงานติดตามจากออเดอร์
              </h3>
              <p className="text-sm text-muted mt-1">
                ออเดอร์วันที่ {orderDateStr} {productNames.length > 0 && <>· {productNames.join(', ')}</>}
              </p>
            </div>
            <button onClick={onClose} className="icon-btn" aria-label="ปิด">
              <i className="ri-close-line"></i>
            </button>
          </div>
          {isFirstOrder && (
            <div className="mt-2" style={{
              fontSize: 12, color: 'var(--success)', background: 'var(--success-light)',
              padding: '0.4rem 0.75rem', borderRadius: 8, display: 'inline-block',
            }}>
              <i className="ri-sparkling-line"></i> ออเดอร์แรกของลูกค้า — ใช้ preset 5 ขั้น
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div className="text-sm text-muted mb-3">
            ติ๊กเลือกงานที่ต้องการสร้าง — แก้วัน/ชื่อ/ประเภทได้
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rows.map(r => {
              const enabled = enabledMap[r.uid] ?? false;
              const dueStr = dateFromOrder(orderDate, r.daysFromOrder);
              return (
                <div
                  key={r.uid}
                  className="card p-3"
                  style={{
                    borderLeft: enabled ? '3px solid var(--primary)' : '3px solid var(--border)',
                    opacity: enabled ? 1 : 0.55,
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={e => setEnabledMap(m => ({ ...m, [r.uid]: e.target.checked }))}
                      style={{ marginTop: 6, width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <input
                        value={r.title}
                        onChange={e => updateRow(r.uid, { title: e.target.value })}
                        placeholder="ชื่องาน"
                        className="form-control"
                        style={{ fontSize: 13, fontWeight: 600 }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '0.4rem' }}>
                        <input
                          type="number"
                          min={0} max={365}
                          value={r.daysFromOrder}
                          onChange={e => updateRow(r.uid, { daysFromOrder: Number(e.target.value) || 0 })}
                          className="form-control"
                          style={{ fontSize: 12 }}
                          title="จำนวนวันหลังออเดอร์"
                        />
                        <select
                          value={r.type}
                          onChange={e => updateRow(r.uid, { type: e.target.value })}
                          className="form-control"
                          style={{ fontSize: 12 }}
                        >
                          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <select
                          value={r.priority}
                          onChange={e => updateRow(r.uid, { priority: e.target.value })}
                          className="form-control"
                          style={{ fontSize: 12 }}
                        >
                          <option value="HIGH">🔴 ด่วน</option>
                          <option value="NORMAL">🔵 ปกติ</option>
                          <option value="LOW">⚪ ไม่เร่ง</option>
                        </select>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        <i className="ri-calendar-line"></i> +{r.daysFromOrder} วัน → {new Date(dueStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <button
                      onClick={() => removeRow(r.uid)}
                      className="icon-btn"
                      style={{ color: 'var(--danger)' }}
                      title="ลบ"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={addRow} className="btn btn-secondary mt-3" style={{ fontSize: 13 }}>
            <i className="ri-add-line"></i> เพิ่มงานเอง
          </button>

          {/* Assigned to */}
          <div className="mt-3">
            <div className="text-sm text-muted mb-1">มอบหมายให้ (ทุกงานในรอบนี้)</div>
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

          {error && <div className="text-sm mt-2" style={{ color: 'var(--danger)' }}>{error}</div>}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)',
          display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
        }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: 13 }}>ยกเลิก</button>
          <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary" style={{ fontSize: 13 }}>
            {isPending
              ? <><i className="ri-loader-4-line"></i> กำลังสร้าง</>
              : <><i className="ri-save-line"></i> สร้างงาน {Object.values(enabledMap).filter(Boolean).length} ชิ้น</>}
          </button>
        </div>
      </div>
    </div>
  );
}
