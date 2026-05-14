import Link from 'next/link';
import type { HotCustomer } from '@/lib/analytics';

export default function HotCustomersWidget({ customers }: { customers: HotCustomer[] }) {
  if (customers.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{
      padding: 0,
      border: '1.5px solid rgba(245,158,11,0.2)',
      marginBottom: '1.5rem',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.85rem 1.25rem',
        background: 'linear-gradient(90deg, rgba(245,158,11,0.08), transparent)',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div className="fw-700" style={{ fontSize: 14 }}>
          🔥 ลูกค้าที่กำลังถึงรอบซื้อซ้ำ
        </div>
        <div className="text-sm text-muted" style={{ fontSize: 11, marginTop: 2 }}>
          คาดการณ์จาก pattern การซื้อของแต่ละคน — ติดต่อก่อนเค้าจะลืม
        </div>
      </div>
      <div>
        {customers.map(c => {
          const overdue = c.isOverdue;
          const color = overdue ? '#dc2626' : '#f59e0b';
          const cycleLabel = overdue
            ? `เลย ${Math.abs(c.predictedDays)} วันแล้ว`
            : `อีก ${c.predictedDays} วัน`;
          return (
            <Link
              key={c.phone}
              href={`/customers/${c.phone}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.7rem 1.25rem',
                borderBottom: '1px solid var(--border-light)',
                textDecoration: 'none', color: 'inherit',
                transition: 'background 120ms',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fw-600" style={{ fontSize: 13, color: 'var(--text-dark)' }}>
                  {c.name}
                  <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                    · ซื้อทุก {c.avgCycleDays} วัน
                  </span>
                </div>
                <div className="text-sm text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                  ครั้งล่าสุด {c.daysSinceLast} วันก่อน · ยอดสะสม ฿{c.totalSpent.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, color,
                background: `${color}11`, border: `1px solid ${color}33`,
                borderRadius: 6, padding: '4px 8px',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {overdue ? '⚠️' : '⏰'} {cycleLabel}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
