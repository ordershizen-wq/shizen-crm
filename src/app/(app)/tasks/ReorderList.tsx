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
            <div className="reorder-bucket-head" style={{ background: cfg.bg, color: cfg.color }}>
              <i className={cfg.icon}></i>
              <span>{cfg.label}</span>
              <span className="reorder-bucket-head-count">{list.length} คน</span>
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
    <Link href={`/customers/${encodeURIComponent(item.phone)}`} className="reorder-row">
      <div className="reorder-row-icon" style={{ background: cfg.bg, color: cfg.color }}>
        <i className="ri-refresh-line"></i>
      </div>

      <div className="reorder-row-body">
        <div className="reorder-row-name">{item.name}</div>
        <div className="reorder-row-meta">
          {item.phone} · สั่งล่าสุด {fmtDate(item.lastOrderAt)} ({item.daysSinceLast} วันก่อน) · รอบ {item.avgCycleDays} วัน
        </div>
      </div>

      <div className="reorder-row-side">
        <div className="reorder-row-due" style={{ color: cfg.color }}>
          {dueLabel(item.daysUntilReorder)}
        </div>
        <div className="reorder-row-sub">
          ฿{item.totalSpent.toLocaleString('th-TH', { maximumFractionDigits: 0 })} · {item.orderCount} ออเดอร์
        </div>
      </div>

      <i className="ri-arrow-right-s-line reorder-row-chevron"></i>
    </Link>
  );
}
