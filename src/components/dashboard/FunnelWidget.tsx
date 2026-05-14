import type { FunnelData } from '@/lib/analytics';

export default function FunnelWidget({ data }: { data: FunnelData }) {
  const lifetimeRepeatRate = data.totalUniquePhones > 0
    ? (data.repeatCustomers / data.totalUniquePhones) * 100
    : 0;
  const vipRate = data.totalUniquePhones > 0
    ? (data.vipCustomers / data.totalUniquePhones) * 100
    : 0;
  const repeatToVipRate = data.repeatCustomers > 0
    ? (data.vipCustomers / data.repeatCustomers) * 100
    : 0;

  const stages = [
    {
      label: 'ลูกค้าใหม่ (เดือนนี้)',
      icon: '🌱',
      count: data.newCustomers,
      color: '#0284c7',
      sub: 'First-time buyers',
    },
    {
      label: 'ลูกค้าซื้อซ้ำ (ตลอดกาล)',
      icon: '🔄',
      count: data.repeatCustomers,
      color: '#147a5e',
      sub: `${lifetimeRepeatRate.toFixed(0)}% retention rate`,
    },
    {
      label: 'ลูกค้า VIP (≥3 ครั้ง หรือ ≥฿20K)',
      icon: '👑',
      count: data.vipCustomers,
      color: '#f59e0b',
      sub: `${repeatToVipRate.toFixed(0)}% ของลูกค้าซื้อซ้ำ`,
    },
  ];

  const max = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
      <div className="fw-700" style={{ fontSize: 14, marginBottom: 4 }}>
        🔄 Acquisition Funnel
      </div>
      <div className="text-sm text-muted" style={{ fontSize: 11, marginBottom: 14 }}>
        ดูว่า funnel รั่วตรงไหน — % ที่ลดลงระหว่าง stage คือจุดต้องปรับปรุง
      </div>
      <div>
        {stages.map((s, i) => {
          const width = (s.count / max) * 100;
          return (
            <div key={i} style={{ marginBottom: 12, position: 'relative' }}>
              <div style={{
                background: `linear-gradient(90deg, ${s.color}22 0%, ${s.color}44 100%)`,
                border: `1.5px solid ${s.color}55`,
                borderRadius: 8,
                padding: '0.6rem 1rem',
                width: `${Math.max(40, width)}%`,
                minWidth: 200,
                transition: 'width 400ms',
              }}>
                <div className="flex-between">
                  <div>
                    <div className="fw-600" style={{ fontSize: 13, color: 'var(--text-dark)' }}>
                      {s.icon} {s.label}
                    </div>
                    <div className="text-sm text-muted" style={{ fontSize: 10, marginTop: 1 }}>
                      {s.sub}
                    </div>
                  </div>
                  <div className="fw-800" style={{ fontSize: 22, color: s.color }}>
                    {s.count.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-sm text-muted" style={{ fontSize: 11, paddingTop: 10, borderTop: '1px solid var(--border-light)', marginTop: 8 }}>
        ลูกค้าทั้งหมดในระบบ: <strong style={{ color: 'var(--text-dark)' }}>{data.totalUniquePhones.toLocaleString()}</strong> คน ·
        VIP rate: <strong style={{ color: 'var(--text-dark)' }}>{vipRate.toFixed(1)}%</strong>
      </div>
    </div>
  );
}
