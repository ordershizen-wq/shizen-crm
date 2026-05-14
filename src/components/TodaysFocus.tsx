'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { TodaysFocusData } from '@/lib/todaysFocus';

const COLLAPSE_KEY = 'shizen.todaysFocus.collapsed';

export default function TodaysFocus({ data, userName }: { data: TodaysFocusData; userName: string }) {
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

  const totalItems = data.vipAtRiskTotal + data.overdueTasksTotal + data.stuckOrdersTotal;

  if (data.isAllClear) {
    return (
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          padding: '1.1rem 1.4rem',
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
          <i className="ri-checkbox-circle-line"></i>
        </div>
        <div>
          <div className="fw-600" style={{ fontSize: 15, color: 'var(--text-dark)', marginBottom: 2 }}>
            ทุกอย่างเรียบร้อย {userName}
          </div>
          <div className="text-sm text-muted">
            ไม่มี task ค้าง · ลูกค้าทุกคนยัง active · ออเดอร์ flow ปกติ
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        padding: 0,
        marginBottom: '1.5rem',
        overflow: 'hidden',
      }}
    >
      {/* Header — clickable to toggle */}
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
            style={{ color: 'var(--text-muted)', fontSize: 18, flexShrink: 0 }}
          ></i>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="fw-600" style={{ fontSize: collapsed ? 14 : 15, color: 'var(--text-dark)', fontFamily: "'Trirong', serif", letterSpacing: '-0.01em' }}>
              งานวันนี้ของคุณ
            </div>
            {!collapsed && (
              <div className="text-sm text-muted" style={{ marginTop: 2, fontSize: 12 }}>
                สิ่งที่ต้องจัดการก่อนสิ่งอื่น
              </div>
            )}
            {collapsed && (
              <div className="text-sm text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                {data.vipAtRiskTotal > 0 && <span style={{ color: 'var(--danger)', marginRight: 10 }}>VIP {data.vipAtRiskTotal}</span>}
                {data.overdueTasksTotal > 0 && <span style={{ color: 'var(--warning)', marginRight: 10 }}>เกิน {data.overdueTasksTotal}</span>}
                {data.stuckOrdersTotal > 0 && <span style={{ color: 'var(--info)' }}>ค้าง {data.stuckOrdersTotal}</span>}
              </div>
            )}
          </div>
        </div>
        <TotalBadge total={totalItems} />
      </button>

      {hydrated && collapsed ? null : (
      <div style={{ padding: '0.5rem 0' }}>
        {/* VIP at risk */}
        {data.vipAtRiskTotal > 0 && (
          <Section
            color="var(--danger)"
            bgTint="var(--danger-light)"
            icon="ri-alert-line"
            title="ลูกค้า VIP/A ใกล้หลุดเกรด"
            count={data.vipAtRiskTotal}
            description="เคยซื้อหลายครั้ง แต่ห่างไป 30+ วัน — รีบติดต่อก่อนเสียลูกค้า"
          >
            {data.vipAtRisk.map(c => (
              <FocusRow
                key={c.phone}
                href={`/customers/${c.phone}`}
                primary={c.name}
                secondary={
                  <>
                    ห่างไป <strong>{c.daysSince} วัน</strong> · ยอดสะสม ฿
                    {c.totalSpent.toLocaleString('th-TH', { maximumFractionDigits: 0 })} · {c.orderCount} ออเดอร์
                  </>
                }
                cta="ติดต่อ"
                accent="#dc2626"
              />
            ))}
            {data.vipAtRiskTotal > data.vipAtRisk.length && (
              <ViewAllRow href="/customers?stage=AT_RISK" count={data.vipAtRiskTotal - data.vipAtRisk.length} />
            )}
          </Section>
        )}

        {/* Overdue tasks */}
        {data.overdueTasksTotal > 0 && (
          <Section
            color="var(--warning)"
            bgTint="var(--warning-light)"
            icon="ri-time-line"
            title="งานเกินกำหนด"
            count={data.overdueTasksTotal}
            description="งานที่ควรทำเสร็จไปแล้ว"
          >
            {data.overdueTasks.map(t => (
              <FocusRow
                key={t.id}
                href={`/customers/${t.customerPhone}?tab=tasks`}
                primary={
                  <>
                    {t.title}
                    <span style={{
                      marginLeft: 6, fontSize: 11, color: '#dc2626', fontWeight: 700,
                    }}>
                      เลย {t.daysOverdue} วัน
                    </span>
                  </>
                }
                secondary={<>ของ <strong>{t.customerName}</strong>{t.assignedToName && ` · ${t.assignedToName}`}</>}
                cta="ทำตอนนี้"
                accent="#f59e0b"
              />
            ))}
            {data.overdueTasksTotal > data.overdueTasks.length && (
              <ViewAllRow href="/tasks?status=overdue" count={data.overdueTasksTotal - data.overdueTasks.length} />
            )}
          </Section>
        )}

        {/* Stuck orders */}
        {data.stuckOrdersTotal > 0 && (
          <Section
            color="var(--info)"
            bgTint="var(--info-light)"
            icon="ri-archive-2-line"
            title="ออเดอร์ค้างเกิน 24 ชั่วโมง"
            count={data.stuckOrdersTotal}
            description="ออเดอร์ที่ยังไม่ได้ดำเนินการ — เช็คชำระ/จัดส่ง"
          >
            {data.stuckOrders.map(o => (
              <FocusRow
                key={o.id}
                href={o.phone ? `/customers/${o.phone}` : `/orders?status=PENDING`}
                primary={o.customerName ?? '(ไม่ระบุชื่อ)'}
                secondary={
                  <>
                    ค้างมา <strong>{o.hoursSince} ชม.</strong> · ฿
                    {o.totalPrice.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    {o.salesRepName && ` · ${o.salesRepName}`}
                  </>
                }
                cta="ดู"
                accent="#0ea5e9"
              />
            ))}
            {data.stuckOrdersTotal > data.stuckOrders.length && (
              <ViewAllRow href="/orders?status=PENDING" count={data.stuckOrdersTotal - data.stuckOrders.length} />
            )}
          </Section>
        )}
      </div>
      )}
    </div>
  );
}

function TotalBadge({ total }: { total: number }) {
  const color = total > 5 ? '#dc2626' : total > 0 ? '#f59e0b' : '#147a5e';
  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${color}33`,
      color,
      borderRadius: 999,
      padding: '0.3rem 0.85rem',
      fontSize: 13,
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {total} รายการ
    </div>
  );
}

function Section({
  color, bgTint, icon, title, count, description, children,
}: {
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
          <div className="fw-700" style={{ fontSize: 13, color: 'var(--text-dark)' }}>
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

function FocusRow({
  href, primary, secondary, cta, accent,
}: {
  href: string;
  primary: React.ReactNode;
  secondary: React.ReactNode;
  cta: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.65rem 1.25rem',
        borderBottom: '1px solid var(--border-light)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 120ms',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fw-600" style={{ fontSize: 13, color: 'var(--text-dark)', marginBottom: 2 }}>
          {primary}
        </div>
        <div className="text-sm text-muted" style={{ fontSize: 11 }}>
          {secondary}
        </div>
      </div>
      <span style={{
        background: accent,
        color: '#fff',
        borderRadius: 6,
        padding: '0.3rem 0.7rem',
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {cta} <i className="ri-arrow-right-line"></i>
      </span>
    </Link>
  );
}

function ViewAllRow({ href, count }: { href: string; count: number }) {
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
      + อีก {count} รายการ — ดูทั้งหมด →
    </Link>
  );
}
