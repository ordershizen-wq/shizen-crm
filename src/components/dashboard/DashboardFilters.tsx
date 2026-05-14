import Link from 'next/link';
import { RANGE_OPTIONS, type RangeKey, type ViewKey } from '@/lib/dashboardFilters';

type Props = {
  range: RangeKey;
  view: ViewKey;
  showViewToggle: boolean;   // เฉพาะ LEADER
  rangeLabel: string;
};

function buildHref(range: RangeKey, view: ViewKey): string {
  const p = new URLSearchParams();
  if (range !== 'month') p.set('range', range);
  if (view !== 'team') p.set('view', view);
  const qs = p.toString();
  return `/${qs ? `?${qs}` : ''}`;
}

export default function DashboardFilters({ range, view, showViewToggle, rangeLabel }: Props) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.65rem 0.85rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        flexWrap: 'wrap',
      }}
    >
      {/* View toggle (LEADER เท่านั้น) */}
      {showViewToggle && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
            <span className="text-sm text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              มุมมอง
            </span>
            <div className="filter-seg">
              <Link
                href={buildHref(range, 'team')}
                className={`filter-seg-btn${view === 'team' ? ' is-active' : ''}`}
              >
                <i className="ri-team-line"></i> ทีม
              </Link>
              <Link
                href={buildHref(range, 'self')}
                className={`filter-seg-btn${view === 'self' ? ' is-active' : ''}`}
              >
                <i className="ri-user-line"></i> ของฉัน
              </Link>
            </div>
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
        </>
      )}

      {/* Range tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
        <span className="text-sm text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          ช่วงเวลา
        </span>
        <div className="filter-seg">
          {RANGE_OPTIONS.map(opt => (
            <Link
              key={opt.key}
              href={buildHref(opt.key, view)}
              className={`filter-seg-btn${range === opt.key ? ' is-active' : ''}`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <span className="text-sm text-muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
          กำลังดู: <strong style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{rangeLabel}</strong>
        </span>
      </div>
    </div>
  );
}
