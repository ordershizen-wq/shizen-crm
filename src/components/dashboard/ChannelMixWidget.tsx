import type { ChannelSlice } from '@/lib/analytics';

const CHANNEL_COLORS: Record<string, string> = {
  LINE: '#22C55E',
  FB: '#3B82F6',
  FACEBOOK: '#3B82F6',
  FB_PROFILE: '#3B82F6',
  FB_PAGE: '#1D4ED8',
  TIKTOK: '#1E1B30',
  TIKTOK_SHOP: '#FE2C55',
  TEL: '#8B5CF6',
  OTHER: '#94A3B8',
};

// แปลงโค้ดช่องทางดิบ → ชื่อที่อ่านง่าย
const CHANNEL_LABELS: Record<string, string> = {
  LINE: 'LINE',
  FB: 'Facebook',
  FACEBOOK: 'Facebook',
  FB_PROFILE: 'Facebook (โปรไฟล์)',
  FB_PAGE: 'Facebook (เพจ)',
  TIKTOK: 'TikTok',
  TIKTOK_SHOP: 'TikTok Shop',
  TEL: 'โทรศัพท์',
  OTHER: 'อื่นๆ',
};

function colorFor(ch: string): string {
  return CHANNEL_COLORS[ch.toUpperCase()] ?? '#94a3b8';
}

function labelFor(ch: string): string {
  return CHANNEL_LABELS[ch.toUpperCase()] ?? ch;
}

export default function ChannelMixWidget({ slices, rangeLabel }: { slices: ChannelSlice[]; rangeLabel?: string }) {
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
      <div className="fw-600" style={{ fontSize: 15, marginBottom: 4, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
        ช่องทางที่ใช้ขาย{rangeLabel ? ` · ${rangeLabel}` : ''}
      </div>
      <div className="text-sm text-muted" style={{ fontSize: 11, marginBottom: 12 }}>
        {topChannel ? `เก่งสุดที่ ${labelFor(topChannel.channel)} — ${topChannel.share.toFixed(0)}% ของรายได้` : ''}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <svg viewBox="0 0 150 150" style={{ width: 130, height: 130, flexShrink: 0 }}>
          {arcs.map(a => (
            <path key={a.channel} d={a.d} fill={a.color} stroke="rgba(255,255,255,0.85)" strokeWidth={1.5} />
          ))}
          {/* center label */}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={10} fill="#8E8AA8">รวม</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1E1B30">
            ฿{(totalRev / 1000).toFixed(0)}K
          </text>
        </svg>
        <div style={{ flex: 1, minWidth: 160 }}>
          {arcs.map(a => (
            <div key={a.channel} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: a.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{labelFor(a.channel)}</span>
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
