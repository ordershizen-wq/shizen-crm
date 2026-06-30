import { getCurrentUser, getOrderFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { STAGE_LABELS, aggregateOrdersByPhone, tallyStages } from '@/lib/customer';
import DashboardCharts, { type DailyRevenue, type StageCount } from './DashboardCharts';
import SourceBadge from '@/components/SourceBadge';
import { OrderSource } from '@prisma/client';
import TodaysFocus from '@/components/TodaysFocus';
import AdminFocus from '@/components/AdminFocus';
import { getTodaysFocus, getAdminFocus } from '@/lib/todaysFocus';
import { getLeaderboard } from '@/lib/teamStats';
import { parseView, resolveRange, toYmd } from '@/lib/dashboardFilters';
import DashboardFilters from '@/components/dashboard/DashboardFilters';

type SearchParams = Promise<{ range?: string; view?: string; from?: string; to?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = (await getCurrentUser())!;
  const params = await searchParams;
  const isAdmin = user.role === 'ADMIN';
  const isLeader = user.role === 'LEADER';

  const { range, dateRange, from, to } = resolveRange(params);
  const view = isAdmin ? 'team' : parseView(params.view, 'team');

  const orderFilter = (await getOrderFilter(user, view)) ?? {};

  const rangeWhere = dateRange.start && dateRange.end
    ? { createdAt: { gte: dateRange.start, lt: dateRange.end } }
    : {};
  const prevWhere = dateRange.prevStart && dateRange.prevEnd
    ? { createdAt: { gte: dateRange.prevStart, lt: dateRange.prevEnd } }
    : null;

  const filteredWhere = { ...orderFilter, ...rangeWhere };

  const [totalOrders, revenue, recentOrders, prevAgg, phoneAggs, sourceBreakdown] = await Promise.all([
    prisma.sheetOrder.count({ where: filteredWhere }),
    prisma.sheetOrder.aggregate({ where: filteredWhere, _sum: { totalPrice: true } }),
    prisma.sheetOrder.findMany({
      where: filteredWhere,
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, customerName: true, phone: true, totalPrice: true,
        status: true, salesRepName: true, createdAt: true, source: true,
      },
    }),
    prevWhere
      ? prisma.sheetOrder.aggregate({ where: { ...orderFilter, ...prevWhere }, _sum: { totalPrice: true }, _count: true })
      : Promise.resolve(null),
    aggregateOrdersByPhone(orderFilter),
    prisma.sheetOrder.groupBy({
      by: ['source'],
      where: filteredWhere,
      _sum: { totalPrice: true },
      _count: true,
    }),
  ]);

  const sourceMap = new Map(sourceBreakdown.map(r => [r.source, r]));
  const newCustRev = Number(sourceMap.get(OrderSource.SHEET)?._sum.totalPrice ?? 0);
  const newCustCount = sourceMap.get(OrderSource.SHEET)?._count ?? 0;
  const reorderRev = Number(sourceMap.get(OrderSource.CRM_REORDER)?._sum.totalPrice ?? 0);
  const reorderCount = sourceMap.get(OrderSource.CRM_REORDER)?._count ?? 0;
  const periodTotal = newCustRev + reorderRev;
  const reorderShare = periodTotal > 0 ? (reorderRev / periodTotal) * 100 : 0;

  const chartOrders = dateRange.start && dateRange.end
    ? await prisma.sheetOrder.findMany({
        where: filteredWhere,
        select: { totalPrice: true, createdAt: true },
      })
    : await prisma.sheetOrder.findMany({
        where: { ...orderFilter, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
        select: { totalPrice: true, createdAt: true },
      });

  const [focus, adminFocus, leaderboard] = await Promise.all([
    isAdmin ? Promise.resolve(null) : getTodaysFocus(user),
    isAdmin ? getAdminFocus() : Promise.resolve(null),
    getLeaderboard(user),
  ]);

  const totalRevenue = Number(revenue._sum.totalPrice ?? 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const prevRev = prevAgg ? Number(prevAgg._sum.totalPrice ?? 0) : 0;
  const revGrowth = prevRev > 0 ? ((totalRevenue - prevRev) / prevRev) * 100 : 0;

  // Chart buckets
  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  const spanDays = dateRange.start && dateRange.end
    ? (dateRange.end.getTime() - dateRange.start.getTime()) / 86400000
    : 0;
  // ช่วง custom ที่ยาวเกิน ~3 เดือน → สรุปเป็นรายเดือนเพื่อไม่ให้กราฟมีแท่งเยอะเกินไป
  const isCustomLong = range === 'custom' && spanDays > 92;
  const useMonthBuckets = range === 'year' || isCustomLong;
  const monthKey = (d: Date) => d.toLocaleDateString('th-TH', isCustomLong
    ? { month: 'short', year: '2-digit' }
    : { month: 'short' });

  if (dateRange.start && dateRange.end && !useMonthBuckets) {
    const cur = new Date(dateRange.start);
    while (cur < dateRange.end && cur <= new Date()) {
      const key = cur.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      dailyMap.set(key, { revenue: 0, orders: 0 });
      cur.setDate(cur.getDate() + 1);
    }
  } else if (isCustomLong && dateRange.start && dateRange.end) {
    const cur = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), 1);
    while (cur < dateRange.end && cur <= new Date()) {
      dailyMap.set(monthKey(cur), { revenue: 0, orders: 0 });
      cur.setMonth(cur.getMonth() + 1);
    }
  } else if (useMonthBuckets) {
    for (let m = 0; m < 12; m++) {
      const d = new Date(new Date().getFullYear(), m, 1);
      dailyMap.set(monthKey(d), { revenue: 0, orders: 0 });
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      dailyMap.set(key, { revenue: 0, orders: 0 });
    }
  }
  for (const o of chartOrders) {
    const key = useMonthBuckets
      ? monthKey(o.createdAt)
      : o.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const entry = dailyMap.get(key);
    if (entry) {
      entry.revenue += Number(o.totalPrice ?? 0);
      entry.orders += 1;
    }
  }
  const dailyRevenue: DailyRevenue[] = Array.from(dailyMap.entries()).map(([label, v]) => ({
    label, revenue: v.revenue, orders: v.orders,
  }));

  const stageTally = tallyStages(phoneAggs);
  const customerCount = phoneAggs.length;
  const stageColors: Record<string, string> = {
    VIP: '#C9A961', NEW: '#5B7E92', ACTIVE: '#4A7C5E',
    AT_RISK: '#C09155', LAPSED: '#715B7E', LOST: '#B85450',
  };
  const stageCounts: StageCount[] = Object.entries(stageTally).map(([stage, count]) => ({
    stage,
    label: STAGE_LABELS[stage as keyof typeof STAGE_LABELS],
    count,
    color: stageColors[stage] ?? '#ccc',
  }));

  const teamLabel = isAdmin ? 'ภาพรวมทั้งระบบ'
    : isLeader ? `ภาพรวม ${user.team?.name ?? ''}`
    : `ผลงานของ ${user.fullName}`;

  // ชื่อกราฟรายได้ให้ตรงกับสิ่งที่พล็อตจริง (อย่า hardcode "30 วัน")
  const revenueTitle = !dateRange.start
    ? 'รายได้ 30 วันล่าสุด'
    : useMonthBuckets
      ? `รายได้รายเดือน · ${dateRange.label}`
      : `รายได้ · ${dateRange.label}`;

  const topFive = leaderboard.rows.slice(0, 5);

  return (
    <>
      {/* Page header */}
      <div className="page-header flex-between mb-4">
        <div>
          <h1 className="page-title">แดชบอร์ด</h1>
          <p className="text-sm text-muted mt-1">{teamLabel}</p>
        </div>
        <div className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <i className="ri-calendar-line"></i>
          {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Filters */}
      <DashboardFilters
        range={range}
        view={view}
        showViewToggle={isLeader}
        rangeLabel={dateRange.label}
        initialFrom={from ?? (dateRange.start ? toYmd(dateRange.start) : undefined)}
        initialTo={to ?? (dateRange.end ? toYmd(new Date(dateRange.end.getTime() - 86400000)) : undefined)}
      />

      {/* ════ KPI Bento (ฮีโร่ยอดขาย + 3 ใบเล็ก) — clean card ════ */}
      <div className="kpi-bento kpi-bento-clean mb-4">
        <KpiHero
          label="ยอดขาย"
          value={`฿${totalRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`}
          delta={prevAgg ? revGrowth : null}
          subLabel={dateRange.label}
          series={dailyRevenue.map((d) => d.revenue)}
        />
        <KpiPastel
          tint="lavender"
          label="ออเดอร์"
          value={totalOrders.toLocaleString()}
          delta={prevAgg && prevAgg._count > 0 ? ((totalOrders - prevAgg._count) / prevAgg._count) * 100 : null}
          subLabel={`${recentOrders.length > 0 ? recentOrders.length : 0} ล่าสุด`}
        />
        <KpiPastel
          tint="mint"
          label="ลูกค้า"
          value={customerCount.toLocaleString()}
          subLabel="ทั้งหมด · ตามเบอร์"
        />
        <KpiPastel
          tint="butter"
          label="เฉลี่ย/ออเดอร์"
          value={`฿${avgOrderValue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`}
          subLabel="AOV"
        />
      </div>

      {/* ════ Tasks Hero (งานวันนี้ — full width) ════ */}
      <div className="mb-4">
        {adminFocus
          ? <AdminFocus data={adminFocus} userName={user.fullName.split(' ')[0]} />
          : focus && <TodaysFocus data={focus} userName={user.fullName.split(' ')[0]} />}
      </div>

      {/* Source split — Acquisition vs Retention */}
      <div className="card mb-4" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex-between mb-3">
          <h3 style={{ fontSize: 14, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em', color: 'var(--text-dark)', fontWeight: 600 }}>
            ที่มาของออเดอร์ — {dateRange.label}
          </h3>
          <Link href="/orders" className="text-sm" style={{ color: 'var(--primary)' }}>
            ดูออเดอร์ทั้งหมด <i className="ri-arrow-right-line"></i>
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
          <SourceKpi
            source={OrderSource.SHEET}
            title="ลูกค้าใหม่"
            subtitle="Acquisition"
            revenue={newCustRev}
            count={newCustCount}
            share={periodTotal > 0 ? 100 - reorderShare : 0}
            href="/orders?source=SHEET"
          />
          <SourceKpi
            source={OrderSource.CRM_REORDER}
            title="ลูกค้าเก่ากลับมา"
            subtitle="Retention"
            revenue={reorderRev}
            count={reorderCount}
            share={reorderShare}
            href="/orders?source=CRM_REORDER"
          />
        </div>
      </div>

      {/* Main charts: trend + stage */}
      <DashboardCharts dailyRevenue={dailyRevenue} stageCounts={stageCounts} revenueTitle={revenueTitle} />

      {/* Bottom row: Recent orders | Top 5 */}
      <div className="dash-2col mt-4">
        <RecentOrdersCard orders={recentOrders} />
        <TopFiveCard rows={topFive} monthLabel={leaderboard.monthLabel} />
      </div>

      {/* Insights link */}
      <Link
        href="/insights"
        className="card insights-link"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', marginTop: '1.5rem',
          textDecoration: 'none', color: 'var(--text-dark)',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            ดูสถิติเชิงลึก
          </div>
          <div className="text-sm text-muted" style={{ marginTop: 2 }}>
            {isAdmin ? 'พยากรณ์รายได้ · funnel · เปรียบเทียบทีม · สินค้าขายดี'
                    : 'Velocity · ลูกค้าร้อน · ช่องทางที่ขายดี · สินค้าขายดี'}
          </div>
        </div>
        <i className="ri-arrow-right-line" style={{ fontSize: 20, color: 'var(--primary)' }}></i>
      </Link>
    </>
  );
}

/* ────────────────────────────────────────────
   KPI Pastel Card — Home Desk style
   ──────────────────────────────────────────── */
function KpiPastel({
  tint, label, value, delta, subLabel,
}: {
  tint: 'peach' | 'lavender' | 'mint' | 'butter';
  label: string;
  value: string;
  delta?: number | null;
  subLabel?: string;
}) {
  const hasDelta = delta != null && Number.isFinite(delta);
  const up = hasDelta && (delta as number) > 0;
  const down = hasDelta && (delta as number) < 0;
  return (
    <div className={`kpi-pastel kpi-pastel-${tint}`}>
      <div className="kpi-pastel-label">{label}</div>
      <div className="kpi-pastel-value">{value}</div>
      <div className="kpi-pastel-foot">
        {hasDelta ? (
          <span className={`kpi-pastel-delta ${up ? 'is-up' : down ? 'is-down' : ''}`}>
            {up ? '↑' : down ? '↓' : '·'} {Math.abs(delta as number).toFixed(1)}%
          </span>
        ) : (
          <span className="kpi-pastel-delta is-neutral">—</span>
        )}
        {subLabel && <span className="kpi-pastel-sub">{subLabel}</span>}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   KPI Hero — ใบฮีโร่ยอดขาย (bento) + sparkline
   ──────────────────────────────────────────── */
function KpiHero({
  label, value, delta, subLabel, series,
}: {
  label: string;
  value: string;
  delta?: number | null;
  subLabel?: string;
  series: number[];
}) {
  const hasDelta = delta != null && Number.isFinite(delta);
  const up = hasDelta && (delta as number) > 0;
  const down = hasDelta && (delta as number) < 0;
  return (
    <div className="kpi-hero">
      <div className="kpi-hero-label">
        {label}
        <span className="en">Revenue</span>
      </div>
      <div className="kpi-hero-value">{value}</div>
      <div className="kpi-hero-foot">
        {hasDelta ? (
          <span className={`kpi-hero-delta ${up ? 'is-up' : down ? 'is-down' : 'is-neutral'}`}>
            {up ? '↑' : down ? '↓' : '·'} {Math.abs(delta as number).toFixed(1)}%
          </span>
        ) : (
          <span className="kpi-hero-delta is-neutral">—</span>
        )}
        {subLabel && <span className="kpi-hero-sub">{subLabel}</span>}
      </div>
      <Sparkline series={series} />
    </div>
  );
}

/* SVG sparkline จาก array ตัวเลข (ภาพประกอบบนใบฮีโร่) */
function Sparkline({ series }: { series: number[] }) {
  if (!series || series.length < 2) return null;
  const w = 280;
  const h = 48;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;
  const step = w / (series.length - 1);
  const pts = series.map((v, i) => [i * step, h - ((v - min) / range) * h] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="kpiSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-revenue)" stopOpacity="0.20" />
          <stop offset="100%" stopColor="var(--chart-revenue)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#kpiSparkFill)" />
      <path className="kpi-spark-line" d={line} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ────────────────────────────────────────────
   Recent Orders Card — compact list
   ──────────────────────────────────────────── */
function RecentOrdersCard({ orders }: { orders: Array<{
  id: string; customerName: string | null; phone: string | null; totalPrice: unknown;
  status: string; salesRepName: string | null; createdAt: Date; source: OrderSource;
}> }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="flex-between" style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border-light)' }}>
        <h3 style={{ fontSize: 14, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em', color: 'var(--text-dark)', fontWeight: 600 }}>
          <i className="ri-history-line" style={{ color: 'var(--text-muted)', marginRight: 4 }}></i>
          ออเดอร์ล่าสุด
        </h3>
        <Link href="/orders" className="text-sm" style={{ color: 'var(--primary)' }}>
          ดูทั้งหมด →
        </Link>
      </div>
      <div style={{ padding: '0.25rem 0' }}>
        {orders.length === 0 ? (
          <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            ยังไม่มีออเดอร์
          </div>
        ) : (
          orders.map(o => (
            <Link
              key={o.id}
              href={o.phone ? `/customers/${o.phone}` : '/orders'}
              className="recent-order-row"
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="recent-order-name">
                  {o.customerName || '—'}
                  <SourceBadge source={o.source} compact />
                </div>
                <div className="recent-order-meta">
                  {o.salesRepName || '—'} · {o.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="recent-order-price">
                  ฿{Number(o.totalPrice ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </div>
                <StatusBadge status={o.status} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Top 5 Card — leaderboard summary
   ──────────────────────────────────────────── */
function TopFiveCard({ rows, monthLabel }: {
  rows: Array<{ userId: string; fullName: string; totalRevenue: number; totalOrders: number }>;
  monthLabel: string;
}) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="flex-between" style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border-light)' }}>
        <h3 style={{ fontSize: 14, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em', color: 'var(--text-dark)', fontWeight: 600 }}>
          <i className="ri-trophy-line" style={{ color: 'var(--gold, #C9A961)', marginRight: 4 }}></i>
          Top 5 เซลส์ — {monthLabel}
        </h3>
        <Link href="/insights?tab=leaderboard" className="text-sm" style={{ color: 'var(--primary)' }}>
          ดูทั้งหมด →
        </Link>
      </div>
      <div style={{ padding: '0.25rem 0' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            ยังไม่มีข้อมูล
          </div>
        ) : (
          rows.map((r, i) => (
            <div key={r.userId} className="top-five-row">
              <div className={`top-five-rank rank-${i + 1}`}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="top-five-name">{r.fullName}</div>
                <div className="top-five-meta">{r.totalOrders.toLocaleString()} ออเดอร์</div>
              </div>
              <div className="top-five-amount">
                ฿{r.totalRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Status / Source mini components
   ──────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    PAID:      { bg: 'var(--success-light)', color: 'var(--success)', label: 'ชำระแล้ว' },
    PACKED:    { bg: 'var(--blue-light)',    color: 'var(--info)',    label: 'แพ็คแล้ว' },
    COD:       { bg: 'var(--warning-light)', color: 'var(--warning)', label: 'COD' },
    PENDING:   { bg: 'var(--purple-light)',  color: 'var(--purple)',  label: 'รอ' },
    RETURNED:  { bg: 'var(--danger-light)',  color: 'var(--danger)',  label: 'ตีกลับ' },
    CANCELLED: { bg: 'var(--danger-light)',  color: 'var(--danger)',  label: 'ยกเลิก' },
    OTHER:     { bg: '#F1F3EF',              color: 'var(--text-muted)', label: 'อื่นๆ' },
  };
  const c = config[status] ?? config.OTHER;
  return <span className="status-badge" style={{ background: c.bg, color: c.color, fontSize: 10.5, padding: '2px 8px' }}>{c.label}</span>;
}

function SourceKpi({
  source, title, subtitle, revenue, count, share, href,
}: {
  source: OrderSource;
  title: string; subtitle: string;
  revenue: number; count: number; share: number; href: string;
}) {
  const accent = source === OrderSource.SHEET ? 'var(--info)' : 'var(--primary)';
  return (
    <Link
      href={href}
      className="source-kpi"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div className="source-kpi-title">{title}</div>
          <div className="source-kpi-subtitle">{subtitle}</div>
        </div>
        <div className="source-kpi-share" style={{ color: accent }}>
          {share.toFixed(0)}%
        </div>
      </div>
      <div className="source-kpi-revenue" style={{ color: accent }}>
        ฿{revenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
      </div>
      <div className="source-kpi-count">
        {count.toLocaleString()} ออเดอร์
      </div>
    </Link>
  );
}
