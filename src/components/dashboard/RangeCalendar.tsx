'use client';

import { useState, useMemo } from 'react';
import { toYmd } from '@/lib/dashboardFilters';

const DAYS_TH = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

type Props = {
  from: string | null;   // YYYY-MM-DD
  to: string | null;     // YYYY-MM-DD
  max?: string;          // YYYY-MM-DD — ปิดวันหลังจากนี้ (เช่น วันนี้)
  onChange: (from: string | null, to: string | null) => void;
};

const navBtnStyle: React.CSSProperties = {
  width: 36, height: 36,
  border: '1px solid var(--border-light)',
  borderRadius: 8,
  background: 'var(--bg-card)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, color: 'var(--text-body)',
};

export default function RangeCalendar({ from, to, max, onChange }: Props) {
  const todayStr = toYmd(new Date());
  const anchor = to ?? from ?? todayStr;

  const [view, setView] = useState(() => {
    const [y, m] = anchor.split('-').map(Number);
    return { year: y, month: m - 1 };
  });
  const [hover, setHover] = useState<string | null>(null);

  const { cells } = useMemo(() => {
    const firstDay = new Date(view.year, view.month, 1).getDay(); // 0=Sun
    const offset = (firstDay + 6) % 7;                            // จันทร์ขึ้นต้น
    const dim = new Date(view.year, view.month + 1, 0).getDate();
    const total = Math.ceil((offset + dim) / 7) * 7;
    const out: Array<number | null> = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= dim; d++) out.push(d);
    while (out.length < total) out.push(null);
    return { cells: out };
  }, [view]);

  function toStr(day: number) {
    return `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function prevMonth() {
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  }
  function nextMonth() {
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  }

  function pick(dateStr: string) {
    // เริ่มใหม่ถ้ายังไม่มีจุดเริ่ม หรือเลือกครบช่วงแล้ว
    if (!from || (from && to)) { onChange(dateStr, null); return; }
    // มีจุดเริ่มแล้ว กำลังเลือกจุดจบ
    if (dateStr >= from) onChange(from, dateStr);
    else onChange(dateStr, null); // คลิกวันก่อนหน้า → ใช้เป็นจุดเริ่มใหม่
  }

  // ปลายช่วงเพื่อแสดงผล (ถ้ายังเลือก to ไม่เสร็จ ใช้วันที่ hover แทน)
  const previewEnd = to ?? (from && hover && hover >= from ? hover : null);

  return (
    <div style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}>
      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <button type="button" onClick={prevMonth} style={navBtnStyle} aria-label="เดือนก่อนหน้า">
          <i className="ri-arrow-left-s-line"></i>
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>
          {MONTHS_TH[view.month]} {view.year + 543}
        </span>
        <button type="button" onClick={nextMonth} style={navBtnStyle} aria-label="เดือนถัดไป">
          <i className="ri-arrow-right-s-line"></i>
        </button>
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
        {DAYS_TH.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '4px 0',
            color: i === 6 ? '#ef4444' : 'var(--text-muted)',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} style={{ minHeight: 40 }} />;

          const dateStr = toStr(day);
          const disabled = max ? dateStr > max : false;
          const isStart = from === dateStr;
          const isEnd = previewEnd === dateStr || to === dateStr;
          const inRange = !!from && !!previewEnd && dateStr >= from && dateStr <= previewEnd;
          const isEndpoint = isStart || isEnd;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => pick(dateStr)}
              onMouseEnter={() => setHover(dateStr)}
              onMouseLeave={() => setHover(h => (h === dateStr ? null : h))}
              style={{
                minHeight: 40,
                border: isToday && !isEndpoint ? '1px solid var(--primary)' : '1px solid transparent',
                borderRadius: 8,
                cursor: disabled ? 'default' : 'pointer',
                fontSize: 13,
                fontWeight: isEndpoint ? 700 : 500,
                background: isEndpoint
                  ? 'var(--primary)'
                  : inRange
                    ? 'var(--primary-light)'
                    : 'transparent',
                color: disabled
                  ? '#cbcbd6'
                  : isEndpoint
                    ? '#fff'
                    : inRange
                      ? 'var(--primary)'
                      : 'var(--text-body)',
                opacity: disabled ? 0.55 : 1,
                transition: 'background 100ms, color 100ms',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
