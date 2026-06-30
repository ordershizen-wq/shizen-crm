'use client';

import { useEffect, useRef } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

// ── ฟอนต์ + สีฐานของกราฟทั้งหมด (ให้เข้าชุดกับเว็บ) ──
Chart.defaults.font.family = "'Anuphan', 'Plus Jakarta Sans', sans-serif";
Chart.defaults.color = '#8E8AA8';

// palette ผูกกับแบรนด์ indigo จริง
const C = {
  revenue: '#6366F1',
  orders: '#10B981',
  grid: 'rgba(30,27,48,0.06)',
  tick: '#8E8AA8',
  cardBg: '#FFFFFF',
};

// tooltip เข้ม มุมมน ใช้ซ้ำทั้ง 2 กราฟ
const tooltipStyle = {
  backgroundColor: '#1E1B30',
  titleColor: '#F7F7FB',
  bodyColor: '#F7F7FB',
  cornerRadius: 10,
  padding: 10,
  boxPadding: 4,
  usePointStyle: true,
  borderWidth: 0,
  titleFont: { size: 12, weight: 600 as const },
  bodyFont: { size: 12 },
};

export type DailyRevenue = { label: string; revenue: number; orders: number };
export type StageCount = { stage: string; label: string; count: number; color: string };

type Props = {
  dailyRevenue: DailyRevenue[];
  stageCounts: StageCount[];
  revenueTitle?: string;
};

export default function DashboardCharts({ dailyRevenue, stageCounts, revenueTitle }: Props) {
  return (
    <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', marginBottom: '1.5rem' }}>
      <RevenueChart data={dailyRevenue} title={revenueTitle} />
      <StageChart data={stageCounts} />
    </div>
  );
}

function RevenueChart({ data, title }: { data: DailyRevenue[]; title?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    chartRef.current?.destroy();

    // gradient fill ใต้เส้นรายได้
    const ctx = canvas.getContext('2d');
    let revenueFill: CanvasGradient | string = C.revenue + '22';
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 240);
      g.addColorStop(0, 'rgba(99,102,241,0.22)');
      g.addColorStop(1, 'rgba(99,102,241,0)');
      revenueFill = g;
    }

    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: 'รายได้ (฿)',
            data: data.map(d => d.revenue),
            borderColor: C.revenue,
            backgroundColor: revenueFill,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: C.revenue,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            fill: true,
            tension: 0.4,
            yAxisID: 'y',
          },
          {
            label: 'ออเดอร์',
            data: data.map(d => d.orders),
            borderColor: C.orders,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointBackgroundColor: C.orders,
            fill: false,
            tension: 0.4,
            yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 700, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 14, font: { size: 12 } },
          },
          tooltip: {
            ...tooltipStyle,
            callbacks: {
              label(ctx) {
                if (ctx.datasetIndex === 0) {
                  return ` ฿${Number(ctx.raw).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
                }
                return ` ${ctx.raw} ออเดอร์`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { size: 11 }, color: C.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
          },
          y: {
            position: 'left',
            grid: { color: C.grid },
            border: { display: false },
            ticks: {
              font: { size: 11 },
              color: C.tick,
              maxTicksLimit: 5,
              callback: (v) => `฿${Number(v).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`,
            },
          },
          y2: {
            position: 'right',
            grid: { drawOnChartArea: false },
            border: { display: false },
            ticks: { font: { size: 11 }, color: C.tick, maxTicksLimit: 5 },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [data]);

  return (
    <div className="card p-4">
      <h3 className="fw-600 mb-3" style={{ fontSize: 15 }}>
        <i className="ri-line-chart-line text-blue"></i> {title ?? 'รายได้ย้อนหลัง 30 วัน'}
      </h3>
      <div style={{ height: 240, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function StageChart({ data }: { data: StageCount[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const active = data.filter(d => d.count > 0);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: active.map(d => d.label),
        datasets: [{
          data: active.map(d => d.count),
          backgroundColor: active.map(d => d.color ?? '#ccc'),
          borderWidth: 2,
          borderColor: C.cardBg,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        animation: { animateRotate: true, animateScale: true, duration: 700, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 10, font: { size: 11 } },
          },
          tooltip: {
            ...tooltipStyle,
            callbacks: {
              label(ctx) {
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((ctx.raw as number) / total * 100).toFixed(1) : '0';
                return ` ${ctx.raw} ราย (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [data]);

  return (
    <div className="card p-4">
      <h3 className="fw-600 mb-3" style={{ fontSize: 15 }}>
        <i className="ri-pie-chart-2-line text-orange"></i> กระจายลูกค้าตาม Stage
      </h3>
      <div style={{ height: 240, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
