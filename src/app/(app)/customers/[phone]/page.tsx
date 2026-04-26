import { getCurrentUser, getOrderFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { calculateStage, STAGE_LABELS, STAGE_ICONS } from '@/lib/customer';
import FollowUpForm from './FollowUpForm';
import NoteEditor from './NoteEditor';

type Props = { params: Promise<{ phone: string }> };

export default async function CustomerProfilePage({ params }: Props) {
  const { phone } = await params;
  const decodedPhone = decodeURIComponent(phone);

  const user = (await getCurrentUser())!;
  const orderFilter = await getOrderFilter(user);

  const orders = await prisma.sheetOrder.findMany({
    where: { ...orderFilter, phone: decodedPhone },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, date: true, createdAt: true, totalPrice: true, status: true,
      channel: true, salesRepName: true, productsJson: true,
      address: true, customerName: true, isReturned: true,
    },
  });

  if (orders.length === 0) {
    return (
      <div>
        <div className="flex-between mb-4">
          <Link href="/customers" className="btn btn-secondary">
            <i className="ri-arrow-left-line"></i> กลับ
          </Link>
        </div>
        <div className="card p-4 text-center" style={{ padding: '4rem' }}>
          <i className="ri-user-search-line" style={{ fontSize: 56, color: 'var(--text-light)' }}></i>
          <h3 className="fw-600 mt-2" style={{ color: 'var(--text-dark)' }}>ไม่พบข้อมูลลูกค้า</h3>
          <p className="text-muted text-sm mt-1">เบอร์ {decodedPhone} ไม่มีออเดอร์ หรือไม่ใช่ลูกค้าของคุณ</p>
        </div>
      </div>
    );
  }

  const extra = await prisma.sheetCustomerExtra.findUnique({ where: { phone: decodedPhone } });
  const followUps = await prisma.crmFollowUp.findMany({
    where: { customerPhone: decodedPhone },
    orderBy: { createdAt: 'desc' },
    include: { sheetUser: { select: { fullName: true } } },
    take: 20,
  });

  const latestOrder = orders[0];
  const name = latestOrder.customerName || 'ไม่ระบุชื่อ';
  const totalSpent = orders.reduce((s, o) => s + Number(o.totalPrice ?? 0), 0);
  const orderCount = orders.length;
  const lastOrderAt = orders[0]?.createdAt ?? null;
  const stage = calculateStage({ lastOrderAt, orderCount, totalSpent });
  const daysSince = lastOrderAt
    ? Math.floor((Date.now() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <>
      {/* Header */}
      <div className="flex-between mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/customers" className="icon-btn">
            <i className="ri-arrow-left-line"></i>
          </Link>
          <div>
            <h1 className="page-title">{name}</h1>
            <p className="text-sm text-muted">
              <i className="ri-phone-line"></i> {decodedPhone}
            </p>
          </div>
        </div>
        <span className={`status-badge stage-${stage}`} style={{ fontSize: 13, padding: '0.35rem 0.85rem' }}>
          <i className={STAGE_ICONS[stage]}></i> {STAGE_LABELS[stage]}
        </span>
      </div>

      <div className="customer-profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Stats */}
          <div className="customer-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <StatCard icon="ri-money-dollar-circle-line" label="ยอดสะสม" value={`฿${totalSpent.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`} color="var(--success)" />
            <StatCard icon="ri-shopping-bag-3-line" label="จำนวนออเดอร์" value={`${orderCount} ครั้ง`} color="var(--primary)" />
            <StatCard icon="ri-calendar-check-line" label="สั่งล่าสุด" value={daysSince !== null ? `${daysSince} วันที่แล้ว` : '-'} color={daysSince !== null && daysSince > 60 ? 'var(--danger)' : 'var(--text-dark)'} />
          </div>

          {/* Order History */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="fw-600" style={{ fontSize: 15 }}>
                <i className="ri-history-line text-blue"></i> ประวัติออเดอร์
              </h3>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>วันที่</th><th>สินค้า</th><th>เซลส์</th><th>ช่องทาง</th><th>สถานะ</th>
                  <th style={{ textAlign: 'right' }}>ยอด</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const products = Array.isArray(o.productsJson)
                    ? (o.productsJson as { name?: string; quantity?: number }[])
                    : [];
                  return (
                    <tr key={o.id}>
                      <td className="text-sm">
                        {(o.date ?? o.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="text-sm">
                        {products.length > 0 ? products.map(p => `${p.name ?? '-'} x${p.quantity ?? 1}`).join(', ') : '-'}
                      </td>
                      <td className="text-sm">{o.salesRepName || '-'}</td>
                      <td className="text-sm">{o.channel || '-'}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="fw-600" style={{ textAlign: 'right' }}>
                        ฿{Number(o.totalPrice ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Follow-up History */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="fw-600" style={{ fontSize: 15 }}>
                <i className="ri-phone-line text-blue"></i> ประวัติการติดตาม
              </h3>
            </div>
            {followUps.length === 0 ? (
              <div className="text-center text-muted p-4">
                <i className="ri-file-list-3-line" style={{ fontSize: 32 }}></i>
                <p className="mt-1 text-sm">ยังไม่มีการบันทึก</p>
              </div>
            ) : (
              <div style={{ padding: '0.5rem 0' }}>
                {followUps.map(f => (
                  <div key={f.id} style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div className="flex-between mb-1">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <OutcomeBadge outcome={f.outcome} />
                        <span className="text-sm fw-600">{f.sheetUser.fullName}</span>
                        {f.channel && <span className="text-sm text-muted">• {f.channel}</span>}
                      </div>
                      <span className="text-sm text-muted">
                        {f.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    {f.note && <p className="text-sm" style={{ color: 'var(--text-dark)' }}>{f.note}</p>}
                    {f.nextActionAt && (
                      <p className="text-sm mt-1" style={{ color: 'var(--orange)' }}>
                        <i className="ri-alarm-line"></i> ติดตามต่อ: {f.nextActionAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Note */}
          <div className="card p-4">
            <h3 className="fw-600 mb-3" style={{ fontSize: 15 }}>
              <i className="ri-sticky-note-line text-orange"></i> โน้ตลูกค้า
            </h3>
            <NoteEditor phone={decodedPhone} initialNote={extra?.note ?? ''} />
          </div>

          {/* Address */}
          <div className="card p-4">
            <h3 className="fw-600 mb-3" style={{ fontSize: 15 }}>
              <i className="ri-map-pin-line text-blue"></i> ที่อยู่ล่าสุด
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-dark)', lineHeight: 1.8 }}>
              {latestOrder.address || <span className="text-muted">ไม่มีข้อมูลที่อยู่</span>}
            </p>
          </div>

          {/* Log Follow-up */}
          <div className="card p-4">
            <h3 className="fw-600 mb-3" style={{ fontSize: 15 }}>
              <i className="ri-edit-line text-primary"></i> บันทึกการติดตาม
            </h3>
            <FollowUpForm customerPhone={decodedPhone} sheetUserId={user.id} />
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="card p-3">
      <div className="text-sm text-muted mb-1"><i className={icon}></i> {label}</div>
      <div className="fw-700" style={{ fontSize: 18, color }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    PAID: { bg: 'var(--success-light)', color: 'var(--success)', label: 'ชำระแล้ว' },
    PACKED: { bg: 'var(--blue-light)', color: 'var(--primary)', label: 'แพ็คแล้ว' },
    COD: { bg: 'var(--warning-light)', color: '#d39e00', label: 'COD' },
    PENDING: { bg: 'var(--purple-light)', color: '#6f42c1', label: 'รอดำเนินการ' },
    RETURNED: { bg: 'var(--danger-light)', color: 'var(--danger)', label: 'ตีกลับ' },
    CANCELLED: { bg: 'var(--danger-light)', color: 'var(--danger)', label: 'ยกเลิก' },
    OTHER: { bg: '#f1f5f9', color: '#64748b', label: 'อื่นๆ' },
  };
  const c = config[status] ?? config.OTHER;
  return <span className="status-badge" style={{ background: c.bg, color: c.color }}>{c.label}</span>;
}

const OUTCOME_MAP: Record<string, { label: string; bg: string; color: string }> = {
  INTERESTED: { label: 'สนใจ', bg: 'var(--success-light)', color: 'var(--success)' },
  NOT_NOW: { label: 'ยังไม่พร้อม', bg: 'var(--warning-light)', color: '#d39e00' },
  ORDERED: { label: 'สั่งซื้อแล้ว', bg: 'var(--blue-light)', color: 'var(--primary)' },
  NO_ANSWER: { label: 'ไม่รับสาย', bg: '#f1f5f9', color: '#64748b' },
  DO_NOT_CONTACT: { label: 'ห้ามติดต่อ', bg: 'var(--danger-light)', color: 'var(--danger)' },
  OTHER: { label: 'อื่นๆ', bg: '#f1f5f9', color: '#64748b' },
};

function OutcomeBadge({ outcome }: { outcome: string }) {
  const m = OUTCOME_MAP[outcome] ?? OUTCOME_MAP.OTHER;
  return <span className="status-badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
}
