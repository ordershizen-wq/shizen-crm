import type { ProductStat } from '@/lib/analytics';

export default function BestProductsWidget({ products }: { products: ProductStat[] }) {
  if (products.length === 0) {
    return null;
  }

  const maxRevenue = Math.max(...products.map(p => p.revenue));

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
      <div className="fw-700" style={{ fontSize: 14, marginBottom: 4 }}>
        📦 สินค้าที่ขายดีของคุณเดือนนี้
      </div>
      <div className="text-sm text-muted" style={{ fontSize: 11, marginBottom: 12 }}>
        เตรียมสคริปต์ขายสินค้าเด็ดๆ
      </div>
      <div>
        {products.map((p, i) => {
          const widthPct = maxRevenue > 0 ? (p.revenue / maxRevenue) * 100 : 0;
          return (
            <div key={p.name} style={{ marginBottom: '0.7rem', last: { marginBottom: 0 } } as React.CSSProperties}>
              <div className="flex-between" style={{ fontSize: 12, marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: rank(i).bg, color: rank(i).color,
                    fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{i + 1}</span>
                  <span className="fw-600" style={{ fontSize: 13, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                </div>
                <span className="fw-700" style={{ color: 'var(--primary)', fontSize: 13 }}>
                  ฿{p.revenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${widthPct}%`,
                  background: 'linear-gradient(90deg, var(--primary) 0%, #4ade80 100%)',
                  borderRadius: 3,
                  transition: 'width 400ms',
                }} />
              </div>
              <div className="text-sm text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                {p.units} ชิ้น · {p.orders} ออเดอร์
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const RANK_STYLES = [
  { bg: '#fef3c7', color: '#92400e' }, // gold
  { bg: '#e2e8f0', color: '#475569' }, // silver
  { bg: '#fed7aa', color: '#9a3412' }, // bronze
];
function rank(i: number) {
  return RANK_STYLES[i] ?? { bg: 'var(--border-light)', color: 'var(--text-muted)' };
}
