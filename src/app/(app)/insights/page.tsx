import { getCurrentUser, getOrderFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { STAGE_LABELS, aggregateOrdersByPhone, tallyStages } from '@/lib/customer';
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

export default async function InsightsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = (await getCurrentUser())!;
  const params = await searchParams;
  const isAdmin = user.role === 'ADMIN';
  const isLeader = user.role === 'LEADER';

  const range = parseRange(params.range, 'month');
  const view = isAdmin ? 'team' : parseView(params.view, 'team');
  const dateRange = resolveDateRange(range);

  const orderFilter = (await getOrderFilter(user, view)) ?? {};
  const phoneAggs = await aggregateOrdersByPhone(orderFilter);
  const stageTally = tallyStages(phoneAggs);

  const [
    velocity, hotCustomers, trend, channelMix, bestProducts,
    revenueForecast, teamBattle, funnel, productPerf,
  ] = await Promise.all([
    isAdmin ? Promise.resolve(null) : getVelocity(user),
    isAdmin ? Promise.resolve([]) : getHotCustomers(user, 8),
    isAdmin ? Promise.resolve([]) : getMonthTrend(user),
    isAdmin ? Promise.resolve([]) : getChannelMix(user, dateRange, view),
    isAdmin ? Promise.resolve([]) : getBestProducts(user, 8, dateRange, view),
    isAdmin ? getRevenueForecast() : Promise.resolve(null),
    isAdmin ? getTeamBattle() : Promise.resolve([]),
    isAdmin ? getAcquisitionFunnel() : Promise.resolve(null),
    isAdmin ? getProductPerformance(10, dateRange) : Promise.resolve([]),
  ]);

  const stageColors: Record<string, string> = {
    VIP: '#C9A961', NEW: '#5B7E92', ACTIVE: '#4A7C5E',
    AT_RISK: '#C09155', LAPSED: '#715B7E', LOST: '#B85450',
  };
  const stageCounts = Object.entries(stageTally)
    .map(([stage, count]) => ({
      stage,
      label: STAGE_LABELS[stage as keyof typeof STAGE_LABELS],
      count,
      color: stageColors[stage] ?? '#ccc',
    }))
    .filter(s => s.count > 0);

  return (
    <>
      <div className="page-header flex-between mb-4">
        <div>
          <h1 className="page-title">สถิติเชิงลึก</h1>
          <p className="text-sm text-muted mt-1">วิเคราะห์ผลลัพธ์ในมุมต่างๆ — {dateRange.label}</p>
        </div>
        <Link href="/" className="btn btn-secondary" style={{ fontSize: 13 }}>
          <i className="ri-arrow-left-line"></i> กลับแดชบอร์ด
        </Link>
      </div>

      <DashboardFilters
        range={range}
        view={view}
        showViewToggle={isLeader}
        rangeLabel={dateRange.label}
      />

      {/* ──── SALES analytics ──── */}
      {!isAdmin && velocity && <VelocityCard stats={velocity} name={user.fullName.split(' ')[0]} />}
      {!isAdmin && trend.length > 0 && <TrendChart points={trend} />}

      {!isAdmin && (channelMix.length > 0 || bestProducts.length > 0) && (
        <div className="dash-2col">
          {channelMix.length > 0 && <ChannelMixWidget slices={channelMix} />}
          {bestProducts.length > 0 && <BestProductsWidget products={bestProducts} />}
        </div>
      )}

      {!isAdmin && hotCustomers.length > 0 && <HotCustomersWidget customers={hotCustomers} />}

      {/* ──── ADMIN analytics ──── */}
      {isAdmin && revenueForecast && <RevenueForecastCard data={revenueForecast} />}
      {isAdmin && teamBattle.length > 0 && <TeamBattleWidget rows={teamBattle} />}
      {isAdmin && funnel && <FunnelWidget data={funnel} />}
      {isAdmin && productPerf.length > 0 && <ProductPerformanceTable products={productPerf} />}

      {/* Stage distribution */}
      {stageCounts.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="fw-600 mb-3" style={{ fontSize: 15, margin: 0, marginBottom: '0.85rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            การกระจายเกรดลูกค้า
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {stageCounts.map(s => (
              <Link
                key={s.stage}
                href={`/customers?stage=${s.stage}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: s.color + '14', color: s.color,
                  borderRadius: 20, padding: '0.35rem 0.85rem', fontSize: 12, fontWeight: 600,
                  textDecoration: 'none', border: `1px solid ${s.color}33`,
                }}
              >
                {s.label} <span style={{ fontWeight: 700 }}>{s.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
