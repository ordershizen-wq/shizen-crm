'use client';

import { useState, useTransition } from 'react';
import { upsertProduct, toggleProductActive, deleteProduct } from './actions';

type Product = {
  id: string; name: string; shortDesc: string | null;
  targetProblems: unknown; contraindications: unknown;
  gradeMatch: string; isActive: boolean; sortOrder: number;
};

const PROBLEM_PRESETS = [
  'ลดน้ำหนัก', 'เผาผลาญช้า', 'คุมหิว', 'ชอบแป้ง/น้ำตาล', 'สะสมไขมันง่าย',
  'ท้องผูก', 'ดีท็อกซ์', 'ไขมันพอกตับ',
  'เพิ่มพลัง', 'เหนื่อยง่าย', 'ออกกำลังกาย', 'ทำงานหนัก', 'เพิ่มกล้ามเนื้อ', 'หุ่นหย่อนคล้อย',
  'นอนไม่หลับ', 'เครียด', 'วิตกกังวล',
  'เบาหวาน', 'ความดันสูง', 'ไขมันในเลือดสูง', 'ไทรอยด์', 'ข้อเข่าเสื่อม',
  'ซ่อมแซมร่าง', 'สมาธิสั้น',
];

const CONTRA_PRESETS = [
  'ตั้งครรภ์', 'ให้นมบุตร', 'โรคหัวใจ', 'ความดันสูง', 'โรคไต', 'นิ่วในไต', 'ภูมิแพ้',
];

const GRADE_OPTIONS = [
  { value: 'ALL', label: 'เหมาะทุกเกรด' },
  { value: 'A',   label: 'เกรด A เท่านั้น' },
  { value: 'A,B', label: 'เกรด A และ B' },
  { value: 'B',   label: 'เกรด B เท่านั้น' },
  { value: 'B,C', label: 'เกรด B และ C' },
  { value: 'C',   label: 'เกรด C เท่านั้น' },
];

const GRADE_COLOR: Record<string, { color: string; bg: string }> = {
  ALL:  { color: '#1F6F5F', bg: '#E6F4EE' },
  'A':  { color: '#2FA084', bg: '#E6F4EE' },
  'A,B':{ color: '#2FA084', bg: '#E6F4EE' },
  'B':  { color: '#f59e0b', bg: '#fef3c7' },
  'B,C':{ color: '#f59e0b', bg: '#fef3c7' },
  'C':  { color: '#ef4444', bg: '#fee2e2' },
};

const EMPTY_FORM = {
  id: '', name: '', shortDesc: '',
  targetProblems: [] as string[],
  contraindications: [] as string[],
  gradeMatch: 'ALL', sortOrder: 0,
};

function toArr(v: unknown): string[] {
  return Array.isArray(v) ? v as string[] : [];
}

