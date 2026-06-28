import Link from 'next/link';
import type { HotCustomer } from '@/lib/analytics';

export default function HotCustomersWidget({ customers }: { customers: HotCustomer[] }) {
  if (customers.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{
      padding: 0,
      borderLeft: '3px solid var(--warning)',
      marginBottom: '1.5rem',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.95rem 1.25rem',
        borderBottom: '1px solid rgba(99,102,241,0.1)',
      }}>
        <div className="fw-600" style={{ fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em', color: 'var(--text-dark)' }}>
          ลูกค้าที่กำลังถึงรอบซื้อซ้ำ
        </div>
        <div className="text-sm text-muted" style={{ fontSize: 12, marginTop: 2 }}>
          คาดการณ์จาก pattern การซื้อของแต่ละคน — ติดต่อก่อนเค้าลืม
        </div>
      </div>
      <div>
        {customers.map(c => {
          const overdue = c.isOverdue;
          const color = overdue ? 'var(--danger)' : 'var(--warning)';
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
                borderBottom: '1px solid rgba(99,102,241,0.08)',
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
                fontSize: 11, fontWeight: 600, color,
                background: `${color}14`, border: `1px solid ${color}33`,
                borderRadius: 'var(--radius-sm)', padding: '3px 8px',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {cycleLabel}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
