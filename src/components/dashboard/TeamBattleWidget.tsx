import type { TeamBattleRow } from '@/lib/analytics';

export default function TeamBattleWidget({ rows }: { rows: TeamBattleRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  const maxRev = Math.max(...rows.map(r => r.totalRevenue));

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
      <div className="fw-700" style={{ fontSize: 14, marginBottom: 4 }}>
        🏆 Team Battle — เดือนนี้
      </div>
      <div className="text-sm text-muted" style={{ fontSize: 11, marginBottom: 14 }}>
        เปรียบเทียบยอดทีม + สัดส่วนลูกค้าใหม่ vs รีออเดอร์
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
                    width: 22, height: 22, borderRadius: 6,
                    background: i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : i === 2 ? '#f97316' : '#e2e8f0',
                    color: '#fff', fontSize: 11, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i + 1}</span>
                  <span className="fw-600" style={{ fontSize: 13 }}>{r.teamName}</span>
                  <span className="text-sm text-muted" style={{ fontSize: 11 }}>· {r.memberCount} คน</span>
                </div>
                <span className="fw-700" style={{ fontSize: 14, color: 'var(--primary)' }}>
                  ฿{r.totalRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div style={{ height: 10, background: 'var(--border-light)', borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
                <div style={{
                  height: '100%', width: `${widthPct * (newPct / 100)}%`,
                  background: '#0284c7', borderRadius: '5px 0 0 5px',
                  transition: 'width 400ms',
                }} />
                <div style={{
                  height: '100%', width: `${widthPct * (1 - newPct / 100)}%`,
                  background: '#147a5e',
                  transition: 'width 400ms',
                }} />
              </div>
              <div className="text-sm text-muted" style={{ fontSize: 10, marginTop: 2, display: 'flex', gap: 12 }}>
                <span><span style={{ color: '#0284c7', fontWeight: 700 }}>●</span> ลูกค้าใหม่ ฿{r.newCustRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ({(100 - r.reorderShare).toFixed(0)}%)</span>
                <span><span style={{ color: '#147a5e', fontWeight: 700 }}>●</span> รีออเดอร์ ฿{r.reorderRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ({r.reorderShare.toFixed(0)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
