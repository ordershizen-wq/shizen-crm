'use client';

import Link from 'next/link';
import type { TodaysFocusData } from '@/lib/todaysFocus';

const MAX_ROWS = 5;

type FeedItem = {
  key: string;
  href: string;
  tone: 'red' | 'amber' | 'blue';
  primary: React.ReactNode;
  meta: React.ReactNode;
  actionIcon: string;
  actionLabel: string;
};

export default function TodaysFocus({ data, userName }: { data: TodaysFocusData; userName: string }) {
  const totalItems = data.vipAtRiskTotal + data.overdueTasksTotal + data.stuckOrdersTotal;

  if (data.isAllClear) {
    return (
      <div className="focus-allclear card">
        <div className="focus-allclear-icon">
          <i className="ri-checkbox-circle-line"></i>
        </div>
        <div>
          <div className="focus-allclear-title">ทุกอย่างเรียบร้อย {userName}</div>
          <div className="focus-allclear-sub">ไม่มี task ค้าง · ลูกค้าทุกคนยัง active · ออเดอร์ flow ปกติ</div>
        </div>
      </div>
    );
  }

  // Merge → priority sort → take top 5
  const items: FeedItem[] = [];

  for (const c of data.vipAtRisk) {
    items.push({
      key: `vip-${c.phone}`,
      href: `/customers/${c.phone}`,
      tone: 'red',
      primary: <>{c.name} <span className="focus-tag focus-tag-red">VIP</span></>,
      meta: <>ห่าง <strong>{c.daysSince} วัน</strong> · ยอดสะสม ฿{c.totalSpent.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</>,
      actionIcon: 'ri-phone-line',
      actionLabel: 'ติดต่อ',
    });
  }
  for (const t of data.overdueTasks) {
    items.push({
      key: `task-${t.id}`,
      href: `/customers/${t.customerPhone}?tab=tasks`,
      tone: 'amber',
      primary: <>{t.title} <span className="focus-tag focus-tag-amber">เลย {t.daysOverdue} วัน</span></>,
      meta: <>ของ <strong>{t.customerName}</strong>{t.assignedToName && ` · ${t.assignedToName}`}</>,
      actionIcon: 'ri-check-line',
      actionLabel: 'ทำเลย',
    });
  }
  for (const o of data.stuckOrders) {
    items.push({
      key: `order-${o.id}`,
      href: o.phone ? `/customers/${o.phone}` : `/orders?status=PENDING`,
      tone: 'blue',
      primary: <>{o.customerName ?? '(ไม่ระบุชื่อ)'} <span className="focus-tag focus-tag-blue">ค้าง {o.hoursSince} ชม.</span></>,
      meta: <>฿{o.totalPrice.toLocaleString('th-TH', { maximumFractionDigits: 0 })}{o.salesRepName && ` · ${o.salesRepName}`}</>,
      actionIcon: 'ri-eye-line',
      actionLabel: 'ดู',
    });
  }

  // ลำดับ: แดง (VIP) → เหลือง (งานเกิน) → ฟ้า (ค้าง) — เรียงตาม urgency ในกลุ่ม
  const TONE_RANK = { red: 0, amber: 1, blue: 2 } as const;
  items.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);

  const visible = items.slice(0, MAX_ROWS);
  const remainder = totalItems - visible.length;

  // Counts per tone (สำหรับ chip header)
  const counts = {
    red: data.vipAtRiskTotal,
    amber: data.overdueTasksTotal,
    blue: data.stuckOrdersTotal,
  };

  return (
    <div className="card focus-feed">
      {/* Header */}
      <div className="focus-feed-head">
        <div className="focus-feed-title">
          <i className="ri-flashlight-line" style={{ color: 'var(--primary)' }}></i>
          <span>งานด่วนวันนี้</span>
          <span className="focus-feed-total">{totalItems}</span>
        </div>
        <div className="focus-feed-chips">
          {counts.red > 0 && <span className="focus-chip focus-chip-red"><span className="focus-dot focus-dot-red" />{counts.red}</span>}
          {counts.amber > 0 && <span className="focus-chip focus-chip-amber"><span className="focus-dot focus-dot-amber" />{counts.amber}</span>}
          {counts.blue > 0 && <span className="focus-chip focus-chip-blue"><span className="focus-dot focus-dot-blue" />{counts.blue}</span>}
        </div>
      </div>

      {/* Feed rows */}
      <div className="focus-feed-list">
        {visible.map(item => (
          <Link key={item.key} href={item.href} className="focus-feed-row">
            <span className={`focus-dot focus-dot-${item.tone}`} aria-hidden />
            <div className="focus-feed-body">
              <div className="focus-feed-primary">{item.primary}</div>
              <div className="focus-feed-meta">{item.meta}</div>
            </div>
            <button
              type="button"
              className={`focus-action-btn focus-action-${item.tone}`}
              aria-label={item.actionLabel}
              title={item.actionLabel}
              onClick={(e) => e.preventDefault()}
              tabIndex={-1}
            >
              <i className={item.actionIcon}></i>
            </button>
          </Link>
        ))}
      </div>

      {/* Footer link */}
      {remainder > 0 && (
        <Link href="/tasks" className="focus-feed-foot">
          ดูทั้งหมด {totalItems} รายการ <i className="ri-arrow-right-line"></i>
        </Link>
      )}
    </div>
  );
}
