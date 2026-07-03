'use client';

import { useState, useTransition } from 'react';
import { createReorder, type ReorderProduct } from './actions';
import { toYmd, MAX_BACKDATE_DAYS } from '@/lib/orderDate';

// คำนวณครั้งเดียวตอนโหลดโมดูล (ไม่เรียกใน render เพื่อเลี่ยง react-hooks/purity)
const TODAY_STR = toYmd(new Date());
const MIN_ORDER_DATE_STR = toYmd(new Date(Date.now() - MAX_BACKDATE_DAYS * 86400000));

type LatestProduct = { name: string; quantity: number };

type Props = {
  customerPhone: string;
  customerName: string;
  defaultAddress: string;
  defaultChannel: string | null;
  productSuggestions: string[];   // ชื่อสินค้าทั้งหมดที่ active ใน Product master (เป็นแค่ hint)
  lastOrderProducts: LatestProduct[];
};

const CHANNELS = [
  { value: 'LINE',   label: 'LINE',    icon: 'ri-line-fill',      color: '#06C755' },
  { value: 'FB',     label: 'Facebook', icon: 'ri-facebook-fill',  color: '#1877F2' },
  { value: 'TIKTOK', label: 'TikTok',  icon: 'ri-tiktok-fill',    color: '#000' },
  { value: 'TEL',    label: 'โทร',     icon: 'ri-phone-fill',     color: '#0ea5e9' },
  { value: 'OTHER',  label: 'อื่นๆ',   icon: 'ri-more-line',      color: '#64748b' },
];

type LineItem = { id: string; name: string; quantity: number };

let __lineId = 0;
const nextId = () => `r${++__lineId}`;

