import type { ProductStat } from '@/lib/analytics';

export default function BestProductsWidget({ products }: { products: ProductStat[] }) {
  if (products.length === 0) {
    return null;
  }

  const maxUnits = Math.max(...products.map(p => p.units));

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
      <div className="fw-600" style={{ fontSize: 15, marginBottom: 4, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
        สินค้าที่ขายดีของคุณ
      </div>
      <div className="text-sm text-muted" style={{ fontSize: 11, marginBottom: 12 }}>
        จัดอันดับตามจำนวนที่ขายได้ — เตรียมสคริปต์ขายสินค้าเด็ดๆ
      </div>
      <div>
        {products.map((p, i) => {
          const widthPct = maxUnits > 0 ? (p.units / maxUnits) * 100 : 0;
          return (
            <div key={p.name} style={{ marginBottom: '0.7rem' }}>
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
                  {p.units.toLocaleString()} ชิ้น
                </span>
              </div>
              <div style={{ height: 5, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${widthPct}%`,
                  background: 'var(--primary)',
                  borderRadius: 3,
                  transition: 'width 400ms',
                }} />
              </div>
              <div className="text-sm text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                {p.orders} ออเดอร์
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const RANK_STYLES = [
  { bg: 'var(--sand-light)', color: 'var(--gold)' },         // gold/sand
  { bg: 'var(--bg-subtle)', color: 'var(--text-muted)' },    // silver/neutral
  { bg: 'var(--clay-light)', color: 'var(--clay)' },         // clay/bronze
];
function rank(i: number) {
  return RANK_STYLES[i] ?? { bg: 'var(--border-light)', color: 'var(--text-muted)' };
}
