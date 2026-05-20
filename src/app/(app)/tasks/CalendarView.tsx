'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { CalendarEvent } from '@/lib/calendarEvents';

const DAYS_TH = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const MONTHS_TH = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];

const EVENT_CONFIG = {
  task: {
    color: '#0ea5e9',
    bg: '#e0f2fe',
    label: 'งานติดตาม',
    icon: 'ri-task-line',
  },
  followup: {
    color: '#4f46e5',
    bg: '#eef2ff',
    label: 'นัดติดตาม',
    icon: 'ri-alarm-line',
  },
  reorder: {
    color: '#f97316',
    bg: '#ffedd5',
    label: 'ครบเซ็ท',
    icon: 'ri-refresh-line',
  },
  lapsed_warning: {
    color: '#ef4444',
    bg: '#fee2e2',
    label: 'เริ่มห่างหาย',
    icon: 'ri-time-line',
  },
} as const;

const TASK_TYPE_LABEL: Record<string, string> = {
  FOLLOW_UP: 'ตามอาการ',
  CALL: 'โทรหา',
  REPEAT_BUY: 'เตือนซื้อซ้ำ',
  DELIVERY: 'ตามของ',
  CUSTOM: 'อื่นๆ',
};

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  HIGH:   { label: 'ด่วน',     color: '#ef4444' },
  NORMAL: { label: 'ปกติ',     color: '#0ea5e9' },
  LOW:    { label: 'ไม่เร่ง',  color: '#64748b' },
};

type Props = {
  events: CalendarEvent[];
  initialYear: number;
  initialMonth: number;
  userName: string;
};

