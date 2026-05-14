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
import MyPerformance from '@/components/MyPerformance';
import { getLeaderboard } from '@/lib/teamStats';
import VelocityCard from '@/components/dashboard/VelocityCard';
import HotCustomersWidget from '@/components/dashboard/HotCustomersWidget';
import TrendChart from '@/components/dashboard/TrendChart';
import ChannelMixWidget from '@/components/dashboard/ChannelMixWidget';
import BestProductsWidget from '@/components/dashboard/BestProductsWidget';
import RevenueForecastCard from '@/components/dashboard/RevenueForecast';
import TeamBattleWidget from '@/components/dashboard/TeamBattleWidget';
import FunnelWidget from '@/components/dashboard/FunnelWidget';
import ProductPerformanceTable from '@/components/dashboard/ProductPerformanceTable';
import {
  getVelocity, getHotCustomers, getMonthTrend, getChannelMix, getBestProducts,
  getRevenueForecast, getTeamBattle, getAcquisitionFunnel, getProductPerformance,
} from '@/lib/analytics';
import { parseRange, parseView, resolveDateRange } from '@/lib/dashboardFilters';
import DashboardFilters from '@/components/dashboard/DashboardFilters';

type SearchParams = Promise<{ range?: string; view?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = (await getCurrentUser())!;
  const params = await searchParams;
  const isAdmin = user.role === 'ADMIN';
  const isLeader = user.role === 'LEADER';

  // Parse filter params
  const range = parseRange(params.range, 'month');
  // ADMIN: ไม่มี view toggle → ignore; LEADER: default 'team'; MEMBER: ของตัวเองเสมอ
  const view = isAdmin ? 'team' : parseView(params.view, isLeader ? 'team' : 'team');
  const dateRange = resolveDateRange(range);

  const orderFilter = (await getOrderFilter(user, view)) ?? {};

  // Build where clauses ใส่ date filter เมื่อมี range
  const rangeWhere = dateRange.start && dateRange.end
    ? { createdAt: { gte: dateRange.start, lt: dateRange.end } }
    : {};
  const prevWhere = dateRange.prevStart && dateRange.prevEnd
    ? { createdAt: { gte: dateRange.prevStart, lt: dateRange.prevEnd } }
    : null;

  const filteredWhere = { ...orderFilter, ...rangeWhere };

  // ทุก aggregate ทำใน DB
  const [totalOrders, revenue, recentOrders, prevAgg, phoneAggs, sourceBreakdown] = await Promise.all([
    prisma.sheetOrder.count({ where: filteredWhere }),
    prisma.sheetOrder.aggregate({ where: filteredWhere, _sum: { totalPrice: true } }),
    prisma.sheetOrder.findMany({
      where: filteredWhere,
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        customerName: true,
        phone: true,
        totalPrice: true,
        status: true,
        channel: true,
        salesRepName: true,
        createdAt: true,
        source: true,
      },
    }),
    prevWhere
      ? prisma.sheetOrder.aggregate({ where: { ...orderFilter, ...prevWhere }, _sum: { totalPrice: true }, _count: true })
      : Promise.resolve(null),
    // GROUP BY phone (ตลอดกาล — สำหรับ stage distribution)
    aggregateOrdersByPhone(orderFilter),
    // Source split ตาม range ที่เลือก
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

  // Chart data: daily revenue ภายใน range (ถ้ามี range)
  const chartOrders = dateRange.start && dateRange.end
    ? await prisma.sheetOrder.findMany({
        where: filteredWhere,
        select: { totalPrice: true, createdAt: true },
      })
    : await prisma.sheetOrder.findMany({
        where: { ...orderFilter, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
        select: { totalPrice: true, createdAt: true },
      });

  // Focus + Analytics widgets — แยกตาม role + ส่ง dateRange + view
  const [
    focus, adminFocus, leaderboard,
    velocity, hotCustomers, trend, channelMix, bestProducts,
    revenueForecast, teamBattle, funnel, productPerf,
  ] = await Promise.all([
    isAdmin ? Promise.resolve(null) : getTodaysFocus(user),
    isAdmin ? getAdminFocus() : Promise.resolve(null),
    getLeaderboard(user),
    // Sales analytics — สำหรับ MEMBER/LEADER เท่านั้น (ใช้ view + dateRange)
    isAdmin ? Promise.resolve(null) : getVelocity(user),
    isAdmin ? Promise.resolve([]) : getHotCustomers(user, 5),
    isAdmin ? Promise.resolve([]) : getMonthTrend(user),
    isAdmin ? Promise.resolve([]) : getChannelMix(user, dateRange, view),
    isAdmin ? Promise.resolve([]) : getBestProducts(user, 5, dateRange, view),
    // Admin analytics
    isAdmin ? getRevenueForecast() : Promise.resolve(null),
    isAdmin ? getTeamBattle() : Promise.resolve([]),
    isAdmin ? getAcquisitionFunnel() : Promise.resolve(null),
    isAdmin ? getProductPerformance(10, dateRange) : Promise.resolve([]),
  ]);
  const myStats = leaderboard.rows.find(r => r.userId === user.id) ?? null;

  const totalRevenue = Number(revenue._sum.totalPrice ?? 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Growth: เทียบกับช่วงก่อนหน้าตาม range
  const prevRev = prevAgg ? Number(prevAgg._sum.totalPrice ?? 0) : 0;
  const prevCount = prevAgg ? prevAgg._count : 0;
  const revGrowth = prevRev > 0 ? ((totalRevenue - prevRev) / prevRev) * 100 : 0;

  // --- Chart data: aggregate ตามช่วง (เดือนเล็กลง = รายวัน, ปี = รายเดือน) ---
  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  const useMonthBuckets = range === 'year';
  if (dateRange.start && dateRange.end && !useMonthBuckets) {
    // เติม buckets รายวัน
    const cur = new Date(dateRange.start);
    while (cur < dateRange.end && cur <= new Date()) {
      const key = cur.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      dailyMap.set(key, { revenue: 0, orders: 0 });
      cur.setDate(cur.getDate() + 1);
    }
  } else if (useMonthBuckets) {
    for (let m = 0; m < 12; m++) {
      const d = new Date(new Date().getFullYear(), m, 1);
      const key = d.toLocaleDateString('th-TH', { month: 'short' });
      dailyMap.set(key, { revenue: 0, orders: 0 });
    }
  } else {
    // ไม่มี range — ดู 30 วันล่าสุด
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      dailyMap.set(key, { revenue: 0, orders: 0 });
    }
  }

  for (const o of chartOrders) {
    const key = useMonthBuckets
      ? o.createdAt.toLocaleDateString('th-TH', { month: 'short' })
      : o.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const entry = dailyMap.get(key);
    if (entry) {
      entry.revenue += Number(o.totalPrice ?? 0);
      entry.orders += 1;
    }
  }

  const dailyRevenue: DailyRevenue[] = Array.from(dailyMap.entries()).map(([label, v]) => ({
    label,
    revenue: v.revenue,
    orders: v.orders,
  }));

  // --- Stage distribution ---
  const stageTally = tallyStages(phoneAggs);
  const customerCount = phoneAggs.length;

  const stageColors: Record<string, string> = {
    VIP: '#f6c90e', NEW: '#0ea5e9', ACTIVE: '#2FA084',
    AT_RISK: '#f8961e', LAPSED: '#6f42c1', LOST: '#e74a3b',
  };

  const stageCounts: StageCount[] = Object.entries(stageTally).map(([stage, count]) => ({
    stage,
    label: STAGE_LABELS[stage as keyof typeof STAGE_LABELS],
    count,
    color: stageColors[stage] ?? '#ccc',
  }));

  const teamLabel = user.role === 'ADMIN' ? 'ภาพรวมทั้งระบบ'
    : user.role === 'LEADER' ? `ภาพรวม ${user.team?.name ?? ''}`
    : `ลูกค้าของ ${user.fullName}`;

  return (
    <>
      <div className="page-header flex-between mb-4">
        <div>
          <h1 className="page-title">แดชบอร์ด</h1>
          <p className="text-sm text-muted mt-1">{teamLabel}</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!isAdmin && (
            <Link href="/tasks" className="btn btn-primary" style={{ fontSize: 13 }}>
              <i className="ri-task-line"></i> งานวันนี้
              {(stageTally.AT_RISK + stageTally.LAPSED) > 0 && (
                <span style={{
                  background: '#fff', color: 'var(--primary)', borderRadius: 20,
                  fontSize: 11, fontWeight: 700, padding: '0 6px', marginLeft: 4,
                }}>
                  {stageTally.AT_RISK + stageTally.LAPSED}
                </span>
              )}
            </Link>
          )}
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <i className="ri-calendar-line text-blue"></i>{' '}
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Dashboard filters — range + view (LEADER) */}
      <DashboardFilters
        range={range}
        view={view}
        showViewToggle={isLeader}
        rangeLabel={dateRange.label}
      />

      {/* Focus widget — ADMIN เห็น oversight, อื่นเห็น daily action */}
      {adminFocus
        ? <AdminFocus data={adminFocus} userName={user.fullName.split(' ')[0]} />
        : focus && <TodaysFocus data={focus} userName={user.fullName.split(' ')[0]} />}

      {/* ──── ADMIN analytics ──── */}
      {isAdmin && revenueForecast && <RevenueForecastCard data={revenueForecast} />}
      {isAdmin && teamBattle.length > 0 && <TeamBattleWidget rows={teamBattle} />}
      {isAdmin && funnel && <FunnelWidget data={funnel} />}

      {/* ──── SALES analytics ──── */}
      {!isAdmin && velocity && <VelocityCard stats={velocity} name={user.fullName.split(' ')[0]} />}
      {!isAdmin && hotCustomers.length > 0 && <HotCustomersWidget customers={hotCustomers} />}
      {!isAdmin && trend.length > 0 && <TrendChart points={trend} />}

      {/* My Performance — เซลส์เห็น rank ของตัวเอง */}
      {!isAdmin && (
        <MyPerformance
          stats={myStats}
          myRank={leaderboard.myRank}
          totalInScope={leaderboard.rows.length}
          monthLabel={leaderboard.monthLabel}
        />
      )}

      {/* 2-column row: Channel Mix + Best Products (เซลส์) */}
      {!isAdmin && (channelMix.length > 0 || bestProducts.length > 0) && (
        <div className="dash-2col">
          {channelMix.length > 0 && <ChannelMixWidget slices={channelMix} />}
          {bestProducts.length > 0 && <BestProductsWidget products={bestProducts} />}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem', maxWidth: '100%' }}>
        <KpiCard
          icon="ri-money-dollar-circle-line"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          label="ยอดขายรวม"
          value={`฿${totalRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`}
          sub={
            prevAgg
              ? (revGrowth !== 0 ? `${revGrowth > 0 ? '↑' : '↓'} ${Math.abs(revGrowth).toFixed(1)}% เทียบช่วงก่อน` : 'เทียบช่วงก่อน')
              : dateRange.label
          }
          subColor={revGrowth > 0 ? 'var(--success)' : revGrowth < 0 ? 'var(--danger)' : 'var(--text-muted)'}
        />
        <KpiCard
          icon="ri-shopping-bag-3-line"
          iconBg="var(--blue-light)"
          iconColor="var(--primary)"
          label="จำนวนออเดอร์"
          value={totalOrders.toLocaleString()}
          sub={prevAgg ? `เทียบ ${prevCount.toLocaleString()} รายการช่วงก่อน` : dateRange.label}
        />
        <KpiCard
          icon="ri-group-line"
          iconBg="var(--purple-light)"
          iconColor="#6f42c1"
          label="จำนวนลูกค้า"
          value={customerCount.toLocaleString()}
          sub="ไม่ซ้ำ (ตามเบอร์โทร)"
        />
        <KpiCard
          icon="ri-line-chart-line"
          iconBg="var(--orange-light)"
          iconColor="var(--orange)"
          label="เฉลี่ยต่อออเดอร์"
          value={`฿${avgOrderValue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`}
        />
      </div>

      {/* Source split — Acquisition vs Retention */}
      <div className="card p-4 mb-4">
        <div className="flex-between mb-3">
          <h3 className="fw-600" style={{ fontSize: 15, margin: 0, fontFamily: "'Trirong', serif", letterSpacing: '-0.01em' }}>
            ที่มาของออเดอร์ — {dateRange.label}
          </h3>
          <Link href="/orders" className="text-sm" style={{ color: 'var(--primary)' }}>
            ดูออเดอร์ทั้งหมด <i className="ri-arrow-right-line"></i>
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <SourceKpi
            source={OrderSource.SHEET}
            title="ลูกค้าใหม่ (ลง Sheet)"
            subtitle="Acquisition"
            revenue={newCustRev}
            count={newCustCount}
            share={periodTotal > 0 ? 100 - reorderShare : 0}
            href="/orders?source=SHEET"
          />
          <SourceKpi
            source={OrderSource.CRM_REORDER}
            title="รีออเดอร์ (ลง CRM)"
            subtitle="Retention"
            revenue={reorderRev}
            count={reorderCount}
            share={reorderShare}
            href="/orders?source=CRM_REORDER"
          />
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts dailyRevenue={dailyRevenue} stageCounts={stageCounts} />

      {/* Product Performance table — เฉพาะ ADMIN */}
      {isAdmin && productPerf.length > 0 && <ProductPerformanceTable products={productPerf} />}

      {/* Stage summary pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {stageCounts.filter(s => s.count > 0).map(s => (
          <Link
            key={s.stage}
            href={`/customers?stage=${s.stage}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: stageColors[s.stage] + '18', color: stageColors[s.stage],
              borderRadius: 20, padding: '0.3rem 0.85rem', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', border: `1px solid ${stageColors[s.stage]}44`,
              transition: 'opacity 0.15s',
            }}
          >
            {s.label} <span style={{ fontWeight: 700 }}>{s.count}</span>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="card" style={{ padding: 0 }}>
        <div className="flex-between" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
          <h3 className="fw-600" style={{ fontSize: 15 }}>
            <i className="ri-history-line text-blue"></i> ออเดอร์ล่าสุด
          </h3>
          <Link href="/orders" className="text-sm" style={{ color: 'var(--primary)' }}>
            ดูทั้งหมด <i className="ri-arrow-right-line"></i>
          </Link>
        </div>
        <div className="r-table-wrap">
          <table className="r-table">
            <thead>
              <tr>
                <th>ลูกค้า</th>
                <th>เซลส์</th>
                <th>ช่องทาง</th>
                <th>สถานะ</th>
                <th style={{ textAlign: 'right' }}>ยอด</th>
                <th>วันที่</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="r-cell-block" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    ยังไม่มีออเดอร์
                  </td>
                </tr>
              ) : (
                recentOrders.map(o => (
                  <tr key={o.id}>
                    <td data-label="ลูกค้า">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {o.phone ? (
                            <Link href={`/customers/${o.phone}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                              {o.customerName || '-'}
                            </Link>
                          ) : (
                            o.customerName || '-'
                          )}
                          <SourceBadge source={o.source} compact />
                        </div>
                        {o.phone && <div className="text-sm text-muted">{o.phone}</div>}
                      </div>
                    </td>
                    <td className="text-sm" data-label="เซลส์">{o.salesRepName || '-'}</td>
                    <td className="text-sm" data-label="ช่องทาง">{o.channel || '-'}</td>
                    <td data-label="สถานะ"><StatusBadge status={o.status} /></td>
                    <td className="fw-600" data-label="ยอด" style={{ textAlign: 'right' }}>
                      ฿{Number(o.totalPrice ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="text-sm text-muted" data-label="วันที่">
                      {o.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function KpiCard({ icon, iconBg, iconColor, label, value, sub, subColor }: {
  icon: string; iconBg: string; iconColor: string;
  label: string; value: string; sub?: string; subColor?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex-between mb-3">
        <span className="text-sm text-muted fw-500">{label}</span>
        <div className="icon-box rounded-circle" style={{ background: iconBg, color: iconColor, width: 40, height: 40, fontSize: '1.1rem' }}>
          <i className={icon}></i>
        </div>
      </div>
      <div className="fw-700" style={{ fontSize: 24, color: 'var(--text-dark)' }}>{value}</div>
      {sub && <div className="text-sm mt-1" style={{ color: subColor ?? 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    PAID: { bg: 'var(--success-light)', color: 'var(--success)', label: 'ชำระแล้ว' },
    PACKED: { bg: 'var(--blue-light)', color: 'var(--primary)', label: 'แพ็คแล้ว' },
    COD: { bg: 'var(--warning-light)', color: '#d39e00', label: 'COD' },
    PENDING: { bg: 'var(--purple-light)', color: '#6f42c1', label: 'รอดำเนินการ' },
    RETURNED: { bg: 'var(--danger-light)', color: 'var(--danger)', label: 'ตีกลับ' },
    CANCELLED: { bg: 'var(--danger-light)', color: 'var(--danger)', label: 'ยกเลิก' },
    OTHER: { bg: '#f1f5f9', color: '#64748b', label: 'อื่นๆ' },
  };
  const c = config[status] ?? config.OTHER;
  return <span className="status-badge" style={{ background: c.bg, color: c.color }}>{c.label}</span>;
}

const stageColors: Record<string, string> = {
  VIP: '#f6c90e', NEW: '#0ea5e9', ACTIVE: '#2FA084',
  AT_RISK: '#f8961e', LAPSED: '#6f42c1', LOST: '#e74a3b',
};

function SourceKpi({
  source, title, subtitle, revenue, count, share, href,
}: {
  source: OrderSource;
  title: string;
  subtitle: string;
  revenue: number;
  count: number;
  share: number;
  href: string;
}) {
  const accent = source === OrderSource.SHEET ? 'var(--info)' : 'var(--primary)';
  const tint   = source === OrderSource.SHEET ? 'var(--info-light)' : 'var(--primary-light)';
  return (
    <Link
      href={href}
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        background: tint, border: `1.5px solid ${accent}33`,
        borderRadius: 12, padding: '0.85rem 1rem',
      }}
    >
      <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <SourceBadge source={source} />
          <div className="text-sm fw-600 mt-1" style={{ color: 'var(--text-dark)', marginTop: 6 }}>{title}</div>
          <div className="text-sm text-muted" style={{ fontSize: 11 }}>{subtitle}</div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, color: accent,
          background: '#fff', borderRadius: 999, padding: '0.15rem 0.5rem',
        }}>
          {share.toFixed(0)}%
        </div>
      </div>
      <div className="fw-700" style={{ fontSize: 22, color: accent, lineHeight: 1.1 }}>
        ฿{revenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
      </div>
      <div className="text-sm text-muted" style={{ marginTop: 2 }}>
        {count.toLocaleString()} ออเดอร์
      </div>
    </Link>
  );
}
