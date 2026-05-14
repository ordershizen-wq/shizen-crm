'use client';

import { useMemo } from 'react';
import type { TrendPoint } from '@/lib/analytics';

export default function TrendChart({ points }: { points: TrendPoint[] }) {
  const { width, paths, maxVal, todayDay, thisSum, lastSum } = useMemo(() => {
    const width = 600;
    const height = 160;
    const padding = { top: 12, right: 12, bottom: 22, left: 12 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const maxVal = Math.max(1, ...points.flatMap(p => [p.thisMonth, p.lastMonth]));

    const today = new Date().getDate();
    const xStep = innerW / Math.max(1, points.length - 1);

    const buildPath = (key: 'thisMonth' | 'lastMonth') =>
      points.map((p, i) => {
        const x = padding.left + i * xStep;
        const y = padding.top + innerH - (p[key] / maxVal) * innerH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ');

    const thisSum = points.reduce((s, p) => s + p.thisMonth, 0);
    const lastSum = points.reduce((s, p) => s + p.lastMonth, 0);

    return {
      width,
      maxVal,
      todayDay: today,
      thisSum, lastSum,
      paths: {
        thisMonth: buildPath('thisMonth'),
        lastMonth: buildPath('lastMonth'),
      },
    };
  }, [points]);

  const diff = thisSum - lastSum;
  const isUp = diff >= 0;

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
      <div className="flex-between mb-3" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div className="fw-600" style={{ fontSize: 15, fontFamily: "'Trirong', serif", letterSpacing: '-0.01em' }}>
            รายได้รายวัน — เปรียบเทียบกับเดือนก่อน
          </div>
          <div className="text-sm text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            วันที่ {todayDay} ของเดือน · {isUp ? 'มากกว่า' : 'น้อยกว่า'}เดือนก่อน{' '}
            <span style={{ color: isUp ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
              {isUp ? '+' : ''}฿{Math.abs(diff).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.85rem', fontSize: 11 }}>
          <Legend color="var(--primary)" label={`เดือนนี้ ฿${thisSum.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`} solid />
          <Legend color="var(--text-light)" label={`เดือนก่อน ฿${lastSum.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`} />
        </div>
      </div>

      <svg viewBox={`0 0 ${width} 160`} style={{ width: '100%', height: 160 }}>
        {/* grid lines */}
        {[0.25, 0.5, 0.75, 1].map(p => {
          const y = 12 + 126 * (1 - p);
          return <line key={p} x1={12} x2={width - 12} y1={y} y2={y} stroke="#EFECE4" strokeWidth={0.5} />;
        })}
        {/* last month dashed */}
        <path d={paths.lastMonth} fill="none" stroke="#A4ADA1" strokeWidth={1.5} strokeDasharray="3,3" />
        {/* this month solid */}
        <path d={paths.thisMonth} fill="none" stroke="#2F5D52" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* x-axis labels */}
        {[1, 7, 14, 21, points.length].filter(d => d <= points.length).map(day => {
          const x = 12 + ((day - 1) / Math.max(1, points.length - 1)) * (width - 24);
          return <text key={day} x={x} y={154} textAnchor="middle" fontSize={10} fill="#6B7568">{day}</text>;
        })}
      </svg>
    </div>
  );
}

function Legend({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
      <span style={{
        display: 'inline-block', width: 14, height: 2.5,
        background: solid ? color : 'transparent',
        borderTop: solid ? 'none' : `2.5px dashed ${color}`,
      }} />
      {label}
    </span>
  );
}
