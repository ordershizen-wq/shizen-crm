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

export type DailyRevenue = { label: string; revenue: number; orders: number };
export type StageCount = { stage: string; label: string; count: number; color: string };

type Props = {
  dailyRevenue: DailyRevenue[];
  stageCounts: StageCount[];
};

export default function DashboardCharts({ dailyRevenue, stageCounts }: Props) {
  return (
    <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', marginBottom: '1.5rem' }}>
      <RevenueChart data={dailyRevenue} />
      <StageChart data={stageCounts} />
    </div>
  );
}

function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: 'รายได้ (฿)',
            data: data.map(d => d.revenue),
            borderColor: '#4e73df',
            backgroundColor: 'rgba(78,115,223,0.08)',
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: '#4e73df',
            fill: true,
            tension: 0.4,
            yAxisID: 'y',
          },
          {
            label: 'ออเดอร์',
            data: data.map(d => d.orders),
            borderColor: '#1cc88a',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 2,
            pointBackgroundColor: '#1cc88a',
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
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 12, family: "'Prompt', sans-serif" }, boxWidth: 16, padding: 12 },
          },
          tooltip: {
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
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 11, family: "'Prompt', sans-serif" }, maxRotation: 45 },
          },
          y: {
            position: 'left',
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: {
              font: { size: 11, family: "'Prompt', sans-serif" },
              callback: (v) => `฿${Number(v).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`,
            },
          },
          y2: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 11, family: "'Prompt', sans-serif" } },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [data]);

  return (
    <div className="card p-4">
      <h3 className="fw-600 mb-3" style={{ fontSize: 15 }}>
        <i className="ri-line-chart-line text-blue"></i> รายได้ย้อนหลัง 30 วัน
      </h3>
      <div style={{ height: 240, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

const STAGE_COLORS: Record<string, string> = {
  VIP: '#f6c90e',
  NEW: '#4e73df',
  ACTIVE: '#1cc88a',
  AT_RISK: '#f8961e',
  LAPSED: '#6f42c1',
  LOST: '#e74a3b',
};

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
          backgroundColor: active.map(d => STAGE_COLORS[d.stage] ?? '#ccc'),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11, family: "'Prompt', sans-serif" }, boxWidth: 12, padding: 8 },
          },
          tooltip: {
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
