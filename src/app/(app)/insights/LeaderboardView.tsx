import Link from 'next/link';
import type { LeaderboardData, SalesStats } from '@/lib/teamStats';

function buildMonthOptions(count: number) {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
    out.push({ value, label });
  }
  return out;
}

type Props = {
  data: LeaderboardData;
  monthValue: string;
  currentUserId: string;
  scopeLabel: string;
  /** prefix path สำหรับลิงก์เปลี่ยนเดือน เช่น '/insights?tab=leaderboard' */
  pathPrefix: string;
};

export default function LeaderboardView({ data, monthValue, currentUserId, scopeLabel, pathPrefix }: Props) {
  const monthOptions = buildMonthOptions(6);
  const top3 = data.rows.slice(0, 3);
  const rest = data.rows.slice(3);
  const sep = pathPrefix.includes('?') ? '&' : '?';

  return (
    <>
      <div className="flex-between mb-3" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          {scopeLabel} · {data.monthLabel}
          {data.myRank && <> · คุณอยู่อันดับ <strong style={{ color: 'var(--primary)' }}>#{data.myRank}</strong></>}
        </p>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {monthOptions.map(m => {
            const active = m.value === monthValue;
            return (
              <Link
                key={m.value}
                href={`${pathPrefix}${sep}month=${m.value}`}
                className="btn"
                style={{
                  background: active ? 'var(--primary)' : 'var(--bg-app)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  padding: '0.4rem 0.85rem',
                  fontSize: 12,
                }}
              >
                {m.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <SummaryKpi
          icon="ri-money-dollar-circle-line" color="var(--primary)"
          label="ยอดขายรวม"
          value={`฿${data.totalRevenueAll.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`}
        />
        <SummaryKpi
          icon="ri-shopping-bag-3-line" color="#0ea5e9"
          label="ออเดอร์รวม"
          value={data.totalOrdersAll.toLocaleString()}
        />
        <SummaryKpi
          icon="ri-team-line" color="#6f42c1"
          label="จำนวนเซลส์"
          value={data.rows.length.toLocaleString()}
        />
      </div>

      {data.rows.length === 0 ? (
        <div className="card p-4 text-center" style={{ padding: '4rem' }}>
          <i className="ri-user-line" style={{ fontSize: 48, color: 'var(--text-light)' }}></i>
          <p className="text-muted mt-2">ยังไม่มีเซลส์ในขอบเขต</p>
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="podium-grid mb-4">
              {([1, 0, 2] as const).map(idx => {
                const r = top3[idx];
                if (!r) return <div key={idx} />;
                const rank = (idx + 1) as 1 | 2 | 3;
                return <PodiumCard key={r.userId} rank={rank} stats={r} isMe={r.userId === currentUserId} />;
              })}
            </div>
          )}

          {rest.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-light)' }}>
                <h3 className="fw-700" style={{ fontSize: 14, margin: 0 }}>
                  <i className="ri-list-ordered text-muted"></i> อันดับที่ 4+
                </h3>
              </div>
              <div className="r-table-wrap">
                <table className="r-table">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>อันดับ</th>
                      <th>ชื่อ</th>
                      <th style={{ textAlign: 'right' }}>ยอดขายรวม</th>
                      <th style={{ textAlign: 'right' }}>ลูกค้าใหม่</th>
                      <th style={{ textAlign: 'right' }}>รีออเดอร์</th>
                      <th style={{ textAlign: 'right' }}>Task เสร็จ</th>
                      <th style={{ textAlign: 'right' }}>เป้า</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((r, i) => {
                      const rank = i + 4;
                      const isMe = r.userId === currentUserId;
                      return (
                        <tr key={r.userId} style={isMe ? { background: 'rgba(47,160,132,0.06)' } : undefined}>
                          <td data-label="อันดับ" className="fw-700" style={{ color: 'var(--text-muted)' }}>
                            #{rank}
                          </td>
                          <td data-label="ชื่อ" className="fw-600">
                            {r.fullName}
                            {isMe && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>(คุณ)</span>}
                            {r.teamName && <div className="text-sm text-muted" style={{ fontSize: 11 }}>{r.teamName}</div>}
                          </td>
                          <td data-label="ยอดขายรวม" className="fw-700" style={{ textAlign: 'right', color: 'var(--primary)' }}>
                            ฿{r.totalRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                          </td>
                          <td data-label="ลูกค้าใหม่" className="text-sm" style={{ textAlign: 'right' }}>
                            ฿{r.newCustRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.newCustOrders} ออเดอร์</div>
                          </td>
                          <td data-label="รีออเดอร์" className="text-sm" style={{ textAlign: 'right' }}>
                            ฿{r.reorderRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.reorderOrders} ออเดอร์</div>
                          </td>
                          <td data-label="Task เสร็จ" className="text-sm" style={{ textAlign: 'right' }}>
                            {r.tasksDone}
                          </td>
                          <td data-label="เป้า" className="text-sm" style={{ textAlign: 'right' }}>
                            <GoalBar percent={r.goalPercent} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function SummaryKpi({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="flex-between mb-2">
        <span className="text-sm text-muted">{label}</span>
        <i className={icon} style={{ color, fontSize: 20 }}></i>
      </div>
      <div className="fw-700" style={{ fontSize: 22, color }}>{value}</div>
    </div>
  );
}

const MEDAL_STYLE: Record<number, { bg: string; color: string; emoji: string; height: number }> = {
  1: { bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#fff', emoji: '🥇', height: 220 },
  2: { bg: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)', color: '#fff', emoji: '🥈', height: 190 },
  3: { bg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#fff', emoji: '🥉', height: 170 },
};

function PodiumCard({ rank, stats, isMe }: { rank: 1 | 2 | 3; stats: SalesStats; isMe: boolean }) {
  const style = MEDAL_STYLE[rank];
  return (
    <div
      className="card podium-card"
      style={{
        background: style.bg,
        color: style.color,
        padding: '1rem 1rem',
        minHeight: style.height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
      }}
    >
      <div>
        <div style={{ fontSize: 36, lineHeight: 1 }}>{style.emoji}</div>
        <div className="fw-700" style={{ fontSize: 15, marginTop: 6, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
          {stats.fullName}
          {isMe && <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>(คุณ)</div>}
        </div>
        {stats.teamName && (
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{stats.teamName}</div>
        )}
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div className="fw-800" style={{ fontSize: 22, marginBottom: 4 }}>
          ฿{stats.totalRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
        </div>
        <div style={{ fontSize: 11, opacity: 0.9, display: 'flex', justifyContent: 'space-around', gap: 4, flexWrap: 'wrap' }}>
          <span>📦 {stats.totalOrders}</span>
          <span>🔄 {stats.reorderOrders}</span>
          <span>✅ {stats.tasksDone}</span>
        </div>
      </div>
    </div>
  );
}

function GoalBar({ percent }: { percent: number }) {
  const capped = Math.min(100, Math.max(0, percent));
  const color = percent >= 100 ? 'var(--success)' : percent >= 70 ? '#f59e0b' : '#94a3b8';
  return (
    <div style={{ minWidth: 80 }}>
      <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${capped}%`, background: color, transition: 'width 200ms' }} />
      </div>
      <div style={{ fontSize: 10, marginTop: 2, color }}>{percent.toFixed(0)}%</div>
    </div>
  );
}
