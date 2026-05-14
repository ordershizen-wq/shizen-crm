import { getCurrentUser, getOrderFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { calculateStage, STAGE_LABELS, STAGE_ICONS } from '@/lib/customer';
import FollowUpForm from './FollowUpForm';
import NoteEditor from './NoteEditor';
import GradePanel from './GradePanel';
import HealthConditionsEditor from './HealthConditionsEditor';
import ProductRecommendations from './ProductRecommendations';
import TasksPanel from './TasksPanel';
import SetTaskButton from './SetTaskButton';
import ProfileTabs from './ProfileTabs';
import ReorderButton from './ReorderButton';
import SourceBadge from '@/components/SourceBadge';
import type { ChecklistAnswers } from './actions';

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
      address: true, customerName: true, isReturned: true, source: true,
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

  const [extra, allProducts] = await Promise.all([
    prisma.sheetCustomerExtra.findUnique({ where: { phone: decodedPhone } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
  ]);

  // ดึงชื่อสินค้าที่ลูกค้าซื้อใน 60 วันล่าสุด
  const d60 = new Date(Date.now() - 60 * 86_400_000);
  const recentProductNames: string[] = [];
  for (const o of orders) {
    if (o.createdAt < d60) continue;
    const items = Array.isArray(o.productsJson) ? (o.productsJson as { name?: string }[]) : [];
    for (const item of items) {
      if (item.name) recentProductNames.push(item.name);
    }
  }
  const followUps = await prisma.crmFollowUp.findMany({
    where: { customerPhone: decodedPhone },
    orderBy: { createdAt: 'desc' },
    include: { sheetUser: { select: { fullName: true } } },
    take: 20,
  });

  const tasks = await prisma.customerTask.findMany({
    where: { customerPhone: decodedPhone },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    include: {
      assignedTo: { select: { id: true, fullName: true } },
      createdBy:  { select: { id: true, fullName: true } },
    },
  });

  const ordersWithTasks = new Set(tasks.map(t => t.orderId).filter((x): x is string => !!x));
  const oldestOrderId = orders.length ? orders[orders.length - 1].id : null;

  const memberWhere =
    user.role === 'ADMIN'
      ? { isActive: 'ACTIVE' as const, role: { not: 'PACKER' as const } }
      : user.role === 'LEADER' && user.teamId
      ? { isActive: 'ACTIVE' as const, role: { not: 'PACKER' as const }, teamId: user.teamId }
      : { id: user.id };
  const assignableMembers = await prisma.sheetUser.findMany({
    where: memberWhere,
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
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

  const pendingTaskCount = tasks.filter(t => t.status !== 'DONE' && t.status !== 'SKIPPED').length;
  const initials = name.split(' ').map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase();

  // ─── Build tab contents ───────────────────────────────────────────────

  const overviewTab = (
    <div className="customer-profile-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Recent orders preview (3 ล่าสุด) */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="fw-600" style={{ fontSize: 15 }}>
              <i className="ri-history-line text-primary"></i> ออเดอร์ล่าสุด
            </h3>
            <span className="text-sm text-muted">ทั้งหมด {orderCount} ครั้ง</span>
          </div>
          <div className="r-table-wrap">
            <table className="r-table">
              <thead>
                <tr>
                  <th>วันที่</th><th>ที่มา</th><th>สินค้า</th><th>สถานะ</th>
                  <th style={{ textAlign: 'right' }}>ยอด</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 3).map(o => {
                  const products = Array.isArray(o.productsJson) ? (o.productsJson as { name?: string; quantity?: number }[]) : [];
                  return (
                    <tr key={o.id}>
                      <td className="text-sm" data-label="วันที่">{(o.date ?? o.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                      <td data-label="ที่มา"><SourceBadge source={o.source} compact /></td>
                      <td className="text-sm r-cell-block" data-label="สินค้า">{products.length > 0 ? products.map(p => `${p.name ?? '-'} x${p.quantity ?? 1}`).join(', ') : '-'}</td>
                      <td data-label="สถานะ"><StatusBadge status={o.status} /></td>
                      <td className="fw-600" data-label="ยอด" style={{ textAlign: 'right' }}>฿{Number(o.totalPrice ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent follow-ups (3 ล่าสุด) */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h3 className="fw-600" style={{ fontSize: 15 }}>
              <i className="ri-phone-line text-primary"></i> การติดตามล่าสุด
            </h3>
          </div>
          {followUps.length === 0 ? (
            <div className="text-center text-muted p-4">
              <i className="ri-file-list-3-line" style={{ fontSize: 32 }}></i>
              <p className="mt-1 text-sm">ยังไม่มีการบันทึก</p>
            </div>
          ) : (
            <div style={{ padding: '0.5rem 0' }}>
              {followUps.slice(0, 3).map(f => (
                <div key={f.id} style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div className="flex-between mb-1">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <OutcomeBadge outcome={f.outcome} />
                      <span className="text-sm fw-600">{f.sheetUser.fullName}</span>
                    </div>
                    <span className="text-sm text-muted">{f.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  {f.note && <p className="text-sm" style={{ color: 'var(--text-dark)' }}>{f.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Recommendations + Quick info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card p-4">
          <div className="flex-between mb-3">
            <h3 className="fw-600" style={{ fontSize: 15 }}>
              <i className="ri-sparkling-line" style={{ color: '#f59e0b' }}></i> แนะนำสินค้า
            </h3>
            <Link href="/products" style={{ fontSize: 12, color: 'var(--primary)' }}>ดูทั้งหมด</Link>
          </div>
          <ProductRecommendations
            products={allProducts}
            healthConditions={(extra?.healthConditionsJson as string[]) ?? []}
            grade={extra?.grade ?? null}
            recentProductNames={recentProductNames}
          />
        </div>

        <div className="card p-4">
          <h3 className="fw-600 mb-3" style={{ fontSize: 15 }}>
            <i className="ri-map-pin-line text-primary"></i> ที่อยู่ล่าสุด
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-dark)', lineHeight: 1.8 }}>
            {latestOrder.address || <span className="text-muted">ไม่มีข้อมูลที่อยู่</span>}
          </p>
        </div>
      </div>
    </div>
  );

  const tasksTab = (
    <div className="card p-4">
      <TasksPanel
        phone={decodedPhone}
        currentUserId={user.id}
        tasks={tasks.map(t => ({
          id: t.id, title: t.title, note: t.note, dueDate: t.dueDate,
          type: t.type, status: t.status, priority: t.priority,
          assignedTo: t.assignedTo, createdBy: t.createdBy,
          completedAt: t.completedAt, resultNote: t.resultNote,
        }))}
        members={assignableMembers}
      />
    </div>
  );

  const ordersTab = (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
        <h3 className="fw-600" style={{ fontSize: 15 }}>
          <i className="ri-shopping-bag-3-line text-primary"></i> ประวัติออเดอร์ทั้งหมด
        </h3>
      </div>
      <div className="r-table-wrap">
        <table className="r-table">
          <thead>
            <tr>
              <th>วันที่</th><th>ที่มา</th><th>สินค้า</th><th>เซลส์</th><th>ช่องทาง</th><th>สถานะ</th>
              <th style={{ textAlign: 'right' }}>ยอด</th>
              <th style={{ textAlign: 'right' }}>งาน</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => {
              const products = Array.isArray(o.productsJson) ? (o.productsJson as { name?: string; quantity?: number }[]) : [];
              const productNames = products.map(p => p.name ?? '').filter(Boolean);
              return (
                <tr key={o.id}>
                  <td className="text-sm" data-label="วันที่">{(o.date ?? o.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                  <td data-label="ที่มา"><SourceBadge source={o.source} compact /></td>
                  <td className="text-sm r-cell-block" data-label="สินค้า">{products.length > 0 ? products.map(p => `${p.name ?? '-'} x${p.quantity ?? 1}`).join(', ') : '-'}</td>
                  <td className="text-sm" data-label="เซลส์">{o.salesRepName || '-'}</td>
                  <td className="text-sm" data-label="ช่องทาง">{o.channel || '-'}</td>
                  <td data-label="สถานะ"><StatusBadge status={o.status} /></td>
                  <td className="fw-600" data-label="ยอด" style={{ textAlign: 'right' }}>฿{Number(o.totalPrice ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}</td>
                  <td className="r-cell-actions" data-label="งาน" style={{ textAlign: 'right' }}>
                    <SetTaskButton
                      customerPhone={decodedPhone} orderId={o.id}
                      orderDate={(o.date ?? o.createdAt).toISOString()}
                      productNames={productNames}
                      isFirstOrder={o.id === oldestOrderId}
                      currentUserId={user.id} members={assignableMembers}
                      hasExistingTasks={ordersWithTasks.has(o.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const followUpTab = (
    <div className="customer-profile-grid">
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
          <h3 className="fw-600" style={{ fontSize: 15 }}>
            <i className="ri-phone-line text-primary"></i> ประวัติการติดตามทั้งหมด
          </h3>
        </div>
        {followUps.length === 0 ? (
          <div className="text-center text-muted p-4" style={{ padding: '3rem' }}>
            <i className="ri-file-list-3-line" style={{ fontSize: 40, color: 'var(--text-light)' }}></i>
            <p className="mt-2 text-sm">ยังไม่มีการบันทึก</p>
          </div>
        ) : (
          <div style={{ padding: '0.5rem 0' }}>
            {followUps.map(f => (
              <div key={f.id} style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
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
      <div className="card p-4" style={{ height: 'fit-content' }}>
        <h3 className="fw-600 mb-3" style={{ fontSize: 15 }}>
          <i className="ri-edit-line text-primary"></i> บันทึกการติดตาม
        </h3>
        <FollowUpForm customerPhone={decodedPhone} sheetUserId={user.id} />
      </div>
    </div>
  );

  const profileDataTab = (
    <div className="customer-profile-grid customer-profile-grid-2col">
      <div className="card p-4">
        <h3 className="fw-600 mb-3" style={{ fontSize: 15 }}>
          <i className="ri-medal-line text-primary"></i> เกรดลูกค้า
        </h3>
        <GradePanel
          phone={decodedPhone}
          currentGrade={extra?.grade ?? null}
          currentChecklist={(extra?.gradeChecklistJson as ChecklistAnswers) ?? null}
          gradeNote={extra?.gradeNote ?? null}
          gradeUpdatedAt={extra?.gradeUpdatedAt ?? null}
        />
      </div>
      <div className="card p-4">
        <h3 className="fw-600 mb-3" style={{ fontSize: 15 }}>
          <i className="ri-heart-pulse-line" style={{ color: '#e74a3b' }}></i> โรคประจำตัว / อาการ
        </h3>
        <HealthConditionsEditor
          phone={decodedPhone}
          initialConditions={(extra?.healthConditionsJson as string[]) ?? []}
        />
      </div>
      <div className="card p-4 customer-profile-grid-span-all">
        <h3 className="fw-600 mb-3" style={{ fontSize: 15 }}>
          <i className="ri-sticky-note-line text-orange"></i> โน้ตลูกค้า
        </h3>
        <NoteEditor phone={decodedPhone} initialNote={extra?.note ?? ''} />
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Sticky Hero ─── */}
      <div className="profile-hero">
        <div className="profile-hero-row">
          <Link href="/customers" className="icon-btn" aria-label="กลับ">
            <i className="ri-arrow-left-line"></i>
          </Link>
          <div className="profile-hero-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="profile-hero-name-row">
              <h1 className="profile-hero-name">{name}</h1>
              {extra?.grade && <GradeBadge grade={extra.grade as 'A' | 'B' | 'C'} />}
              <span className={`status-badge stage-${stage}`} style={{ fontSize: 12 }}>
                <i className={STAGE_ICONS[stage]}></i> {STAGE_LABELS[stage]}
              </span>
            </div>
            <div className="profile-hero-meta">
              <span><i className="ri-phone-line"></i> {decodedPhone}</span>
              <span className="profile-hero-divider">•</span>
              <span><i className="ri-money-dollar-circle-line"></i> ฿{totalSpent.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</span>
              <span className="profile-hero-divider">•</span>
              <span><i className="ri-shopping-bag-3-line"></i> {orderCount} ออเดอร์</span>
              <span className="profile-hero-divider">•</span>
              <span style={{ color: daysSince !== null && daysSince > 60 ? 'var(--danger)' : undefined }}>
                <i className="ri-time-line"></i> {daysSince !== null ? `สั่งล่าสุด ${daysSince} วันที่แล้ว` : '-'}
              </span>
            </div>
          </div>
          {user.role !== 'ADMIN' && (
            <div className="profile-hero-actions">
              <ReorderButton
                customerPhone={decodedPhone}
                customerName={name}
                defaultAddress={latestOrder.address ?? ''}
                defaultChannel={latestOrder.channel}
                productSuggestions={allProducts.map(p => p.name)}
                lastOrderProducts={
                  (Array.isArray(latestOrder.productsJson) ? (latestOrder.productsJson as { name?: string; quantity?: number }[]) : [])
                    .filter(p => p.name)
                    .map(p => ({ name: String(p.name), quantity: Number(p.quantity ?? 1) }))
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <ProfileTabs
        tabs={[
          { id: 'overview', label: 'ภาพรวม',  icon: 'ri-home-4-line',          content: overviewTab },
          { id: 'tasks',    label: 'งาน',      icon: 'ri-task-line',             badge: pendingTaskCount, badgeColor: 'var(--orange)', content: tasksTab },
          { id: 'orders',   label: 'ออเดอร์',  icon: 'ri-shopping-bag-3-line',   badge: orderCount,        content: ordersTab },
          { id: 'followup', label: 'ติดตาม',   icon: 'ri-phone-line',            badge: followUps.length,  content: followUpTab },
          { id: 'profile',  label: 'โปรไฟล์',  icon: 'ri-user-settings-line',    content: profileDataTab },
        ]}
      />
    </>
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

const GRADE_STYLE: Record<'A' | 'B' | 'C', { color: string; bg: string }> = {
  A: { color: '#1cc88a', bg: 'var(--success-light)' },
  B: { color: '#f8961e', bg: 'var(--orange-light)' },
  C: { color: '#e74a3b', bg: 'var(--danger-light)' },
};

function GradeBadge({ grade }: { grade: 'A' | 'B' | 'C' }) {
  const s = GRADE_STYLE[grade];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: s.bg, color: s.color,
      borderRadius: 20, padding: '0.3rem 0.7rem',
      fontSize: 12, fontWeight: 800,
    }}>
      เกรด {grade}
    </span>
  );
}
