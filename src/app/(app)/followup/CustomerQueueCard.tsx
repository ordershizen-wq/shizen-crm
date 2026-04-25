'use client';

import { useState } from 'react';
import Link from 'next/link';
import QuickFollowUpForm from './QuickFollowUpForm';

type Props = {
  phone: string;
  name: string;
  daysSince: number;
  orderCount: number;
  totalSpent: number;
  stageBadge: { label: string; cls: string };
  sheetUserId: string;
  scheduledNote?: string | null;
};

export default function CustomerQueueCard({
  phone, name, daysSince, orderCount, totalSpent, stageBadge, sheetUserId, scheduledNote,
}: Props) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div
      style={{
        background: done ? 'var(--success-light)' : '#fff',
        border: `1.5px solid ${done ? 'var(--success)' : 'var(--border-light)'}`,
        borderRadius: 12,
        padding: '1rem 1.25rem',
        transition: 'all 0.2s',
        opacity: done ? 0.7 : 1,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--blue-light)', color: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16, flexShrink: 0,
        }}>
          {name.charAt(0)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href={`/customers/${phone}`}
              style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 14, textDecoration: 'none' }}
            >
              {name}
            </Link>
            <span className={`status-badge stage-${stageBadge.cls}`} style={{ fontSize: 11, padding: '0.2rem 0.6rem' }}>
              {stageBadge.label}
            </span>
            {done && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}><i className="ri-check-line"></i> บันทึกแล้ว</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            <i className="ri-phone-line"></i> {phone}
            <span style={{ margin: '0 0.4rem' }}>·</span>
            <i className="ri-calendar-line"></i> {daysSince} วันที่แล้ว
            <span style={{ margin: '0 0.4rem' }}>·</span>
            <i className="ri-shopping-bag-3-line"></i> {orderCount} ครั้ง
            <span style={{ margin: '0 0.4rem' }}>·</span>
            <i className="ri-money-dollar-circle-line"></i> ฿{totalSpent.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
          </div>
          {scheduledNote && (
            <div style={{ fontSize: 12, color: 'var(--orange)', marginTop: 3 }}>
              <i className="ri-alarm-line"></i> {scheduledNote}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {!done && (
            <button
              onClick={() => setOpen(v => !v)}
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '0.35rem 0.75rem' }}
            >
              <i className={open ? 'ri-close-line' : 'ri-edit-line'}></i>
              {open ? ' ปิด' : ' บันทึก'}
            </button>
          )}
          <Link
            href={`/customers/${phone}`}
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '0.35rem 0.75rem' }}
          >
            <i className="ri-user-line"></i> โปรไฟล์
          </Link>
        </div>
      </div>

      {/* Inline form */}
      {open && !done && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
          <QuickFollowUpForm
            customerPhone={phone}
            sheetUserId={sheetUserId}
            onDone={() => { setDone(true); setOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}
