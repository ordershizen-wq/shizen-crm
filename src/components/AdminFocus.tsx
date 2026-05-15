'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AdminFocusData } from '@/lib/todaysFocus';

const COLLAPSE_KEY = 'shizen.adminFocus.collapsed';

export default function AdminFocus({ data, userName }: { data: AdminFocusData; userName: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved === '1') setCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const totalItems = data.syncFailedCount + data.lowPerformersTotal + data.stuckOrdersTotal;

  if (data.isAllClear) {
    return (
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--success-light)', color: 'var(--success)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>
          <i className="ri-shield-check-line"></i>
        </div>
        <div>
          <div className="fw-600" style={{ fontSize: 15, color: 'var(--text-dark)', marginBottom: 2 }}>
            ระบบเรียบร้อย {userName}
          </div>
          <div className="text-sm text-muted">
            ไม่มี sync ค้าง · เซลส์ทุกคน on track · ออเดอร์ flow ปกติ
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      padding: 0,
      marginBottom: '1.5rem',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        style={{
          width: '100%',
          padding: collapsed ? '0.85rem 1.25rem' : '1rem 1.25rem',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-light)',
          background: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          border: 'none',
          borderTopLeftRadius: 11,
          borderTopRightRadius: 11,
          borderBottomLeftRadius: collapsed ? 11 : 0,
          borderBottomRightRadius: collapsed ? 11 : 0,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'padding 180ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
          <i
            className={collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'}
            style={{ color: 'var(--text-muted)', fontSize: 18, flexShrink: 0, transition: 'transform 180ms' }}
          ></i>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="fw-600" style={{
              fontSize: collapsed ? 14 : 15,
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em',
            }}>
              <span>ภาพรวมงานบริหาร</span>
              {collapsed && totalItems > 0 && (
                <span style={{
                  background: 'var(--danger)', color: '#fff',
                  borderRadius: 4, padding: '0 6px',
                  fontSize: 11, fontWeight: 600,
                }}>{totalItems}</span>
              )}
            </div>
            {!collapsed && (
              <div className="text-sm text-muted" style={{ marginTop: 2, fontSize: 12 }}>
                สิ่งที่ผู้ดูแลต้องตรวจสอบ (ไม่ใช่งานรายลูกค้า)
              </div>
            )}
            {collapsed && (
              <div className="text-sm text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                {data.syncFailedCount > 0 && <span style={{ color: 'var(--danger)', marginRight: 10 }}>sync {data.syncFailedCount}</span>}
                {data.lowPerformersTotal > 0 && <span style={{ color: 'var(--warning)', marginRight: 10 }}>เซลส์ {data.lowPerformersTotal}</span>}
                {data.stuckOrdersTotal > 0 && <span style={{ color: 'var(--info)' }}>ค้าง {data.stuckOrdersTotal}</span>}
              </div>
            )}
          </div>
        </div>
      </button>

      {hydrated && collapsed ? null : (
      <div style={{ padding: '0.5rem 0' }}>
        {/* Sync failed */}
        {data.syncFailedCount > 0 && (
          <Section
            color="var(--danger)"
            bgTint="var(--danger-light)"
            icon="ri-error-warning-line"
            title="ออเดอร์ sync ไป Sheet ล้มเหลว"
            count={data.syncFailedCount}
            description="ออเดอร์ที่ CRM สร้างแต่ยังไม่ถึง Sheet — packer ไม่เห็น"
          >
            {data.syncFailedSample.map(o => (
              <Link
                key={o.id}
                href="/admin/sync-failed"
                style={rowStyle}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fw-600" style={{ fontSize: 13 }}>
                    {o.customerName ?? '(ไม่ระบุชื่อ)'}
                  </div>
                  <div className="text-sm text-muted" style={{ fontSize: 11, color: '#dc2626' }}>
                    {(o.syncError ?? '').slice(0, 80)}
                  </div>
                </div>
                <CTA color="#dc2626" label="แก้ไข" />
              </Link>
            ))}
            <ViewAllRow href="/admin/sync-failed" label={`ดู ${data.syncFailedCount} รายการทั้งหมด`} />
          </Section>
        )}

        {/* Low performers */}
        {data.lowPerformersTotal > 0 && (
          <Section
            color="var(--warning)"
            bgTint="var(--warning-light)"
            icon="ri-line-chart-line"
            title="เซลส์ที่ยอดต่ำกว่าครึ่งของเป้า"
            count={data.lowPerformersTotal}
            description="คอยช่วย/coach เซลส์ที่ยังไม่ถึงครึ่งของเป้าเดือนนี้"
          >
            {data.lowPerformers.map(p => (
              <Link
                key={p.userId}
                href="/leaderboard"
                style={rowStyle}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fw-600" style={{ fontSize: 13 }}>
                    {p.fullName}
                    {p.teamName && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                        · {p.teamName}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted" style={{ fontSize: 11 }}>
                    ฿{p.totalRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })} / ฿{p.monthlyTarget.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    <span style={{ marginLeft: 6, color: '#dc2626', fontWeight: 700 }}>
                      {p.goalPercent.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <CTA color="#f59e0b" label="ดู" />
              </Link>
            ))}
          </Section>
        )}

        {/* Stuck orders (company-wide) */}
        {data.stuckOrdersTotal > 0 && (
          <Section
            color="var(--info)"
            bgTint="var(--info-light)"
            icon="ri-archive-2-line"
            title="ออเดอร์ค้างเกิน 24 ชั่วโมง (ทั้งบริษัท)"
            count={data.stuckOrdersTotal}
            description="ออเดอร์ที่ค้างเกินไป — ทีมแพคหรือเซลส์ต้อง follow up"
          >
            <Link href="/orders?status=PENDING" style={rowStyle}>
              <div style={{ flex: 1 }}>
                <div className="fw-600" style={{ fontSize: 13 }}>
                  ดูออเดอร์ PENDING ทั้งหมด
                </div>
                <div className="text-sm text-muted" style={{ fontSize: 11 }}>
                  filter ตาม status=PENDING
                </div>
              </div>
              <CTA color="#0ea5e9" label="ดูทั้งหมด" />
            </Link>
          </Section>
        )}
      </div>
      )}
    </div>
  );
}

function Section({ color, bgTint, icon, title, count, description, children }: {
  color: string; bgTint: string; icon: string; title: string;
  count: number; description: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <div style={{
        padding: '0.65rem 1.25rem',
        background: bgTint,
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        borderTop: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: '#fff', color, border: `1.5px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>
          <i className={icon}></i>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fw-700" style={{ fontSize: 13 }}>
            {title} <span style={{ color, marginLeft: 4 }}>({count})</span>
          </div>
          <div className="text-sm text-muted" style={{ fontSize: 11 }}>
            {description}
          </div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.65rem 1.25rem',
  borderBottom: '1px solid var(--border-light)',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'background 120ms',
};

function CTA({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      background: color,
      color: '#fff',
      borderRadius: 6,
      padding: '0.3rem 0.7rem',
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {label} <i className="ri-arrow-right-line"></i>
    </span>
  );
}

function ViewAllRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: '0.5rem 1.25rem',
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--primary)',
        textDecoration: 'none',
        borderBottom: '1px solid var(--border-light)',
        fontWeight: 600,
      }}
    >
      {label} →
    </Link>
  );
}
