'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveFollowUp } from './actions';

const OUTCOMES = [
  { value: 'INTERESTED', label: '✅ สนใจ' },
  { value: 'NOT_NOW', label: '⏳ ยังไม่พร้อม' },
  { value: 'ORDERED', label: '🛍️ สั่งซื้อแล้ว' },
  { value: 'NO_ANSWER', label: '📵 ไม่รับสาย' },
  { value: 'DO_NOT_CONTACT', label: '🚫 ห้ามติดต่อ' },
  { value: 'OTHER', label: 'อื่นๆ' },
];

const CHANNELS = ['CALL', 'LINE', 'SMS'];

export default function FollowUpForm({ customerPhone, sheetUserId }: { customerPhone: string; sheetUserId: string }) {
  const [outcome, setOutcome] = useState('INTERESTED');
  const [channel, setChannel] = useState('CALL');
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    if (!outcome) return;
    startTransition(async () => {
      await saveFollowUp({ customerPhone, sheetUserId, outcome, channel, note, nextActionAt: nextDate || null });
      setNote('');
      setNextDate('');
      router.refresh();
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <label className="text-sm text-muted fw-500 mb-1" style={{ display: 'block' }}>ผลการติดตาม</label>
        <select value={outcome} onChange={e => setOutcome(e.target.value)} className="form-select w-100">
          {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm text-muted fw-500 mb-1" style={{ display: 'block' }}>ช่องทาง</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {CHANNELS.map(ch => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className="btn"
              style={{
                flex: 1,
                background: channel === ch ? 'var(--primary)' : 'var(--bg-app)',
                color: channel === ch ? '#fff' : 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              {ch === 'CALL' ? '📞' : ch === 'LINE' ? '💬' : '📱'} {ch}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-muted fw-500 mb-1" style={{ display: 'block' }}>หมายเหตุ</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          className="form-control w-100"
          rows={2}
          placeholder="บันทึกรายละเอียดการคุย..."
          style={{ resize: 'none' }}
        />
      </div>

      <div>
        <label className="text-sm text-muted fw-500 mb-1" style={{ display: 'block' }}>
          <i className="ri-alarm-line text-orange"></i> ติดตามต่อวันที่ (ไม่บังคับ)
        </label>
        <input
          type="date"
          value={nextDate}
          onChange={e => setNextDate(e.target.value)}
          className="form-control w-100"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="btn btn-primary w-100"
        style={{ marginTop: '0.25rem' }}
      >
        {isPending
          ? <><i className="ri-loader-4-line"></i> กำลังบันทึก...</>
          : <><i className="ri-save-line"></i> บันทึกการติดตาม</>}
      </button>
    </div>
  );
}
