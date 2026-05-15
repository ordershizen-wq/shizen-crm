import type { TeamBattleRow } from '@/lib/analytics';

export default function TeamBattleWidget({ rows }: { rows: TeamBattleRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  const maxRev = Math.max(...rows.map(r => r.totalRevenue));

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
      <div className="fw-600" style={{ fontSize: 15, marginBottom: 4, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
        เปรียบเทียบทีม — เดือนนี้
      </div>
      <div className="text-sm text-muted" style={{ fontSize: 12, marginBottom: 14 }}>
        ยอดทีม + สัดส่วนลูกค้าใหม่ vs รีออเดอร์
      </div>
      <div>
        {rows.map((r, i) => {
          const widthPct = maxRev > 0 ? (r.totalRevenue / maxRev) * 100 : 0;
          const newPct = r.totalRevenue > 0 ? (r.newCustRevenue / r.totalRevenue) * 100 : 0;
          return (
            <div key={r.teamId} style={{ marginBottom: '0.9rem' }}>
              <div className="flex-between" style={{ fontSize: 12, marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                    background: i === 0 ? 'var(--gold)' : i === 1 ? 'var(--text-light)' : i === 2 ? 'var(--clay)' : 'var(--border)',
                    color: '#fff', fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i + 1}</span>
                  <span className="fw-600" style={{ fontSize: 13 }}>{r.teamName}</span>
                  <span className="text-sm text-muted" style={{ fontSize: 11 }}>· {r.memberCount} คน</span>
                </div>
                <span className="fw-700" style={{ fontSize: 14, color: 'var(--primary)' }}>
                  ฿{r.totalRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                <div style={{
                  height: '100%', width: `${widthPct * (newPct / 100)}%`,
                  background: 'var(--info)', borderRadius: '4px 0 0 4px',
                  transition: 'width 400ms',
                }} />
                <div style={{
                  height: '100%', width: `${widthPct * (1 - newPct / 100)}%`,
                  background: 'var(--primary)',
                  transition: 'width 400ms',
                }} />
              </div>
              <div className="text-sm text-muted" style={{ fontSize: 10.5, marginTop: 4, display: 'flex', gap: 14 }}>
                <span><span style={{ color: 'var(--info)', fontWeight: 600 }}>●</span> ลูกค้าใหม่ ฿{r.newCustRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ({(100 - r.reorderShare).toFixed(0)}%)</span>
                <span><span style={{ color: 'var(--primary)', fontWeight: 600 }}>●</span> รีออเดอร์ ฿{r.reorderRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ({r.reorderShare.toFixed(0)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
