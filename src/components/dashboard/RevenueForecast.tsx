import type { RevenueForecast } from '@/lib/analytics';

export default function RevenueForecastCard({ data }: { data: RevenueForecast }) {
  const willHit = data.willHitTarget;
  const growthUp = data.growthPercent >= 0;
  const accent = willHit ? 'var(--success)' : data.monthlyTarget ? 'var(--warning)' : 'var(--primary)';

  const progressPercent = data.monthlyTarget && data.monthlyTarget > 0
    ? Math.min(100, (data.currentRevenue / data.monthlyTarget) * 100)
    : 0;
  const projectionPercent = data.monthlyTarget && data.monthlyTarget > 0
    ? Math.min(100, (data.projectedRevenue / data.monthlyTarget) * 100)
    : 0;

  return (
    <div className="card" style={{
      padding: '1.15rem 1.25rem',
      borderLeft: `3px solid ${accent}`,
      marginBottom: '1.5rem',
    }}>
      <div className="flex-between mb-3" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="text-sm text-muted" style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            คาดการณ์รายได้สิ้นเดือน
          </div>
          <div className="fw-600" style={{ fontSize: 14, marginTop: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            วันที่ {data.daysElapsed} / {data.daysTotal} · เหลืออีก {data.daysRemaining} วัน
          </div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: growthUp ? 'var(--success)' : 'var(--danger)',
          background: 'rgba(255,255,255,0.55)', border: `1px solid ${growthUp ? 'var(--success)' : 'var(--danger)'}40`,
          borderRadius: 'var(--radius-sm)', padding: '3px 10px',
        }}>
          {growthUp ? '↑' : '↓'} {Math.abs(data.growthPercent).toFixed(1)}% เทียบเดือนก่อน
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
          marginTop: 10, padding: '8px 12px',
          background: 'var(--success-light)',
          border: '1px solid rgba(74,124,94,0.18)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12, color: 'var(--success)',
        }}>
          น่าจะถึงเป้าวันที่ <strong>{data.projectedHitDay}</strong> ของเดือน (เร็วกว่ากำหนด {data.daysTotal - data.projectedHitDay} วัน)
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
