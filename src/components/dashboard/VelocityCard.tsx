import type { VelocityStats } from '@/lib/analytics';

export default function VelocityCard({ stats, name }: { stats: VelocityStats; name: string }) {
  const pacePercent = stats.dailyTargetToReach > 0
    ? Math.min(150, (stats.dailyAverage / stats.dailyTargetToReach) * 100)
    : 100;
  const todayPercent = stats.dailyTargetToReach > 0
    ? Math.min(150, (stats.todayRevenue / stats.dailyTargetToReach) * 100)
    : 100;

  const paceColor = stats.paceOk ? 'var(--success)' : 'var(--danger)';
  const paceLabel = stats.paceOk ? 'ทำงานตามเป้า' : 'ต้องเร่ง';

  return (
    <div
      className="card"
      style={{
        padding: '1.15rem 1.25rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${paceColor}`,
        marginBottom: '1.5rem',
      }}
    >
      <div className="flex-between mb-3" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="text-sm text-muted" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ผลงานของคุณวันนี้
          </div>
          <div className="fw-600" style={{ fontSize: 14, marginTop: 4, color: 'var(--text-dark)', fontFamily: "'Trirong', serif" }}>
            {name} — {paceLabel}
          </div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: paceColor,
          background: '#fff', border: `1px solid ${paceColor}40`,
          borderRadius: 'var(--radius-sm)', padding: '3px 10px',
        }}>
          {pacePercent.toFixed(0)}%
        </div>
      </div>

      {/* Today's progress */}
      <div style={{ marginBottom: '1rem' }}>
        <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
          <span>วันนี้</span>
          <span className="fw-700" style={{ color: paceColor }}>
            ฿{stats.todayRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
            <span className="text-muted" style={{ fontWeight: 500, marginLeft: 4 }}>
              / ฿{stats.dailyTargetToReach.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
            </span>
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, todayPercent)}%`,
            background: paceColor,
            transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: 3,
          }} />
          {/* avg marker */}
          {stats.dailyAverage > 0 && stats.dailyTargetToReach > 0 && (
            <div style={{
              position: 'absolute',
              left: `${Math.min(98, (stats.dailyAverage / stats.dailyTargetToReach) * 100)}%`,
              top: -2, bottom: -2,
              width: 2, background: '#64748b',
            }} title={`ค่าเฉลี่ยที่ทำได้: ฿${stats.dailyAverage.toLocaleString('th-TH', { maximumFractionDigits: 0 })}/วัน`} />
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
          เส้นเทาคือค่าเฉลี่ยที่ทำได้จริง ฿{stats.dailyAverage.toLocaleString('th-TH', { maximumFractionDigits: 0 })}/วัน
        </div>
      </div>

      {/* Bottom stats */}
      <div className="velocity-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
        <Stat label="เดือนนี้" value={`฿${stats.monthRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`} color="var(--primary)" />
        <Stat label="เหลือถึงเป้า" value={`฿${stats.remainingToTarget.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`} color={stats.remainingToTarget > 0 ? '#f59e0b' : '#10b981'} />
        <Stat label="วันที่เหลือ" value={`${stats.remainingDays} วัน`} color="#64748b" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div className="fw-700" style={{ fontSize: 14, color }}>{value}</div>
    </div>
  );
}
