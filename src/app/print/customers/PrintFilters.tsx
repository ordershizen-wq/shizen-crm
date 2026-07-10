'use client';

// Toolbar เลือกช่วงเวลาสำหรับหน้าพิมพ์รายชื่อลูกค้า
// ก๊อปแบบมาจาก DashboardFilters (src/components/dashboard/DashboardFilters.tsx) แต่ตัด
// view toggle (self/team) ออก — หน้านี้มี dropdown เลือกเซลส์แยกต่างหากอยู่แล้ว
// สำคัญ: ทุก href ต้องคง ?rep= เดิมไว้เสมอ ไม่งั้นจะหลุดกลับไปหน้า "เลือกพนักงาน"
import Link, { useLinkStatus } from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { RANGE_OPTIONS, toYmd, type RangeKey } from '@/lib/dashboardFilters';
import RangeCalendar from '@/components/dashboard/RangeCalendar';

type Props = {
  rep: string;           // selectedRepId — คงไว้ในทุก href
  range: RangeKey;
  rangeLabel: string;
  initialFrom?: string;  // YYYY-MM-DD
  initialTo?: string;
};

/** Spinner ภายในปุ่ม filter ที่กดแล้วยังโหลดไม่เสร็จ */
function FilterPendingDot() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <i className="ri-loader-4-line filter-spin" aria-hidden style={{ marginLeft: 4 }} />;
}

function FilterLink({
  href, isActive, children,
}: {
  href: string; isActive: boolean; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`filter-seg-btn${isActive ? ' is-active' : ''}`}
      prefetch={false}
      scroll={false}
    >
      {children}
      <FilterPendingDot />
    </Link>
  );
}

function fmtShort(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

type PresetKey = '7d' | '30d' | 'thisMonth' | 'lastMonth';
const QUICK_PRESETS: { key: PresetKey; label: string }[] = [
  { key: '7d',        label: '7 วัน' },
  { key: '30d',       label: '30 วัน' },
  { key: 'thisMonth', label: 'เดือนนี้' },
  { key: 'lastMonth', label: 'เดือนก่อน' },
];

export default function PrintFilters({ rep, range, rangeLabel, initialFrom, initialTo }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const isCustom = range === 'custom';

  const [open, setOpen] = useState(isCustom);
  const [fromVal, setFromVal] = useState(initialFrom ?? '');
  const [toVal, setToVal] = useState(initialTo ?? '');
  // เปลี่ยนค่าเพื่อบังคับ remount ปฏิทินให้เด้งไปเดือนใหม่ตอนกดปุ่มลัด (ไม่ทำตอนคลิกวันปกติ)
  const [calKey, setCalKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const todayStr = toYmd(new Date());

  // preset link → อยู่หน้าเดิม คง ?rep= เสมอ, ทิ้ง from/to
  function buildHref(r: RangeKey): string {
    const p = new URLSearchParams();
    p.set('rep', rep);
    if (r !== 'all') p.set('range', r);
    return `${pathname}?${p.toString()}`;
  }

  function applyPreset(kind: PresetKey) {
    const today = new Date();
    let f: Date, t: Date;
    if (kind === '7d') {
      t = today; f = new Date(today); f.setDate(f.getDate() - 6);
    } else if (kind === '30d') {
      t = today; f = new Date(today); f.setDate(f.getDate() - 29);
    } else if (kind === 'thisMonth') {
      f = new Date(today.getFullYear(), today.getMonth(), 1); t = today;
    } else { // lastMonth
      f = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      t = new Date(today.getFullYear(), today.getMonth(), 0); // วันสุดท้ายของเดือนก่อน
    }
    setFromVal(toYmd(f));
    setToVal(toYmd(t));
    setCalKey(k => k + 1);
  }

  function applyCustom() {
    if (!fromVal || !toVal) return;
    let f = fromVal, t = toVal;
    if (f > t) [f, t] = [t, f];   // สลับให้ถ้าเลือกกลับด้าน (YYYY-MM-DD เทียบสตริงได้)
    const p = new URLSearchParams();
    p.set('rep', rep);
    p.set('range', 'custom');
    p.set('from', f);
    p.set('to', t);
    startTransition(() => router.push(`${pathname}?${p.toString()}`));
  }

  const selLabel = fromVal && toVal
    ? `${fmtShort(fromVal)} – ${fmtShort(toVal)}`
    : fromVal
      ? `${fmtShort(fromVal)} – …`
      : 'เลือกวันเริ่มต้นบนปฏิทิน';

  return (
    <div className="print-filters no-print">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="text-sm text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          ช่วงเวลา
        </span>
        {/* flexWrap ห่อบรรทัดบนจอแคบ กัน filter-seg ล้นขอบ (จอ 390px) */}
        <div className="filter-seg" style={{ flexWrap: 'wrap' }}>
          {RANGE_OPTIONS.map(opt => (
            <FilterLink key={opt.key} href={buildHref(opt.key)} isActive={range === opt.key}>
              {opt.label}
            </FilterLink>
          ))}
          <button
            type="button"
            className={`filter-seg-btn${isCustom ? ' is-active' : ''}`}
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
          >
            <i className="ri-calendar-event-line" style={{ marginRight: 3 }}></i>
            กำหนดเอง
          </button>
        </div>
        <span className="text-sm text-muted" style={{ fontSize: 12 }}>
          กำลังดู: <strong style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{rangeLabel}</strong>
        </span>
      </div>

      {/* Custom date panel */}
      {open && (
        <div className="print-filters-custom">
          {/* Quick presets */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {QUICK_PRESETS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className="print-filters-preset-btn"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Inline range calendar */}
          <RangeCalendar
            key={calKey}
            from={fromVal || null}
            to={toVal || null}
            max={todayStr}
            onChange={(f, t) => { setFromVal(f ?? ''); setToVal(t ?? ''); }}
          />

          {/* Footer: selected range + apply */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="text-sm" style={{ fontSize: 13, color: 'var(--text-body)' }}>
              <i className="ri-calendar-event-line" style={{ color: 'var(--primary)', marginRight: 5 }}></i>
              <strong style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{selLabel}</strong>
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={applyCustom}
              disabled={!fromVal || !toVal || pending}
              style={{ minHeight: 44, flex: '0 0 auto' }}
            >
              {pending ? (
                <><i className="ri-loader-4-line filter-spin" style={{ marginRight: 4 }}></i> กำลังโหลด…</>
              ) : (
                <><i className="ri-check-line" style={{ marginRight: 4 }}></i> ใช้ช่วงนี้</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
