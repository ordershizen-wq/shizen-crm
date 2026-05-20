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
    <div className="kind-tabs mb-3">
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
              borderColor: active ? tab.color : undefined,
              background: active ? tab.bg : undefined,
              boxShadow: active ? `0 4px 12px ${tab.color}22` : undefined,
            }}
            aria-current={active ? 'page' : undefined}
          >
            <div className="kind-tab-icon" style={{ background: tab.bg, color: tab.color }}>
              <i className={tab.icon}></i>
            </div>
            <div className="kind-tab-body">
              <div className="kind-tab-title" style={{ color: active ? tab.color : undefined }}>
                {tab.label}
              </div>
              <div className="kind-tab-desc">{tab.desc}</div>
            </div>
            <div
              className="kind-tab-count"
              style={active ? { background: tab.color, color: '#fff' } : undefined}
            >
              {count}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
