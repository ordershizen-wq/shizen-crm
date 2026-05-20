import Link from 'next/link';

type Kind = 'care' | 'reorder';

type Props = {
  kind: Kind;
  careCount: number;
  reorderCount: number;
};

const TABS: Array<{
  key: Kind;
  label: string;
  desc: string;
  icon: string;
  color: string;
  bg: string;
}> = [
  {
    key: 'care',
    label: 'ดูแลลูกค้า',
    desc: 'ตามอาการ · โทรหา · ตามของ',
    icon: 'ri-heart-pulse-line',
    color: '#ea580c',
    bg: '#fff7ed',
  },
  {
    key: 'reorder',
    label: 'ตามรีออเดอร์',
    desc: 'ลูกค้าใกล้ครบเซ็ท',
    icon: 'ri-refresh-line',
    color: '#0284c7',
    bg: '#e0f2fe',
  },
];

export default function KindTabs({ kind, careCount, reorderCount }: Props) {
  return (
    <div className="kind-tabs mb-3" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '0.75rem',
    }}>
      {TABS.map(tab => {
        const count = tab.key === 'care' ? careCount : reorderCount;
        const active = kind === tab.key;
        const href = tab.key === 'care' ? '/tasks' : '/tasks?kind=reorder';

        return (
          <Link
            key={tab.key}
            href={href}
            className="kind-tab"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '1rem 1.1rem',
              borderRadius: 14,
              textDecoration: 'none',
              border: active ? `2px solid ${tab.color}` : '2px solid var(--border-light)',
              background: active ? tab.bg : '#fff',
              color: 'var(--text-dark)',
              boxShadow: active ? `0 4px 12px ${tab.color}22` : 'none',
              transition: 'all 150ms',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: tab.bg, color: tab.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
            }}>
              <i className={tab.icon}></i>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fw-700" style={{ fontSize: 15, color: active ? tab.color : 'var(--text-dark)' }}>
                {tab.label}
              </div>
              <div className="text-sm text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                {tab.desc}
              </div>
            </div>
            <div style={{
              background: active ? tab.color : 'var(--bg-app)',
              color: active ? '#fff' : 'var(--text-muted)',
              borderRadius: 20,
              minWidth: 32, height: 28,
              padding: '0 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              flexShrink: 0,
            }}>
              {count}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
