'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createTaskFromSuggestion } from './actions';
import type { TaskSuggestion } from '@/lib/tasks';

const STAGE_STYLE: Record<'AT_RISK' | 'LAPSED', { color: string; bg: string; icon: string; label: string }> = {
  AT_RISK: { color: 'var(--danger)', bg: 'var(--danger-light)', icon: 'ri-alarm-warning-line', label: 'ต้องรีออเดอร์' },
  LAPSED:  { color: '#6f42c1',        bg: 'var(--purple-light)', icon: 'ri-time-line',          label: 'ห่างหายไปนาน' },
};

const INITIAL_SHOW = 5;

export default function TaskSuggestionsSection({ suggestions }: { suggestions: TaskSuggestion[] }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [, startTransition] = useTransition();

  const visible = suggestions.filter(s => !dismissed.has(s.phone));
  if (visible.length === 0) return null;
  const shown = showAll ? visible : visible.slice(0, INITIAL_SHOW);
  const remaining = visible.length - shown.length;

  const handleAccept = (s: TaskSuggestion) => {
    setPendingPhone(s.phone);
    startTransition(async () => {
      try {
        await createTaskFromSuggestion({
          customerPhone: s.phone,
          customerName: s.name,
          stage: s.stage as 'AT_RISK' | 'LAPSED',
        });
        router.refresh();
      } finally {
        setPendingPhone(null);
      }
    });
  };

  const handleDismiss = (phone: string) => {
    setDismissed(prev => { const n = new Set(prev); n.add(phone); return n; });
  };

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <i className="ri-lightbulb-flash-line" style={{ fontSize: 18, color: 'var(--primary)' }}></i>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>
          ลูกค้าที่ควรติดตามวันนี้
        </h2>
        <span style={{
          background: 'var(--primary)', color: '#fff', borderRadius: 999,
          fontSize: 11, padding: '0 8px', height: 20, display: 'inline-flex', alignItems: 'center', fontWeight: 700,
        }}>{visible.length}</span>
      </div>
      <p className="text-sm text-muted" style={{ marginBottom: '0.75rem', marginLeft: 26 }}>
        ระบบเสนอจาก stage ลูกค้า — กด "สร้างเป็นงาน" เพื่อเพิ่มเข้าคิวงาน
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {shown.map(s => {
          const st = STAGE_STYLE[s.stage as 'AT_RISK' | 'LAPSED'];
          const isPending = pendingPhone === s.phone;
          return (
            <div
              key={s.phone}
              className="suggestion-card"
              style={{ borderLeft: `3px solid ${st.color}` }}
            >
              <span style={{
                background: st.bg, color: st.color,
                borderRadius: 999, padding: '0.25rem 0.65rem',
                fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
              }}>
                <i className={st.icon}></i> {st.label}
              </span>

              <div className="suggestion-card-info" style={{ flex: 1, minWidth: 180 }}>
                <Link
                  href={`/customers/${encodeURIComponent(s.phone)}`}
                  className="fw-700"
                  style={{ fontSize: 14, color: 'var(--text-dark)', textDecoration: 'none' }}
                >
                  {s.name}
                </Link>
                <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                  <i className="ri-phone-line"></i> {s.phone}
                  <span style={{ marginLeft: 8 }}>· {s.reason}</span>
                </div>
              </div>

              <div className="suggestion-card-actions">
                <button
                  onClick={() => handleDismiss(s.phone)}
                  disabled={isPending}
                  className="btn btn-secondary suggestion-card-btn"
                  title="ซ่อน suggestion นี้"
                  aria-label="ข้าม"
                >
                  <i className="ri-close-line"></i>
                  <span>ข้าม</span>
                </button>
                <button
                  onClick={() => handleAccept(s)}
                  disabled={isPending}
                  className="btn btn-primary suggestion-card-btn"
                >
                  {isPending
                    ? <><i className="ri-loader-4-line"></i><span>กำลังสร้าง</span></>
                    : <><i className="ri-add-line"></i><span>สร้างเป็นงาน</span></>}
                </button>
              </div>
            </div>
          );
        })}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="btn btn-secondary"
            style={{ alignSelf: 'center', marginTop: '0.25rem', fontSize: 13 }}
          >
            <i className="ri-arrow-down-s-line"></i> ดูเพิ่มอีก {remaining} รายการ
          </button>
        )}
        {showAll && visible.length > INITIAL_SHOW && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="btn btn-ghost"
            style={{ alignSelf: 'center', marginTop: '0.25rem', fontSize: 13 }}
          >
            <i className="ri-arrow-up-s-line"></i> ย่อกลับ
          </button>
        )}
      </div>
    </div>
  );
}
