import Link from 'next/link';
import type { SalesStats } from '@/lib/teamStats';

export default function MyPerformance({
  stats,
  myRank,
  totalInScope,
  monthLabel,
}: {
  stats: SalesStats | null;
  myRank: number | null;
  totalInScope: number;
  monthLabel: string;
}) {
  if (!stats) return null;

  const goalCapped = Math.min(100, stats.goalPercent);
  const goalColor =
    stats.goalPercent >= 100 ? '#10b981' :
    stats.goalPercent >= 70 ? '#f59e0b' :
    '#94a3b8';

  return (
    <Link
      href="/insights?tab=leaderboard"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        marginBottom: '1.5rem',
      }}
    >
      <div
        className="card my-perf"
        style={{
          padding: '1.1rem 1.25rem',
          background: 'linear-gradient(135deg, #fff 0%, #fafbfc 100%)',
          border: '1.5px solid var(--border)',
          transition: 'box-shadow 200ms',
        }}
      >
        <div className="my-perf-row">
          {/* Rank */}
          <div style={{ textAlign: 'center', minWidth: 90 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              อันดับ
            </div>
            <div className="fw-800" style={{ fontSize: 36, lineHeight: 1, color: rankColor(myRank), marginTop: 2 }}>
              {myRank ? `#${myRank}` : '—'}
            </div>
            {myRank && totalInScope > 1 && (
              <div className="text-sm text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                จาก {totalInScope}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-perf-divider" />

          {/* Stats */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div className="text-sm text-muted" style={{ fontSize: 11 }}>
                  ผลงานของคุณ · {monthLabel}
                </div>
                <div className="fw-800" style={{ fontSize: 22, color: 'var(--primary)', marginTop: 2 }}>
                  ฿{stats.totalRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <Stat icon="ri-shopping-bag-3-line" color="#0ea5e9" label="ออเดอร์" value={stats.totalOrders} />
                <Stat icon="ri-repeat-line" color="#147a5e" label="รีออเดอร์" value={stats.reorderOrders} />
                <Stat icon="ri-checkbox-circle-line" color="#10b981" label="Task" value={stats.tasksDone} />
              </div>
            </div>

            {/* Goal progress */}
            {stats.monthlyTarget > 0 && (
              <div>
                <div className="flex-between" style={{ fontSize: 11, marginBottom: 4 }}>
                  <span className="text-muted">
                    เป้า ฿{stats.monthlyTarget.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="fw-700" style={{ color: goalColor }}>
                    {stats.goalPercent.toFixed(0)}%
                    {stats.goalPercent >= 100 && ' 🎯'}
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${goalCapped}%`,
                      background: goalColor,
                      borderRadius: 4,
                      transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{
          marginTop: 10,
          fontSize: 11,
          color: 'var(--primary)',
          textAlign: 'right',
        }}>
          ดู Leaderboard ทั้งหมด <i className="ri-arrow-right-line"></i>
        </div>
      </div>
    </Link>
  );
}

function rankColor(rank: number | null): string {
  if (!rank) return 'var(--text-muted)';
  if (rank === 1) return '#f59e0b';   // gold
  if (rank === 2) return '#94a3b8';   // silver
  if (rank === 3) return '#ea580c';   // bronze
  if (rank <= 5) return 'var(--primary)';
  return 'var(--text-muted)';
}

function Stat({ icon, color, label, value }: { icon: string; color: string; label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 50 }}>
      <i className={icon} style={{ color, fontSize: 16 }}></i>
      <div className="fw-700" style={{ fontSize: 16, color: 'var(--text-dark)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