export default function CalendarView({ events, initialYear, initialMonth, userName }: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<CalendarEvent['type'] | 'all'>('all');

  const todayStr = new Date().toISOString().slice(0, 10);

  // Index events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  // Calendar grid data
  const { cells, daysInMonth } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const offset = (firstDay + 6) % 7; // Mon-first: Mon=0 … Sun=6
    const dim = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((offset + dim) / 7) * 7;
    const cells: Array<number | null> = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(d);
    while (cells.length < totalCells) cells.push(null);
    return { cells, daysInMonth: dim };
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  function toStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelectedDate(todayStr);
  }

  // Summary counts for this month
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEvents = events.filter(e => e.date.startsWith(monthPrefix));
  const counts = {
    task: monthEvents.filter(e => e.type === 'task').length,
    followup: monthEvents.filter(e => e.type === 'followup').length,
    reorder: monthEvents.filter(e => e.type === 'reorder').length,
    lapsed_warning: monthEvents.filter(e => e.type === 'lapsed_warning').length,
  };

  // Selected day events
  const selectedEvents = selectedDate
    ? (eventsByDate.get(selectedDate) ?? []).filter(e => filterType === 'all' || e.type === filterType)
    : [];

  return (
    <div>
      {/* Page header */}
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">
            <i className="ri-calendar-line" style={{ color: 'var(--primary)' }}></i>{' '}
            ปฏิทินงาน
          </h1>
          <p className="text-sm text-muted mt-1">ลูกค้าของ {userName}</p>
        </div>
        <button onClick={goToday} className="btn btn-secondary" style={{ fontSize: 13 }}>
          <i className="ri-focus-3-line"></i> วันนี้
        </button>
      </div>

      {/* Legend / summary pills */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {(['task', 'followup', 'reorder', 'lapsed_warning'] as const).map(t => {
          const cfg = EVENT_CONFIG[t];
          const active = filterType === t;
          return (
            <button
              key={t}
              onClick={() => setFilterType(active ? 'all' : t)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: active ? cfg.color : cfg.bg,
                color: active ? '#fff' : cfg.color,
                border: `1.5px solid ${active ? cfg.color : cfg.color + '44'}`,
                borderRadius: '9999px', padding: '0.35rem 0.9rem',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              <i className={cfg.icon}></i>
              {cfg.label}
              <span style={{
                background: active ? 'rgba(255,255,255,0.3)' : cfg.color,
                color: active ? cfg.color : '#fff',
                borderRadius: '9999px', padding: '0 6px', fontSize: 11, fontWeight: 700,
              }}>
                {counts[t]}
              </span>
            </button>
          );
        })}
        {filterType !== 'all' && (
          <button
            onClick={() => setFilterType('all')}
            style={{
              fontSize: 12, color: 'var(--text-muted)', background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            ดูทั้งหมด
          </button>
        )}
      </div>

      <div className={`calendar-layout${selectedDate ? ' has-side' : ''}`}>

        {/* ── Calendar grid ── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Month navigator */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)',
          }}>
            <button onClick={prevMonth} style={navBtnStyle}>
              <i className="ri-arrow-left-s-line"></i>
            </button>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-dark)' }}>
              {MONTHS_TH[month]} {year + 543}
            </span>
            <button onClick={nextMonth} style={navBtnStyle}>
              <i className="ri-arrow-right-s-line"></i>
            </button>
          </div>

          {/* Day headers */}
          <div className="cal-days-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--border-light)' }}>
            {DAYS_TH.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', padding: '0.6rem 0',
                fontSize: 12, fontWeight: 700,
                color: i === 6 ? '#ef4444' : 'var(--text-muted)',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="cal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`e-${idx}`} style={{ minHeight: 88, borderRight: idx % 7 !== 6 ? '1px solid var(--border-light)' : 'none', borderBottom: '1px solid var(--border-light)', background: '#fafafa' }} />;
              }
              const dateStr = toStr(day);
              const dayEvents = eventsByDate.get(dateStr) ?? [];
              const filtered = filterType === 'all' ? dayEvents : dayEvents.filter(e => e.type === filterType);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isWeekend = idx % 7 === 6; // Sunday

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  style={{
                    minHeight: 88,
                    padding: '0.4rem',
                    borderRight: idx % 7 !== 6 ? '1px solid var(--border-light)' : 'none',
                    borderBottom: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    background: isSelected
                      ? 'var(--primary-light)'
                      : isToday
                        ? '#fffbeb'
                        : isWeekend
                          ? '#fafafa'
                          : '#fff',
                    transition: 'background 150ms',
                    position: 'relative',
                    outline: isSelected ? '2px solid var(--primary)' : isToday ? '2px solid #f59e0b' : 'none',
                    outlineOffset: '-2px',
                  }}
                >
                  {/* Date number */}
                  <div style={{
                    fontSize: 13, fontWeight: isToday ? 800 : 500,
                    color: isToday ? '#f59e0b' : isWeekend ? '#ef4444' : 'var(--text-body)',
                    marginBottom: '0.3rem',
                    width: 24, height: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                    background: isToday ? '#fef3c7' : 'transparent',
                  }}>
                    {day}
                  </div>

                  {/* Event dots */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {filtered.slice(0, 3).map((ev, i) => {
                      const cfg = EVENT_CONFIG[ev.type];
                      const isOverdueTask = ev.type === 'task' && ev.isOverdue;
                      const labelText = ev.type === 'task'
                        ? (ev.taskTitle ?? ev.name)
                        : ev.name.split(' ')[0];
                      return (
                        <div key={i} style={{
                          background: isOverdueTask ? '#fee2e2' : cfg.bg,
                          color: isOverdueTask ? '#ef4444' : cfg.color,
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '1px 4px',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                          border: ev.type === 'task' && ev.priority === 'HIGH' ? '1px solid ' + cfg.color : 'none',
                        }}>
                          <i className={cfg.icon} style={{ marginRight: 2 }}></i>
                          {labelText}
                        </div>
                      );
                    })}
                    {filtered.length > 3 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, paddingLeft: 2 }}>
                        +{filtered.length - 3} รายการ
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Day detail panel ── */}
        {selectedDate && (
          <div className="card calendar-side-panel">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>
                  <i className="ri-calendar-event-line" style={{ color: 'var(--primary)', marginRight: 6 }}></i>
                  {formatDateTH(selectedDate)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {selectedEvents.length} งาน
                </div>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
              {selectedEvents.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <i className="ri-checkbox-circle-line" style={{ fontSize: 36, color: 'var(--success)' }}></i>
                  <p style={{ marginTop: 8, fontSize: 13 }}>ไม่มีงานในวันนี้</p>
                </div>
              ) : (
                <div style={{ padding: '0.5rem 0' }}>
                  {selectedEvents.map((ev, i) => {
                    const cfg = EVENT_CONFIG[ev.type];
                    return (
                      <div key={`${ev.phone}-${i}`} style={{
                        padding: '0.875rem 1.25rem',
                        borderBottom: i < selectedEvents.length - 1 ? '1px solid var(--border-light)' : 'none',
                      }}>
                        {/* Type badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{
                            background: cfg.bg, color: cfg.color,
                            fontSize: 11, fontWeight: 700,
                            padding: '0.2rem 0.6rem', borderRadius: '9999px',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                            <i className={cfg.icon}></i> {cfg.label}
                          </span>
                        </div>

                        {/* Customer info */}
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-dark)' }}>
                          {ev.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          <i className="ri-phone-line"></i> {ev.phone}
                        </div>

                        {/* Detail by type */}
                        <div style={{ marginTop: '0.5rem', fontSize: 12, color: cfg.color }}>
                          {ev.type === 'task' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: 13 }}>
                                <i className="ri-bookmark-line"></i> {ev.taskTitle}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
                                {ev.taskType && (
                                  <span style={{ color: cfg.color, fontWeight: 600 }}>
                                    {TASK_TYPE_LABEL[ev.taskType] ?? ev.taskType}
                                  </span>
                                )}
                                {ev.priority && PRIORITY_LABEL[ev.priority] && (
                                  <span style={{
                                    color: PRIORITY_LABEL[ev.priority].color,
                                    fontWeight: 700,
                                  }}>
                                    · {PRIORITY_LABEL[ev.priority].label}
                                  </span>
                                )}
                                {ev.isOverdue && (
                                  <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                    · เลยกำหนด
                                  </span>
                                )}
                              </div>
                              {ev.assigneeName && (
                                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                  <i className="ri-user-3-line"></i> {ev.assigneeName}
                                </div>
                              )}
                              {ev.note && (
                                <div style={{ color: 'var(--text-dark)', fontSize: 12, marginTop: 2 }}>
                                  <i className="ri-chat-1-line"></i> {ev.note}
                                </div>
                              )}
                            </div>
                          )}
                          {ev.type === 'followup' && ev.note && (
                            <div><i className="ri-chat-1-line"></i> {ev.note}</div>
                          )}
                          {ev.type === 'reorder' && (
                            <div>
                              <i className="ri-refresh-line"></i>{' '}
                              รอบการสั่งเฉลี่ย ~{ev.avgCycleDays} วัน
                              {ev.daysSinceOrder !== undefined && ` · สั่งล่าสุด ${ev.daysSinceOrder} วันที่แล้ว`}
                            </div>
                          )}
                          {ev.type === 'lapsed_warning' && (
                            <div>
                              <i className="ri-time-line"></i>{' '}
                              ครบ 60 วันแล้ว — ควรติดตามด่วน
                            </div>
                          )}
                        </div>

                        {/* Action */}
                        <div style={{ marginTop: '0.75rem' }}>
                          <Link
                            href={`/customers/${ev.phone}`}
                            className="btn btn-primary"
                            style={{ fontSize: 12, height: 34, padding: '0 0.85rem' }}
                          >
                            <i className="ri-user-line"></i> เปิดโปรไฟล์
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  width: 36, height: 36,
  border: '1px solid var(--border-light)',
  borderRadius: 8,
  background: '#fff',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, color: 'var(--text-body)',
  transition: 'all 150ms',
};

function formatDateTH(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
