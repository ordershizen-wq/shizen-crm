'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveFollowUp } from '@/app/actions/followup';

const OUTCOMES = [
  { value: 'INTERESTED', label: 'สนใจ', color: 'var(--success)' },
  { value: 'NOT_NOW', label: 'ยังไม่พร้อม', color: '#d39e00' },
  { value: 'ORDERED', label: 'สั่งซื้อแล้ว', color: 'var(--primary)' },
  { value: 'NO_ANSWER', label: 'ไม่รับสาย', color: '#64748b' },
  { value: 'DO_NOT_CONTACT', label: 'ห้ามติดต่อ', color: 'var(--danger)' },
  { value: 'OTHER', label: 'อื่นๆ', color: '#64748b' },
];

const CHANNELS = [
  { value: 'CALL', label: 'โทร', icon: 'ri-phone-line' },
  { value: 'LINE', label: 'LINE', icon: 'ri-message-2-line' },
  { value: 'SMS', label: 'SMS', icon: 'ri-chat-1-line' },
];

type Props = {
  customerPhone: string;
  sheetUserId: string;
  onDone?: () => void;
};

export default function QuickFollowUpForm({ customerPhone, sheetUserId, onDone }: Props) {
  const router = useRouter();
  const [outcome, setOutcome] = useState('NO_ANSWER');
  const [channel, setChannel] = useState('CALL');
  const [note, setNote] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveFollowUp({ customerPhone, sheetUserId, outcome, channel, note, nextActionAt: nextActionAt || null });
      setDone(true);
      router.refresh();
      onDone?.();
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div style={{ padding: '0.75rem', background: 'var(--success-light)', borderRadius: 8, color: 'var(--success)', fontSize: 13, textAlign: 'center' }}>
        <i className="ri-check-line"></i> บันทึกแล้ว
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Channel */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {CHANNELS.map(c => (
          <button
            key={c.value}
            type="button"
            onClick={() => setChannel(c.value)}
            style={{
              flex: 1,
              padding: '0.4rem',
              border: `2px solid ${channel === c.value ? 'var(--primary)' : 'var(--border-light)'}`,
              borderRadius: 8,
              background: channel === c.value ? 'var(--blue-light)' : '#fff',
              color: channel === c.value ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: channel === c.value ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            <i className={c.icon}></i> {c.label}
          </button>
        ))}
      </div>

      {/* Outcome */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {OUTCOMES.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => setOutcome(o.value)}
            style={{
              padding: '0.3rem 0.65rem',
              border: `2px solid ${outcome === o.value ? o.color : 'var(--border-light)'}`,
              borderRadius: 20,
              background: outcome === o.value ? o.color + '22' : '#fff',
              color: outcome === o.value ? o.color : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: outcome === o.value ? 600 : 400,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Note */}
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="โน้ต (ถ้ามี)..."
        rows={2}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          border: '1.5px solid var(--border-light)',
          borderRadius: 8,
          fontSize: 13,
          resize: 'vertical',
          fontFamily: 'inherit',
          color: 'var(--text-dark)',
          outline: 'none',
        }}
      />

      {/* Next action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          <i className="ri-alarm-line"></i> ติดตามต่อ:
        </label>
        <input
          type="date"
          value={nextActionAt}
          onChange={e => setNextActionAt(e.target.value)}
          style={{
            flex: 1,
            padding: '0.35rem 0.65rem',
            border: '1.5px solid var(--border-light)',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'inherit',
            color: 'var(--text-dark)',
            outline: 'none',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="btn btn-primary"
        style={{ padding: '0.5rem', fontSize: 13 }}
      >
        {saving ? <><i className="ri-loader-4-line"></i> กำลังบันทึก...</> : <><i className="ri-save-line"></i> บันทึก</>}
      </button>
    </form>
  );
}
