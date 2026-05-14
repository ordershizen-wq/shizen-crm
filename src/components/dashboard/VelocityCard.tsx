import type { VelocityStats } from '@/lib/analytics';

export default function VelocityCard({ stats, name }: { stats: VelocityStats; name: string }) {
  const pacePercent = stats.dailyTargetToReach > 0
    ? Math.min(150, (stats.dailyAverage / stats.dailyTargetToReach) * 100)
    : 100;
  const todayPercent = stats.dailyTargetToReach > 0
    ? Math.min(150, (stats.todayRevenue / stats.dailyTargetToReach) * 100)
    : 100;

  const paceColor = stats.paceOk ? '#10b981' : '#ef4444';
  const paceLabel = stats.paceOk ? 'On pace 🎯' : 'ต้องเร่ง 🚀';

  return (
    <div
      className="card"
      style={{
        padding: '1.15rem 1.25rem',
        background: stats.paceOk
          ? 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, #fff 60%)'
          : 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, #fff 60%)',
        border: `1.5px solid ${stats.paceOk ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
        marginBottom: '1.5rem',
      }}
    >
      <div className="flex-between mb-3" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="text-sm text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            ⚡ Pace ของคุณวันนี้
          </div>
          <div className="fw-700" style={{ fontSize: 13, marginTop: 2, color: 'var(--text-dark)' }}>
            สวัสดี {name} — {paceLabel}
          </div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, color: paceColor,
          background: '#fff', border: `1px solid ${paceColor}33`,
          borderRadius: 999, padding: '3px 10px',
        }}>
          {pacePercent.toFixed(0)}% pace
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
        <div style={{ height: 8, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, todayPercent)}%`,
            background: `linear-gradient(90deg, ${paceColor} 0%, ${paceColor}dd 100%)`,
            transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: 4,
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
