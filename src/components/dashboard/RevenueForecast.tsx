import type { RevenueForecast } from '@/lib/analytics';

export default function RevenueForecastCard({ data }: { data: RevenueForecast }) {
  const willHit = data.willHitTarget;
  const growthUp = data.growthPercent >= 0;
  const accent = willHit ? '#10b981' : data.monthlyTarget ? '#f59e0b' : 'var(--primary)';

  const progressPercent = data.monthlyTarget && data.monthlyTarget > 0
    ? Math.min(100, (data.currentRevenue / data.monthlyTarget) * 100)
    : 0;
  const projectionPercent = data.monthlyTarget && data.monthlyTarget > 0
    ? Math.min(100, (data.projectedRevenue / data.monthlyTarget) * 100)
    : 0;

  return (
    <div className="card" style={{
      padding: '1.15rem 1.25rem',
      background: `linear-gradient(135deg, ${accent}0a 0%, #fff 70%)`,
      border: `1.5px solid ${accent}33`,
      marginBottom: '1.5rem',
    }}>
      <div className="flex-between mb-3" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="text-sm text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            🎯 คาดการณ์รายได้สิ้นเดือน
          </div>
          <div className="fw-700" style={{ fontSize: 13, marginTop: 2 }}>
            วันที่ {data.daysElapsed} / {data.daysTotal} · เหลือ {data.daysRemaining} วัน
          </div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, color: growthUp ? '#10b981' : '#dc2626',
          background: '#fff', border: `1px solid ${growthUp ? '#10b98133' : '#dc262633'}`,
          borderRadius: 999, padding: '3px 10px',
        }}>
          {growthUp ? '▲' : '▼'} {Math.abs(data.growthPercent).toFixed(1)}% vs เดือนก่อน
        </div>
      </div>

      <div className="forecast-grid">
        <ForecastBlock label="ปัจจุบัน" value={data.currentRevenue} color="var(--primary)" />
        <ForecastBlock label="คาดการณ์" value={data.projectedRevenue} color={accent} bold />
        {data.monthlyTarget != null && (
          <ForecastBlock
            label={`เป้า${willHit ? ' ✅' : ''}`}
            value={data.monthlyTarget}
            color="#64748b"
          />
        )}
        <ForecastBlock label="เดือนก่อน" value={data.lastMonthRevenue} color="#94a3b8" small />
      </div>

      {data.monthlyTarget != null && (
        <div style={{ marginTop: '0.85rem' }}>
          <div style={{ height: 10, background: 'var(--border-light)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: 0,
              width: `${projectionPercent}%`,
              background: `${accent}33`,
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)`,
              transition: 'width 400ms',
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>ทำได้ {progressPercent.toFixed(0)}%</span>
            <span>คาดว่าสิ้นเดือน {projectionPercent.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {data.projectedHitDay && data.monthlyTarget && data.willHitTarget && data.projectedHitDay <= data.daysTotal && (
        <div style={{
          marginTop: 10, padding: '6px 10px',
          background: 'rgba(16,185,129,0.1)', borderRadius: 6,
          fontSize: 12, color: '#065f46',
        }}>
          🎯 น่าจะถึงเป้าวันที่ <strong>{data.projectedHitDay}</strong> ของเดือน (เร็วกว่ากำหนด {data.daysTotal - data.projectedHitDay} วัน)
        </div>
      )}
    </div>
  );
}

function ForecastBlock({ label, value, color, bold, small }: { label: string; value: number; color: string; bold?: boolean; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
      <div className="fw-700" style={{
        fontSize: bold ? 22 : small ? 14 : 17,
        color,
        marginTop: 2,
      }}>
        ฿{value.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}
