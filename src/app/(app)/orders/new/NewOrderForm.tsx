'use client';

import { useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import { createOrder, lookupCustomer, type NewOrderProduct } from '../actions';
import {
  GENDER_OPTIONS, AGE_RANGES, PROVINCES, COUNTRIES, THAILAND,
  GENDER_VALUES, AGE_RANGE_VALUES, PROVINCE_VALUES, COUNTRY_VALUES,
} from '@/lib/demographics';
import { toYmd, MAX_BACKDATE_DAYS } from '@/lib/orderDate';
import { CHANNELS, matchChannel } from '@/lib/channels';

type Props = {
  productSuggestions: string[];   // ชื่อสินค้าที่ active ใน Product master
};

// คำนวณครั้งเดียวตอนโหลดโมดูล (ไม่เรียกใน render เพื่อเลี่ยง react-hooks/purity)
const TODAY_STR = toYmd(new Date());
const MIN_ORDER_DATE_STR = toYmd(new Date(Date.now() - MAX_BACKDATE_DAYS * 86400000));

type LineItem = { id: string; name: string; quantity: number };
let __id = 0;
const nextId = () => `n${++__id}`;

type CustomerState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'new' }
  | { status: 'existing'; orderCount: number };

export default function NewOrderForm({ productSuggestions }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ orderId: string; synced: boolean; isExisting: boolean; phone: string } | null>(null);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  // default = TIKTOK (ช่องทางหลักของธุรกิจ ~80% ของออเดอร์จริง)
  const [channel, setChannel] = useState<string>('TIKTOK');
  const [note, setNote] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [items, setItems] = useState<LineItem[]>([{ id: nextId(), name: '', quantity: 1 }]);
  const [customer, setCustomer] = useState<CustomerState>({ status: 'idle' });
  const [backdate, setBackdate] = useState(false);
  const [orderDate, setOrderDate] = useState(TODAY_STR);

  // ข้อมูลจำเป็น (สรุปใน Dashboard)
  const [gender, setGender] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [geoMode, setGeoMode] = useState<'TH' | 'INTL'>('TH');
  const [province, setProvince] = useState('');   // ในประเทศ
  const [country, setCountry] = useState('');      // ต่างประเทศ

  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPhone = useRef('');

  const geoOk = geoMode === 'TH' ? province !== '' : country !== '';
  const canSubmit =
    phone.trim().length >= 8 &&
    items.some(it => it.name.trim()) &&
    items.every(it => it.name.trim() === '' || it.quantity > 0) &&
    totalPrice > 0 &&
    gender !== '' && ageRange !== '' && geoOk &&
    orderDate !== '';

  const selectTH = () => { setGeoMode('TH'); setCountry(''); };
  const selectINTL = () => { setGeoMode('INTL'); setProvince(''); };

  const onPhoneChange = (val: string) => {
    // ในประเทศ = ตัวเลขล้วน / ต่างประเทศ = ตัวเลข + '+' นำหน้าได้ (รหัสประเทศ)
    const clean = geoMode === 'INTL'
      ? val.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
      : val.replace(/[^\d]/g, '');
    setPhone(clean);
    latestPhone.current = clean;
    setCustomer(clean.length >= 8 ? { status: 'checking' } : { status: 'idle' });
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (clean.length < 8) return;
    lookupTimer.current = setTimeout(async () => {
      const found = await lookupCustomer(clean);
      // กัน stale: ถ้าเบอร์เปลี่ยนไปแล้วระหว่างรอผล ให้ทิ้งผลเก่า
      if (latestPhone.current !== clean) return;
      if (found) {
        setCustomer({ status: 'existing', orderCount: found.orderCount });
        // autofill เฉพาะช่องที่ยังว่าง (ไม่ทับที่ผู้ใช้พิมพ์)
        setName(prev => prev || found.customerName || '');
        setAddress(prev => prev || found.address || '');
        {
          // จับคู่ค่า legacy (รวม alias เช่น FB → FB_PROFILE, TIKTOK_SHOP → TIKTOK)
          const matched = matchChannel(found.channel);
          if (matched) setChannel(matched);
        }
        // กรองผ่านชุดค่ามาตรฐานก่อน autofill กัน legacy data (เช่น "ญ") ที่ format ไม่ตรง
        // — ถ้าไม่ผ่านให้เป็น '' ให้ผู้ใช้เลือกใหม่ (ปุ่มจะไม่ไฮไลต์ + submit ไม่ได้เหมือนเดิม)
        const validGender = found.gender && GENDER_VALUES.has(found.gender) ? found.gender : '';
        const validAgeRange = found.ageRange && AGE_RANGE_VALUES.has(found.ageRange) ? found.ageRange : '';
        const validCountry = found.country && COUNTRY_VALUES.has(found.country) ? found.country : '';
        const validProvince = found.province && PROVINCE_VALUES.has(found.province) ? found.province : '';
        setGender(prev => prev || validGender);
        setAgeRange(prev => prev || validAgeRange);
        // ลูกค้าเก่าต่างประเทศ → สลับโหมด + เลือกประเทศให้ / ในประเทศ → เลือกจังหวัด
        // (validCountry กรองผ่าน COUNTRY_VALUES แล้วซึ่งไม่มี THAILAND อยู่ในเซ็ต จึงเทียบ !== THAILAND ไม่จำเป็นอีก
        //  แต่ country ที่กรองไม่ผ่าน → validCountry === '' → fallback โหมดในประเทศ ตามค่า default เดิมของฟอร์ม)
        if (validCountry) {
          setGeoMode('INTL');
          setCountry(prev => prev || validCountry);
        } else {
          setGeoMode('TH');
          setProvince(prev => prev || validProvince);
        }
      } else {
        setCustomer({ status: 'new' });
      }
    }, 450);
  };

  const addItem = () => setItems(prev => [...prev, { id: nextId(), name: '', quantity: 1 }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const products: NewOrderProduct[] = items
        .filter(it => it.name.trim())
        .map(it => ({ name: it.name.trim(), quantity: it.quantity }));

      const res = await createOrder({
        customerPhone: phone.trim(),
        customerName: name.trim(),
        address: address.trim(),
        channel,
        products,
        totalPrice,
        orderDate,
        gender,
        ageRange,
        country: geoMode === 'TH' ? THAILAND : country,
        province: geoMode === 'TH' ? province : '',
        note: note.trim() || undefined,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess({ orderId: res.orderId, synced: res.synced, isExisting: res.isExisting, phone: res.phone });
    });
  };

  const resetForm = () => {
    setPhone(''); setName(''); setAddress(''); setChannel('TIKTOK'); setNote('');
    setTotalPrice(0); setItems([{ id: nextId(), name: '', quantity: 1 }]);
    setCustomer({ status: 'idle' });
    setGender(''); setAgeRange(''); setProvince(''); setCountry(''); setGeoMode('TH');
    setBackdate(false); setOrderDate(TODAY_STR);
    setError(null); setSuccess(null);
  };

  if (success) {
    return (
      <div className="card p-4" style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1rem',
          background: success.synced ? 'var(--success-light)' : 'var(--warning-light)',
          color: success.synced ? 'var(--success)' : '#d39e00',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
        }}>
          <i className={success.synced ? 'ri-checkbox-circle-line' : 'ri-time-line'}></i>
        </div>
        <h2 className="fw-700" style={{ fontSize: 18, marginBottom: 4 }}>บันทึกออเดอร์สำเร็จ</h2>
        <p className="text-sm text-muted" style={{ marginBottom: 4 }}>
          {success.isExisting ? '🔁 รีออเดอร์ลูกค้าเก่า' : '✨ ลูกค้าใหม่'}
          {' · '}Order ID: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{success.orderId}</code>
        </p>
        <p className="text-sm" style={{ marginBottom: 20, color: success.synced ? 'var(--success)' : '#d39e00' }}>
          {success.synced ? 'ส่งเข้า Sheet แล้ว' : 'ยังไม่ได้ sync เข้า Sheet — ดูที่หน้า sync-failed'}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={resetForm} className="btn btn-primary">
            <i className="ri-add-line"></i> ลงออเดอร์อีก
          </button>
          <Link href={`/customers/${encodeURIComponent(success.phone)}`} className="btn" style={{ background: '#fff', border: '1px solid var(--border)' }}>
            <i className="ri-user-line"></i> ดูโปรไฟล์ลูกค้า
          </Link>
          <Link href="/orders" className="btn" style={{ background: '#fff', border: '1px solid var(--border)' }}>
            <i className="ri-list-check"></i> ดูออเดอร์ทั้งหมด
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4" style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* โหมด: ในประเทศ / ต่างประเทศ */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={selectTH}
          style={modeBtnStyle(geoMode === 'TH')}
        >
          🇹🇭 ในประเทศ
        </button>
        <button
          type="button"
          onClick={selectINTL}
          style={modeBtnStyle(geoMode === 'INTL')}
        >
          🌏 ต่างประเทศ
        </button>
      </div>

      {/* เบอร์ลูกค้า */}
      <Label icon="ri-phone-line" required>เบอร์ลูกค้า</Label>
      <input
        type="tel"
        inputMode={geoMode === 'INTL' ? 'tel' : 'numeric'}
        value={phone}
        onChange={e => onPhoneChange(e.target.value)}
        placeholder={geoMode === 'INTL' ? '+65 8123 4567 (มีรหัสประเทศ)' : '08XXXXXXXX'}
        style={inputStyle}
      />
      <CustomerHint state={customer} />

      {/* ชื่อ */}
      <Label icon="ri-user-line">ชื่อลูกค้า</Label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อ-นามสกุล" style={inputStyle} />

      {/* เพศ (จำเป็น) */}
      <Label icon="ri-user-heart-line" required>เพศ</Label>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
        {GENDER_OPTIONS.map(g => {
          const active = g.value === gender;
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => setGender(g.value)}
              style={{
                flex: 1, padding: '0.6rem', borderRadius: 8,
                border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                background: active ? 'var(--primary)' : '#fff',
                color: active ? '#fff' : 'var(--text-dark)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* ช่วงอายุ + จังหวัด (จำเป็น) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <Label icon="ri-cake-2-line" required>ช่วงอายุ</Label>
          <select value={ageRange} onChange={e => setAgeRange(e.target.value)} style={selectStyle}>
            <option value="">— เลือก —</option>
            {AGE_RANGES.map(a => <option key={a} value={a}>{a} ปี</option>)}
          </select>
        </div>
        <div>
          {geoMode === 'TH' ? (
            <>
              <Label icon="ri-map-pin-line" required>จังหวัด</Label>
              <select value={province} onChange={e => setProvince(e.target.value)} style={selectStyle}>
                <option value="">— เลือก —</option>
                {PROVINCES.map(pv => <option key={pv} value={pv}>{pv}</option>)}
              </select>
            </>
          ) : (
            <>
              <Label icon="ri-earth-line" required>ประเทศ</Label>
              <select value={country} onChange={e => setCountry(e.target.value)} style={selectStyle}>
                <option value="">— เลือก —</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {/* สินค้า */}
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
        <button type="button" onClick={addItem} style={{
          padding: '0.6rem', border: '1.5px dashed var(--primary)', background: 'transparent',
          color: 'var(--primary)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <i className="ri-add-line"></i> เพิ่มสินค้า
        </button>
      </div>

      {/* ยอดรวม */}
      <Label icon="ri-money-dollar-circle-line">ยอดรวมทั้งออเดอร์ (฿)</Label>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={totalPrice || ''}
        onChange={e => setTotalPrice(Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
        placeholder="0"
        style={{ ...inputStyle, fontSize: 18, fontWeight: 700 }}
      />

      {/* ที่อยู่ */}
      <Label icon="ri-map-pin-line">ที่อยู่จัดส่ง</Label>
      <textarea
        value={address}
        onChange={e => setAddress(e.target.value)}
        rows={2}
        placeholder="ที่อยู่ลูกค้า..."
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
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
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => { setBackdate(false); setOrderDate(TODAY_STR); }}
            style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: -8, marginBottom: '1rem' }}
          >
            ใช้วันนี้แทน
          </button>
        </>
      )}

      {/* ช่องทาง */}
      <Label icon="ri-chat-3-line">ช่องทาง</Label>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {CHANNELS.map(c => {
          const active = c.value === channel;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setChannel(c.value)}
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

      {/* หมายเหตุ */}
      <Label icon="ri-sticky-note-line">หมายเหตุ (ออปชัน)</Label>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="โน้ตเพิ่มเติม..." style={inputStyle} />

      {error && (
        <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: 6, fontSize: 13, margin: '0.5rem 0' }}>
          <i className="ri-error-warning-line"></i> {error}
        </div>
      )}

      {/* Footer */}
      <div className="flex-between" style={{ alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
        <div>
          <div className="text-sm text-muted">ยอดรวม</div>
          <div className="fw-700" style={{ fontSize: 22, color: 'var(--primary)' }}>
            ฿{totalPrice.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || pending}
          className="btn btn-primary"
          style={{ padding: '0.7rem 1.4rem', fontSize: 15, opacity: canSubmit && !pending ? 1 : 0.6 }}
        >
          {pending
            ? (<><i className="ri-loader-4-line ri-spin"></i> กำลังบันทึก...</>)
            : (<><i className="ri-save-line"></i> บันทึกออเดอร์</>)}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.65rem', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 15, marginBottom: '1rem', background: '#fff',
};
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 15, background: '#fff',
};

function modeBtnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '0.6rem', borderRadius: 8,
    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'var(--primary)' : '#fff',
    color: active ? '#fff' : 'var(--text-dark)',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  };
}

function Label({ icon, children, required }: { icon: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="fw-600 text-sm" style={{ color: 'var(--text-dark)', marginBottom: 6 }}>
      <i className={icon}></i> {children}
      {required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
    </div>
  );
}

function CustomerHint({ state }: { state: CustomerState }) {
  if (state.status === 'idle') return <div style={{ marginTop: -8, marginBottom: '1rem' }} />;
  let content: React.ReactNode;
  if (state.status === 'checking') {
    content = <span className="text-muted"><i className="ri-loader-4-line ri-spin"></i> กำลังตรวจสอบ...</span>;
  } else if (state.status === 'new') {
    content = <span style={{ color: '#0284c7' }}><i className="ri-user-add-line"></i> ลูกค้าใหม่ — ยังไม่เคยมีในระบบ</span>;
  } else {
    content = <span style={{ color: '#147a5e' }}><i className="ri-repeat-line"></i> ลูกค้าเก่า · มี {state.orderCount} ออเดอร์ (จะบันทึกเป็นรีออเดอร์)</span>;
  }
  return <div style={{ fontSize: 13, fontWeight: 600, marginTop: -8, marginBottom: '1rem' }}>{content}</div>;
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
  const listId = `np-suggest-${index}`;
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 10, padding: '0.6rem',
      border: '1px solid var(--border-light)', display: 'flex', gap: '0.4rem', alignItems: 'center',
    }}>
      <input
        list={listId}
        value={item.name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder="ชื่อสินค้า"
        style={{ flex: 1, padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, background: '#fff' }}
      />
      <datalist id={listId}>
        {suggestions.map(s => <option key={s} value={s} />)}
      </datalist>
      <input
        type="number"
        min={1}
        value={item.quantity}
        onChange={e => onChange({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
        aria-label="จำนวน"
        style={{ width: 72, padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, background: '#fff', textAlign: 'center' }}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="ลบสินค้านี้"
          style={{ width: 36, height: 36, border: '1px solid var(--border)', background: '#fff', color: 'var(--danger)', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
        >
          <i className="ri-delete-bin-line"></i>
        </button>
      )}
    </div>
  );
}
