import type { ProductPerf } from '@/lib/analytics';

export default function ProductPerformanceTable({ products }: { products: ProductPerf[] }) {
  if (products.length === 0) return null;

  return (
    <div className="card" style={{ padding: 0, marginBottom: '1.5rem' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)' }}>
        <div className="fw-600" style={{ fontSize: 15, fontFamily: "'IBM Plex Serif', serif", letterSpacing: '-0.01em' }}>
          ผลงานของสินค้า — เดือนนี้
        </div>
        <div className="text-sm text-muted" style={{ fontSize: 12, marginTop: 2 }}>
          สินค้าที่ลูกค้าซื้อซ้ำสูง = สินค้าที่ควรผลักดันต่อ
        </div>
      </div>
      <div className="r-table-wrap">
        <table className="r-table">
          <thead>
            <tr>
              <th>สินค้า</th>
              <th style={{ textAlign: 'right' }}>ยอดขาย</th>
              <th style={{ textAlign: 'right' }}>ชิ้น</th>
              <th style={{ textAlign: 'right' }}>ออเดอร์</th>
              <th style={{ textAlign: 'right' }}>ลูกค้า</th>
              <th style={{ textAlign: 'right' }}>Reorder rate</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const rrColor = p.reorderRate >= 50 ? 'var(--success)' : p.reorderRate >= 25 ? 'var(--warning)' : p.reorderRate > 0 ? 'var(--text-muted)' : 'var(--text-light)';
              return (
                <tr key={p.name}>
                  <td className="fw-600" data-label="สินค้า">{p.name}</td>
                  <td data-label="ยอดขาย" className="fw-700" style={{ textAlign: 'right', color: 'var(--primary)' }}>
                    ฿{p.revenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </td>
                  <td data-label="ชิ้น" className="text-sm" style={{ textAlign: 'right' }}>{p.units.toLocaleString()}</td>
                  <td data-label="ออเดอร์" className="text-sm" style={{ textAlign: 'right' }}>{p.orders}</td>
                  <td data-label="ลูกค้า" className="text-sm" style={{ textAlign: 'right' }}>{p.uniqueCustomers}</td>
                  <td data-label="Reorder rate" style={{ textAlign: 'right' }}>
                    <span style={{
                      background: `${rrColor}22`, color: rrColor,
                      borderRadius: 999, padding: '2px 8px',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {p.reorderRate.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
