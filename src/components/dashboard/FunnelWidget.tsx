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
      icon: 'ri-user-add-line',
      count: data.newCustomers,
      color: 'var(--info)',
      sub: 'ลูกค้าที่ซื้อครั้งแรกในเดือนนี้',
    },
    {
      label: 'ลูกค้าซื้อซ้ำ (ตลอดกาล)',
      icon: 'ri-repeat-line',
      count: data.repeatCustomers,
      color: 'var(--primary)',
      sub: `${lifetimeRepeatRate.toFixed(0)}% retention rate`,
    },
    {
      label: 'ลูกค้า VIP (ซื้อ ≥3 ครั้ง หรือ ≥฿20K)',
      icon: 'ri-vip-crown-line',
      count: data.vipCustomers,
      color: 'var(--gold)',
      sub: `${repeatToVipRate.toFixed(0)}% ของลูกค้าซื้อซ้ำ`,
    },
  ];

  const max = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
      <div className="fw-600" style={{ fontSize: 15, marginBottom: 4, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
        Funnel การได้ลูกค้า
      </div>
      <div className="text-sm text-muted" style={{ fontSize: 12, marginBottom: 14 }}>
        ดูว่า funnel รั่วตรงไหน — % ที่ลดลงระหว่าง stage คือจุดต้องปรับปรุง
      </div>
      <div>
        {stages.map((s, i) => {
          const width = (s.count / max) * 100;
          return (
            <div key={i} style={{ marginBottom: 12, position: 'relative' }}>
              <div style={{
                background: `${s.color}10`,
                border: `1px solid ${s.color}30`,
                borderLeft: `3px solid ${s.color}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.7rem 1rem',
                width: `${Math.max(40, width)}%`,
                minWidth: 220,
                transition: 'width 400ms',
              }}>
                <div className="flex-between">
                  <div>
                    <div className="fw-600" style={{ fontSize: 13, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className={s.icon} style={{ color: s.color, fontSize: 14 }}></i>
                      {s.label}
                    </div>
                    <div className="text-sm text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {s.sub}
                    </div>
                  </div>
                  <div className="fw-700" style={{ fontSize: 22, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