export default function ProductManager({
  initialProducts, isAdmin,
}: {
  initialProducts: Product[];
  isAdmin: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState('');

  function openAdd() {
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMsg('');
  }

  function openEdit(p: Product) {
    setForm({
      id: p.id, name: p.name, shortDesc: p.shortDesc ?? '',
      targetProblems: toArr(p.targetProblems),
      contraindications: toArr(p.contraindications),
      gradeMatch: p.gradeMatch, sortOrder: p.sortOrder,
    });
    setShowForm(true);
    setMsg('');
  }

  function toggleTag(arr: string[], tag: string): string[] {
    return arr.includes(tag) ? arr.filter(t => t !== tag) : [...arr, tag];
  }

  function handleSave() {
    startTransition(async () => {
      await upsertProduct(form);
      setShowForm(false);
      setMsg('บันทึกแล้ว');
      window.location.reload();
    });
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleProductActive(id);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
    });
  }

  function handleDelete(id: string) {
    if (!confirm('ลบสินค้านี้?')) return;
    startTransition(async () => {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setShowForm(false);
    });
  }

  const activeProducts = products.filter(p => p.isActive);
  const inactiveProducts = products.filter(p => !p.isActive);

  return (
    <>
      {/* Add button (admin) */}
      {isAdmin && (
        <div style={{ marginBottom: '1.25rem' }}>
          <button onClick={openAdd} className="btn btn-primary">
            <i className="ri-add-line"></i> เพิ่มสินค้าใหม่
          </button>
          {msg && <span style={{ marginLeft: '1rem', color: 'var(--success)', fontSize: 13 }}><i className="ri-check-line"></i> {msg}</span>}
        </div>
      )}

      {/* Product grid — 1 col mobile, 2 col tablet, 3 col desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {activeProducts.map(p => (
          <ProductCard key={p.id} p={p} isAdmin={isAdmin} onEdit={openEdit} onToggle={handleToggle} />
        ))}
      </div>

      {/* Inactive products */}
      {isAdmin && inactiveProducts.length > 0 && (
        <div>
          <p className="text-sm text-muted fw-600 mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
            <i className="ri-eye-off-line"></i> ซ่อนอยู่ ({inactiveProducts.length})
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {inactiveProducts.map(p => (
              <ProductCard key={p.id} p={p} isAdmin={isAdmin} onEdit={openEdit} onToggle={handleToggle} />
            ))}
          </div>
        </div>
      )}

      {/* ── Modal Form ── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0',
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div style={{
            background: '#fff',
            borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 600,
            maxHeight: '92vh', overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
          }}>
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0', margin: '0 auto 1.5rem' }} />

            <div className="flex-between mb-4">
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-dark)' }}>
                <i className="ri-archive-2-line" style={{ color: 'var(--primary)', marginRight: 6 }}></i>
                {form.id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>ชื่อสินค้า *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="form-control"
                  placeholder="เช่น My Mild, Sereniz..."
                />
              </div>

              {/* Short desc */}
              <div>
                <label style={labelStyle}>คำอธิบายสั้น</label>
                <input
                  value={form.shortDesc}
                  onChange={e => setForm(f => ({ ...f, shortDesc: e.target.value }))}
                  className="form-control"
                  placeholder="เช่น สายเร่งเผาผลาญ / คุมหิว"
                />
              </div>

              {/* Grade match */}
              <div>
                <label style={labelStyle}>เหมาะกับเกรด</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {GRADE_OPTIONS.map(g => {
                    const active = form.gradeMatch === g.value;
                    const gc = GRADE_COLOR[g.value];
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, gradeMatch: g.value }))}
                        style={{
                          padding: '0.35rem 0.8rem', borderRadius: '9999px', cursor: 'pointer',
                          border: `1.5px solid ${active ? gc.color : 'var(--border-light)'}`,
                          background: active ? gc.bg : 'transparent',
                          color: active ? gc.color : 'var(--text-muted)',
                          fontSize: 12.5, fontWeight: active ? 700 : 400,
                          transition: 'all 150ms',
                        }}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target problems */}
              <div>
                <label style={labelStyle}>ปัญหาที่แก้ได้ <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(ใช้สำหรับแนะนำสินค้าให้ลูกค้า)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {PROBLEM_PRESETS.map(tag => {
                    const active = form.targetProblems.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, targetProblems: toggleTag(f.targetProblems, tag) }))}
                        style={{
                          padding: '0.3rem 0.7rem', borderRadius: '9999px', cursor: 'pointer',
                          border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border-light)'}`,
                          background: active ? 'var(--primary-light)' : 'transparent',
                          color: active ? 'var(--primary)' : 'var(--text-muted)',
                          fontSize: 12.5, fontWeight: active ? 600 : 400,
                          transition: 'all 150ms',
                        }}
                      >
                        {active ? <><i className="ri-check-line"></i> </> : '+ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {form.targetProblems.length > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: '0.4rem' }}>
                    เลือกแล้ว {form.targetProblems.length} รายการ
                  </p>
                )}
              </div>

              {/* Contraindications */}
              <div>
                <label style={labelStyle}>ข้อควรระวัง / ห้ามใช้</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {CONTRA_PRESETS.map(tag => {
                    const active = form.contraindications.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, contraindications: toggleTag(f.contraindications, tag) }))}
                        style={{
                          padding: '0.3rem 0.7rem', borderRadius: '9999px', cursor: 'pointer',
                          border: `1.5px solid ${active ? '#ef4444' : 'var(--border-light)'}`,
                          background: active ? '#fee2e2' : 'transparent',
                          color: active ? '#ef4444' : 'var(--text-muted)',
                          fontSize: 12.5, fontWeight: active ? 600 : 400,
                          transition: 'all 150ms',
                        }}
                      >
                        {active ? <><i className="ri-close-circle-line"></i> </> : '+ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || isPending}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {isPending ? <><i className="ri-loader-4-line"></i> กำลังบันทึก...</> : <><i className="ri-save-line"></i> บันทึก</>}
              </button>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">
                ยกเลิก
              </button>
              {form.id && (
                <button onClick={() => handleDelete(form.id)} className="btn btn-danger" disabled={isPending}>
                  <i className="ri-delete-bin-line"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProductCard({ p, isAdmin, onEdit, onToggle }: {
  p: Product; isAdmin: boolean;
  onEdit: (p: Product) => void;
  onToggle: (id: string) => void;
}) {
  const problems = toArr(p.targetProblems);
  const contras = toArr(p.contraindications);
  const gc = GRADE_COLOR[p.gradeMatch] ?? GRADE_COLOR.ALL;
  const gradeLabel = GRADE_OPTIONS.find(g => g.value === p.gradeMatch)?.label ?? p.gradeMatch;

  return (
    <div style={{
      background: p.isActive ? '#fff' : '#f8fafc',
      border: `1.5px solid ${p.isActive ? 'var(--border-light)' : '#e2e8f0'}`,
      borderRadius: 14,
      padding: '1.1rem',
      opacity: p.isActive ? 1 : 0.65,
      transition: 'all 200ms',
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      {/* Header */}
      <div className="flex-between" style={{ gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--text-dark)' }}>{p.name}</div>
          {p.shortDesc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.shortDesc}</div>}
        </div>
        <span style={{
          background: gc.bg, color: gc.color,
          fontSize: 11, fontWeight: 700, padding: '0.2rem 0.6rem',
          borderRadius: '9999px', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {gradeLabel}
        </span>
      </div>

      {/* Problem tags */}
      {problems.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {problems.slice(0, 6).map(tag => (
            <span key={tag} style={{
              background: 'var(--primary-light)', color: 'var(--primary)',
              fontSize: 11.5, padding: '0.15rem 0.55rem', borderRadius: '9999px', fontWeight: 500,
            }}>
              {tag}
            </span>
          ))}
          {problems.length > 6 && (
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>+{problems.length - 6}</span>
          )}
        </div>
      )}

      {/* Contraindications */}
      {contras.length > 0 && (
        <div style={{ fontSize: 11.5, color: '#ef4444', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
          <i className="ri-alert-line"></i>
          {contras.map(c => (
            <span key={c} style={{ background: '#fee2e2', padding: '0.1rem 0.45rem', borderRadius: '9999px' }}>{c}</span>
          ))}
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)', marginTop: 'auto' }}>
          <button
            onClick={() => onEdit(p)}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: 12.5, height: 36 }}
          >
            <i className="ri-edit-line"></i> แก้ไข
          </button>
          <button
            onClick={() => onToggle(p.id)}
            style={{
              height: 36, padding: '0 0.75rem', borderRadius: 8, border: 'none',
              background: p.isActive ? '#fee2e2' : '#d1fae5',
              color: p.isActive ? '#ef4444' : '#10b981',
              cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <i className={p.isActive ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
            {p.isActive ? 'ซ่อน' : 'แสดง'}
          </button>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'var(--text-body)', marginBottom: '0.4rem',
};
