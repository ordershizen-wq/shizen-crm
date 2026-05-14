import type { ChannelSlice } from '@/lib/analytics';

const CHANNEL_COLORS: Record<string, string> = {
  LINE: '#06C755',
  FB: '#1877F2',
  FACEBOOK: '#1877F2',
  TIKTOK: '#000000',
  TEL: '#0ea5e9',
  OTHER: '#94a3b8',
};

function colorFor(ch: string): string {
  const key = ch.toUpperCase();
  return CHANNEL_COLORS[key] ?? '#94a3b8';
}

export default function ChannelMixWidget({ slices }: { slices: ChannelSlice[] }) {
  if (slices.length === 0) {
    return null;
  }

  // Build SVG donut paths
  const radius = 60;
  const inner = 38;
  const cx = 75, cy = 75;
  let acc = 0;
  const arcs = slices.map(s => {
    const startAngle = (acc / 100) * 2 * Math.PI;
    const endAngle = ((acc + s.share) / 100) * 2 * Math.PI;
    acc += s.share;
    return {
      ...s,
      d: arcPath(cx, cy, radius, inner, startAngle, endAngle),
      color: colorFor(s.channel),
    };
  });

  const totalRev = slices.reduce((s, x) => s + x.revenue, 0);
  const topChannel = slices[0];

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
      <div className="fw-700" style={{ fontSize: 14, marginBottom: 4 }}>
        🥧 ช่องทางที่คุณขายเดือนนี้
      </div>
      <div className="text-sm text-muted" style={{ fontSize: 11, marginBottom: 12 }}>
        {topChannel ? `เก่งสุดที่ ${topChannel.channel} — ${topChannel.share.toFixed(0)}% ของรายได้` : ''}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <svg viewBox="0 0 150 150" style={{ width: 130, height: 130, flexShrink: 0 }}>
          {arcs.map(a => (
            <path key={a.channel} d={a.d} fill={a.color} stroke="#fff" strokeWidth={1} />
          ))}
          {/* center label */}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={10} fill="#64748b">รวม</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={12} fontWeight={700} fill="#0f172a">
            ฿{(totalRev / 1000).toFixed(0)}K
          </text>
        </svg>
        <div style={{ flex: 1, minWidth: 160 }}>
          {arcs.map(a => (
            <div key={a.channel} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: a.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{a.channel}</span>
              <span className="text-sm text-muted" style={{ fontSize: 11 }}>{a.orders} ออเดอร์</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: a.color, minWidth: 42, textAlign: 'right' }}>
                {a.share.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function arcPath(cx: number, cy: number, r: number, inner: number, start: number, end: number): string {
  // SVG arc — 0 = top, clockwise
  const polar = (radius: number, angle: number) => [
    cx + radius * Math.sin(angle),
    cy - radius * Math.cos(angle),
  ];
  const [x1, y1] = polar(r, start);
  const [x2, y2] = polar(r, end);
  const [x3, y3] = polar(inner, end);
  const [x4, y4] = polar(inner, start);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}
