'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { searchAll, type SearchResult } from '@/app/actions/search';

const EMPTY: SearchResult = { customers: [], orders: [] };

const STATUS_LABEL: Record<string, string> = {
  PAID: 'ชำระแล้ว',
  PACKED: 'แพ็คแล้ว',
  COD: 'COD',
  PENDING: 'รอดำเนินการ',
  RETURNED: 'ตีกลับ',
  CANCELLED: 'ยกเลิก',
  OTHER: 'อื่นๆ',
};

export default function HeaderSearch({ placeholder }: { placeholder: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>(EMPTY);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const r = await searchAll(q);
        setResults(r);
        setActiveIndex(-1);
      });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Click outside → close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Keyboard shortcuts: "/" to focus, Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const allLinks = [
    ...results.customers.map(c => ({ type: 'customer' as const, href: `/customers/${c.phone}` })),
    ...results.orders.map(o => ({ type: 'order' as const, href: o.phone ? `/customers/${o.phone}` : `/orders` })),
  ];

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, allLinks.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeIndex >= 0 ? allLinks[activeIndex] : null;
      if (target) {
        setOpen(false);
        router.push(target.href);
      } else if (query.trim().length >= 2) {
        // Fallback: ไปหน้า customers พร้อม query
        setOpen(false);
        router.push(`/customers?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const hasResults = results.customers.length > 0 || results.orders.length > 0;

  return (
    <div className="header-search" ref={containerRef} style={{ position: 'relative', flex: 1 }}>
      <i className="ri-search-line"></i>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        autoComplete="off"
      />

      {open && query.trim().length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            border: '1px solid var(--border-light)',
            zIndex: 1000,
            maxHeight: '70vh',
            overflowY: 'auto',
          }}
        >
          {!hasResults ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <i className="ri-search-line"></i> ไม่พบ "{query}"
            </div>
          ) : (
            <>
              {results.customers.length > 0 && (
                <div>
                  <div style={sectionHeader}>
                    <i className="ri-user-line"></i> ลูกค้า ({results.customers.length})
                  </div>
                  {results.customers.map((c, idx) => {
                    const i = idx;
                    const active = activeIndex === i;
                    return (
                      <Link
                        key={c.phone}
                        href={`/customers/${c.phone}`}
                        onClick={() => setOpen(false)}
                        style={{ ...rowStyle, background: active ? 'var(--primary-tint)' : '#fff' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="fw-600" style={{ fontSize: 14, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name || 'ไม่ระบุชื่อ'}
                          </div>
                          <div className="text-sm text-muted">
                            <i className="ri-phone-line"></i> {c.phone}
                          </div>
                        </div>
                        <span style={badgeStyle}>{c.orderCount} ออเดอร์</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {results.orders.length > 0 && (
                <div>
                  <div style={sectionHeader}>
                    <i className="ri-shopping-bag-3-line"></i> ออเดอร์ ({results.orders.length})
                  </div>
                  {results.orders.map((o, idx) => {
                    const i = results.customers.length + idx;
                    const active = activeIndex === i;
                    return (
                      <Link
                        key={o.id}
                        href={o.phone ? `/customers/${o.phone}` : `/orders`}
                        onClick={() => setOpen(false)}
                        style={{ ...rowStyle, background: active ? 'var(--primary-tint)' : '#fff' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="fw-600" style={{ fontSize: 13, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.customerName || '(ไม่ระบุชื่อ)'}
                            <span style={{
                              marginLeft: 6,
                              fontSize: 10,
                              padding: '1px 6px',
                              borderRadius: 999,
                              background: o.source === 'CRM_REORDER' ? 'rgba(47,160,132,0.15)' : 'rgba(14,165,233,0.15)',
                              color: o.source === 'CRM_REORDER' ? '#147a5e' : '#0284c7',
                              fontWeight: 700,
                            }}>
                              {o.source === 'CRM_REORDER' ? 'รีออเดอร์' : 'ลูกค้าใหม่'}
                            </span>
                          </div>
                          <div className="text-sm text-muted" style={{ fontSize: 11 }}>
                            {STATUS_LABEL[o.status] ?? o.status} · {new Date(o.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                        <span className="fw-700" style={{ color: 'var(--primary)', fontSize: 13 }}>
                          ฿{o.totalPrice.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div style={{
                padding: '8px 12px',
                borderTop: '1px solid var(--border-light)',
                fontSize: 11,
                color: 'var(--text-muted)',
                background: '#f8fafc',
                display: 'flex',
                gap: '0.75rem',
              }}>
                <span>↑↓ เลือก</span>
                <span>↵ เปิด</span>
                <span>Esc ปิด</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const sectionHeader: React.CSSProperties = {
  padding: '8px 12px 4px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.6rem 0.85rem',
  textDecoration: 'none',
  borderBottom: '1px solid var(--border-light)',
  transition: 'background 120ms',
  color: 'inherit',
};

const badgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: 999,
  background: 'var(--bg-app)',
  color: 'var(--text-muted)',
  flexShrink: 0,
};