export default function ReorderButton({
  customerPhone,
  customerName,
  defaultAddress,
  defaultChannel,
  productSuggestions,
  lastOrderProducts,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ orderId: string; synced: boolean } | null>(null);

  const [address, setAddress] = useState(defaultAddress);
  const [channel, setChannel] = useState(
    CHANNELS.find(c => c.value.toLowerCase() === (defaultChannel ?? '').toLowerCase())?.value ?? 'LINE',
  );
  const [note, setNote] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [items, setItems] = useState<LineItem[]>(() =>
    lastOrderProducts.length > 0
      ? lastOrderProducts.map(p => ({ id: nextId(), name: p.name, quantity: p.quantity }))
      : [{ id: nextId(), name: '', quantity: 1 }],
  );
  const [backdate, setBackdate] = useState(false);
  const [orderDate, setOrderDate] = useState(TODAY_STR);

  const total = totalPrice;
  const canSubmit =
    items.length > 0 &&
    items.every(it => it.name.trim() && it.quantity > 0) &&
    totalPrice > 0 &&
    orderDate !== '';

  const openModal = () => {
    setError(null);
    setSuccessInfo(null);
    setBackdate(false);
    setOrderDate(TODAY_STR);
    setOpen(true);
  };

  const closeModal = () => {
    if (pending) return;
    setOpen(false);
  };

  const addItem = () => setItems(prev => [...prev, { id: nextId(), name: '', quantity: 1 }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const products: ReorderProduct[] = items
        .filter(it => it.name.trim())
        .map(it => ({ name: it.name.trim(), quantity: it.quantity }));

      const res = await createReorder({
        customerPhone,
        customerName,
        address: address.trim(),
        channel,
        products,
        totalPrice,
        orderDate,
        note: note.trim() || undefined,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccessInfo({ orderId: res.orderId, synced: res.syncStatus === 'SYNCED' });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="btn btn-primary"
        style={{ fontSize: 13, fontWeight: 600 }}
      >
        <i className="ri-shopping-cart-2-line"></i> ลงออเดอร์ใหม่
      </button>

      {open && (
        <div
          className="reorder-modal-overlay"
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 9000, padding: 0,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="reorder-modal"
            style={{
              width: '100%', maxWidth: 640, maxHeight: '92vh',
              background: '#fff', borderRadius: '16px 16px 0 0',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="fw-700" style={{ fontSize: 16, margin: 0, color: 'var(--text-dark)' }}>
                  <i className="ri-shopping-cart-2-line text-primary"></i> ลงออเดอร์ใหม่
                </h3>
                <p className="text-sm text-muted" style={{ margin: '2px 0 0' }}>
                  ของ {customerName} · {customerPhone}
                </p>
              </div>
              <button
                onClick={closeModal}
                aria-label="ปิด"
                style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)' }}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            {/* Body */}
            {successInfo ? (
              <SuccessPanel
                orderId={successInfo.orderId}
                synced={successInfo.synced}
                snippet={buildSheetSnippet({
                  customerName, customerPhone, address, items,
                  channel, totalPrice,
                })}
                onClose={() => { setOpen(false); }}
              />
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.25rem' }}>
                {/* Products */}
                <Label icon="ri-archive-2-line">สินค้า</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                  {items.map((it, idx) => (
                    <ProductRow
                      key={it.id}
                      item={it}
                      index={idx}
                      suggestions={productSuggestions}
                      onChange={patch => updateItem(it.id, patch)}
                      onRemove={items.length > 1 ? () => removeItem(it.id) : undefined}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addItem}
                    style={{
                      padding: '0.6rem', border: '1.5px dashed var(--primary)',
                      background: 'transparent', color: 'var(--primary)',
                      borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <i className="ri-add-line"></i> เพิ่มสินค้า
                  </button>
                </div>

                {/* ยอดรวมทั้งออเดอร์ */}
                <Label icon="ri-money-dollar-circle-line">ยอดรวมทั้งออเดอร์ (฿)</Label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={totalPrice || ''}
                  onChange={e => setTotalPrice(Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
                  placeholder="0"
                  style={{
                    width: '100%', padding: '0.7rem', borderRadius: 8,
                    border: '1px solid var(--border)', fontSize: 18, fontWeight: 700,
                    marginBottom: '1rem', color: 'var(--text-dark)',
                  }}
                />

                {/* Address */}
                <Label icon="ri-map-pin-line">ที่อยู่จัดส่ง</Label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={2}
                  placeholder="ที่อยู่ลูกค้า..."
                  style={{
                    width: '100%', padding: '0.6rem', borderRadius: 8,
                    border: '1px solid var(--border)', fontSize: 14,
                    fontFamily: 'inherit', resize: 'vertical', marginBottom: '1rem',
                  }}
                />

                {/* วันที่ปิดการขาย — ปกติ = วันนี้ ไม่ต้องแตะ, กดเปิดได้ถ้าลงย้อนหลัง */}
                {!backdate ? (
                  <button
                    type="button"
                    onClick={() => setBackdate(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      fontSize: 13, fontWeight: 600, color: 'var(--text-dark)',
                      background: '#fff', border: '1.5px solid var(--border)', borderRadius: 8,
                      cursor: 'pointer', padding: '0.55rem 0.8rem', marginBottom: '1rem', width: '100%',
                    }}
                  >
                    <i className="ri-history-line" style={{ color: 'var(--primary)' }}></i> ลงย้อนหลัง (ไม่ใช่วันนี้)
                  </button>
                ) : (
                  <>
                    <Label icon="ri-calendar-event-line" required>วันที่ปิดการขาย</Label>
                    <input
                      type="date"
                      value={orderDate}
                      min={MIN_ORDER_DATE_STR}
                      max={TODAY_STR}
                      onChange={e => setOrderDate(e.target.value)}
                      style={{
                        width: '100%', padding: '0.6rem', borderRadius: 8,
                        border: '1px solid var(--border)', fontSize: 14, marginBottom: '0.25rem',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => { setBackdate(false); setOrderDate(TODAY_STR); }}
                      style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}
                    >
                      ใช้วันนี้แทน
                    </button>
                  </>
                )}

                {/* Channel */}
                <Label icon="ri-chat-3-line">ช่องทาง</Label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {CHANNELS.map(c => {
                    const active = c.value === channel;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setChannel(c.value)}
                        className="reorder-channel-pill"
                        style={{
                          padding: '0.45rem 0.85rem', border: `1.5px solid ${active ? c.color : 'var(--border)'}`,
                          background: active ? c.color : '#fff', color: active ? '#fff' : 'var(--text-dark)',
                          borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        }}
                      >
                        <i className={c.icon}></i> {c.label}
                      </button>
                    );
                  })}
                </div>

                {/* Note */}
                <Label icon="ri-sticky-note-line">หมายเหตุ (ออปชัน)</Label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="โน้ตเพิ่มเติม..."
                  style={{
                    width: '100%', padding: '0.6rem', borderRadius: 8,
                    border: '1px solid var(--border)', fontSize: 14, marginBottom: '0.5rem',
                  }}
                />
              </div>
            )}

            {/* Footer */}
            {!successInfo && (
              <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-light)', background: '#f8fafc' }}>
                {error && (
                  <div style={{
                    background: 'var(--danger-light)', color: 'var(--danger)',
                    padding: '0.5rem 0.75rem', borderRadius: 6, fontSize: 13, marginBottom: '0.6rem',
                  }}>
                    <i className="ri-error-warning-line"></i> {error}
                  </div>
                )}
                <div className="flex-between reorder-modal-footer" style={{ alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <div className="text-sm text-muted">รวม</div>
                    <div className="fw-700" style={{ fontSize: 20, color: 'var(--primary)' }}>
                      ฿{total.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="reorder-modal-footer-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={pending}
                      className="btn"
                      style={{ background: '#fff', border: '1px solid var(--border)', padding: '0.55rem 0.9rem' }}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit || pending}
                      className="btn btn-primary"
                      style={{ padding: '0.55rem 1.2rem', opacity: canSubmit && !pending ? 1 : 0.6 }}
                    >
                      {pending
                        ? (<><i className="ri-loader-4-line ri-spin"></i> กำลังบันทึก...</>)
                        : (<><i className="ri-save-line"></i> บันทึก & sync</>)}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Label({ icon, children, required }: { icon: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="fw-600 text-sm" style={{ color: 'var(--text-dark)', marginBottom: 6 }}>
      <i className={icon}></i> {children}
      {required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
    </div>
  );
}

function ProductRow({
  item, index, suggestions, onChange, onRemove,
}: {
  item: LineItem;
  index: number;
  suggestions: string[];
  onChange: (patch: Partial<LineItem>) => void;
  onRemove?: () => void;
}) {
  const listId = `product-suggest-${index}`;
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 10, padding: '0.6rem',
      border: '1px solid var(--border-light)',
      display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem',
    }} className="reorder-product-row-wrap">
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <input
          list={listId}
          value={item.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="ชื่อสินค้า"
          style={{
            flex: 1, padding: '0.55rem', borderRadius: 6,
            border: '1px solid var(--border)', fontSize: 14, background: '#fff',
          }}
        />
        <datalist id={listId}>
          {suggestions.map(s => <option key={s} value={s} />)}
        </datalist>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="ลบสินค้านี้"
            style={{
              width: 36, height: 36, border: '1px solid var(--border)',
              background: '#fff', color: 'var(--danger)', borderRadius: 6, cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <i className="ri-delete-bin-line"></i>
          </button>
        )}
      </div>
      <div className="reorder-product-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div className="text-sm text-muted" style={{ fontSize: 12 }}>จำนวน</div>
        <input
          type="number"
          min={1}
          value={item.quantity}
          onChange={e => onChange({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
          style={{ width: 90, padding: '0.45rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, background: '#fff' }}
        />
      </div>
    </div>
  );
}

function SuccessPanel({
  orderId, synced, snippet, onClose,
}: { orderId: string; synced: boolean; snippet: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select & prompt user
    }
  };

  return (
    <div style={{ padding: '1.5rem 1.25rem', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: synced ? 'var(--success-light)' : 'var(--warning-light)',
        color: synced ? 'var(--success)' : '#d39e00',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1rem', fontSize: 32,
      }}>
        <i className={synced ? 'ri-checkbox-circle-line' : 'ri-time-line'}></i>
      </div>
      <h3 className="fw-700" style={{ fontSize: 17, marginBottom: 6, color: 'var(--text-dark)' }}>
        {synced ? 'บันทึก & sync เข้า Sheet สำเร็จ' : 'บันทึกแล้ว แต่ยังไม่ sync เข้า Sheet'}
      </h3>
      <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
        Order ID: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{orderId}</code>
      </p>

      {!synced && (
        <>
          <p className="text-sm" style={{ color: 'var(--text-dark)', marginBottom: 8 }}>
            ระบบยังเชื่อม Sheet ไม่ได้ — copy ข้อมูลแล้ววางใน Sheet ด้วยตนเอง:
          </p>
          <div style={{
            background: '#f8fafc', border: '1px solid var(--border)',
            padding: '0.6rem', borderRadius: 8, fontSize: 13,
            fontFamily: 'monospace', textAlign: 'left', whiteSpace: 'pre-wrap',
            marginBottom: 10, maxHeight: 180, overflowY: 'auto',
          }}>
            {snippet}
          </div>
          <button
            type="button"
            onClick={copy}
            className="btn btn-primary"
            style={{ marginBottom: 8 }}
          >
            <i className={copied ? 'ri-check-line' : 'ri-clipboard-line'}></i>
            {copied ? ' คัดลอกแล้ว' : ' คัดลอกข้อมูล'}
          </button>
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={onClose}
          className="btn"
          style={{ background: '#fff', border: '1px solid var(--border)', padding: '0.55rem 1.2rem' }}
        >
          ปิด
        </button>
      </div>
    </div>
  );
}

function buildSheetSnippet({
  customerName, customerPhone, address, items, channel, totalPrice,
}: {
  customerName: string; customerPhone: string; address: string;
  items: LineItem[]; channel: string; totalPrice: number;
}): string {
  const date = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const products = items
    .filter(i => i.name.trim())
    .map(i => `${i.name} x${i.quantity}`)
    .join(', ');
  const total = totalPrice;
  return [
    `วันที่: ${date}`,
    `ชื่อ: ${customerName}`,
    `เบอร์: ${customerPhone}`,
    `ที่อยู่: ${address}`,
    `สินค้า: ${products}`,
    `ยอดรวม: ${total.toLocaleString('th-TH')}`,
    `ช่องทาง: ${channel}`,
    `ที่มา: CRM_REORDER`,
  ].join('\n');
}
