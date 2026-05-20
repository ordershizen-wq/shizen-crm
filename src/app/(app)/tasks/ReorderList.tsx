import Link from 'next/link';
import type { ReorderItem } from '@/lib/reorderQueue';

const BUCKET_CONFIG: Record<ReorderItem['bucket'], { label: string; color: string; bg: string; icon: string }> = {
  overdue:  { label: 'เลยกำหนด', color: 'var(--danger)',  bg: 'var(--danger-light)',  icon: 'ri-alarm-warning-line' },
  today:    { label: 'วันนี้',    color: 'var(--orange)',  bg: 'var(--orange-light)',  icon: 'ri-time-line' },
  soon:     { label: 'ใน 7 วัน',  color: '#0ea5e9',         bg: '#e0f2fe',               icon: 'ri-calendar-event-line' },
  upcoming: { label: 'อนาคต',     color: 'var(--text-muted)', bg: 'var(--bg-app)',     icon: 'ri-calendar-line' },
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function dueLabel(days: number): string {
  if (days < 0) return `เลย ${Math.abs(days)} วัน`;
  if (days === 0) return 'ครบวันนี้';
  if (days === 1) return 'พรุ่งนี้';
  return `อีก ${days} วัน`;
}

export default function ReorderList({ items }: { items: ReorderItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card p-4 text-center" style={{ padding: '3rem 1rem' }}>
        <i className="ri-checkbox-circle-line" style={{ fontSize: 42, color: 'var(--success)' }}></i>
        <p className="fw-600 mt-2" style={{ fontSize: 15 }}>ยังไม่มีลูกค้าที่ถึงรอบรีออเดอร์</p>
        <p className="text-sm text-muted">ระบบจะคำนวณจากรอบการสั่งซื้อของลูกค้าให้อัตโนมัติ</p>
      </div>
    );
  }

  // จัดกลุ่มตาม bucket
  const groups: Record<ReorderItem['bucket'], ReorderItem[]> = {
    overdue: [], today: [], soon: [], upcoming: [],
  };
  for (const it of items) groups[it.bucket].push(it);

  const order: ReorderItem['bucket'][] = ['overdue', 'today', 'soon', 'upcoming'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {order.map(bucket => {
        const list = groups[bucket];
        if (list.length === 0) return null;
        const cfg = BUCKET_CONFIG[bucket];
        return (
          <div key={bucket} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: cfg.bg, color: cfg.color,
              borderBottom: '1px solid var(--border-light)',
            }}>
              <i className={cfg.icon}></i>
              <span className="fw-700" style={{ fontSize: 13 }}>{cfg.label}</span>
              <span style={{ fontSize: 12, opacity: 0.85 }}>{list.length} คน</span>
            </div>
            <div>
              {list.map(item => (
                <ReorderRow key={item.phone} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReorderRow({ item }: { item: ReorderItem }) {
  const cfg = BUCKET_CONFIG[item.bucket];
  return (
    <Link
      href={`/customers/${encodeURIComponent(item.phone)}`}
      className="reorder-row"
      style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '0.85rem 1rem',
        borderBottom: '1px solid var(--border-light)',
        textDecoration: 'none', color: 'inherit',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: cfg.bg, color: cfg.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        <i className="ri-refresh-line"></i>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fw-600" style={{ fontSize: 14 }}>{item.name}</div>
        <div className="text-sm text-muted" style={{ fontSize: 12, marginTop: 2 }}>
          {item.phone} · สั่งล่าสุด {fmtDate(item.lastOrderAt)} ({item.daysSinceLast} วันก่อน) · รอบ {item.avgCycleDays} วัน
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="fw-700" style={{ fontSize: 13, color: cfg.color }}>
          {dueLabel(item.daysUntilReorder)}
        </div>
        <div className="text-sm text-muted" style={{ fontSize: 11, marginTop: 2 }}>
          ฿{item.totalSpent.toLocaleString('th-TH', { maximumFractionDigits: 0 })} · {item.orderCount} ออเดอร์
        </div>
      </div>

      <i className="ri-arrow-right-s-line text-muted" style={{ fontSize: 18, flexShrink: 0 }}></i>
    </Link>
  );
}
