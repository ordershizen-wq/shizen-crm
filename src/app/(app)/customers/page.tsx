import { getCurrentUser, getOrderFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { calculateStage, STAGE_LABELS, STAGE_ICONS, type CustomerStage } from '@/lib/customer';

type SearchParams = Promise<{ stage?: string; q?: string }>;

type CustomerRow = {
  phone: string;
  name: string | null;
  address: string | null;
  orderCount: number;
  totalSpent: number;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
  lastSalesRep: string | null;
  lastChannel: string | null;
  stage: CustomerStage;
};

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const stageFilter = params.stage;
  const searchQuery = params.q?.trim().toLowerCase();

  const user = (await getCurrentUser())!;
  const orderFilter = (await getOrderFilter(user)) ?? {};

  // ดึง orders ทั้งหมดในขอบเขตทีม (filter จะทำได้เฉพาะข้อมูลที่เห็น)
  const orders = await prisma.sheetOrder.findMany({
    where: { ...orderFilter, phone: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: {
      phone: true,
      customerName: true,
      address: true,
      totalPrice: true,
      createdAt: true,
      salesRepName: true,
      channel: true,
    },
  });

  // Group by phone → customer aggregate
  const byPhone = new Map<string, CustomerRow>();
  for (const o of orders) {
    if (!o.phone) continue;
    const existing = byPhone.get(o.phone);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += Number(o.totalPrice ?? 0);
      if (!existing.firstOrderAt || o.createdAt < existing.firstOrderAt) {
        existing.firstOrderAt = o.createdAt;
      }
      if (!existing.lastOrderAt || o.createdAt > existing.lastOrderAt) {
        existing.lastOrderAt = o.createdAt;
        existing.lastSalesRep = o.salesRepName;
        existing.lastChannel = o.channel;
        existing.name = o.customerName || existing.name;
        existing.address = o.address || existing.address;
      }
    } else {
      byPhone.set(o.phone, {
        phone: o.phone,
        name: o.customerName,
        address: o.address,
        orderCount: 1,
        totalSpent: Number(o.totalPrice ?? 0),
        firstOrderAt: o.createdAt,
        lastOrderAt: o.createdAt,
        lastSalesRep: o.salesRepName,
        lastChannel: o.channel,
        stage: 'NEW',
      });
    }
  }

  // Compute stage for each
  const customers: CustomerRow[] = Array.from(byPhone.values()).map(c => ({
    ...c,
    stage: calculateStage({
      lastOrderAt: c.lastOrderAt,
      orderCount: c.orderCount,
      totalSpent: c.totalSpent,
    }),
  }));

  // Apply filters
  let filtered = customers;
  if (stageFilter && stageFilter !== 'all') {
    filtered = filtered.filter(c => c.stage === stageFilter);
  }
  if (searchQuery) {
    filtered = filtered.filter(
      c =>
        c.phone.includes(searchQuery) ||
        c.name?.toLowerCase().includes(searchQuery)
    );
  }

  // Sort by lastOrderAt DESC
  filtered.sort((a, b) => {
    const bt = b.lastOrderAt?.getTime() ?? 0;
    const at = a.lastOrderAt?.getTime() ?? 0;
    return bt - at;
  });

  // Stage counts
  const stageCounts: Record<CustomerStage | 'all', number> = {
    all: customers.length,
    NEW: 0, ACTIVE: 0, AT_RISK: 0, LAPSED: 0, LOST: 0, VIP: 0,
  };
  for (const c of customers) stageCounts[c.stage] += 1;

  return (
    <>
      <div className="page-header flex-between mb-4">
        <div>
          <h1 className="page-title">จัดการลูกค้า</h1>
          <p className="text-sm text-muted mt-1">
            {customers.length.toLocaleString()} คน
            {user.role === 'MEMBER' && ` (เฉพาะของฉัน)`}
          </p>
        </div>
      </div>

      {/* Filter by Stage */}
      <div className="card p-3 mb-4" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <StageFilter stage="all" label="ทั้งหมด" icon="ri-list-check" count={stageCounts.all} active={!stageFilter || stageFilter === 'all'} q={searchQuery} />
        {(['VIP', 'NEW', 'ACTIVE', 'AT_RISK', 'LAPSED', 'LOST'] as CustomerStage[]).map(s => (
          <StageFilter
            key={s}
            stage={s}
            label={STAGE_LABELS[s]}
            icon={STAGE_ICONS[s]}
            count={stageCounts[s]}
            active={stageFilter === s}
            q={searchQuery}
          />
        ))}

        {/* Search box */}
        <form style={{ marginLeft: 'auto' }} className="search-wrap">
          <i className="ri-search-line"></i>
          <input
            type="text"
            name="q"
            defaultValue={searchQuery ?? ''}
            placeholder="ค้นหาชื่อ/เบอร์..."
            className="search-input"
            style={{ width: 250 }}
          />
          {stageFilter && <input type="hidden" name="stage" value={stageFilter} />}
        </form>
      </div>

      {/* Customer Grid */}
      {filtered.length === 0 ? (
        <div className="card p-4 text-center" style={{ padding: '3rem' }}>
          <i className="ri-user-search-line" style={{ fontSize: 48, color: 'var(--text-light)' }}></i>
          <p className="text-muted mt-2">ไม่พบลูกค้าที่ตรงกับเงื่อนไข</p>
        </div>
      ) : (
        <div className="customer-grid">
          {filtered.slice(0, 100).map(c => (
            <CustomerCard key={c.phone} customer={c} />
          ))}
        </div>
      )}

      {filtered.length > 100 && (
        <p className="text-center text-sm text-muted mt-4">
          แสดง 100 จาก {filtered.length.toLocaleString()} คน — กรุณาใช้ตัวกรองเพื่อค้นหาเฉพาะกลุ่ม
        </p>
      )}
    </>
  );
}

function StageFilter({
  stage, label, icon, count, active, q,
}: {
  stage: string;
  label: string;
  icon: string;
  count: number;
  active: boolean;
  q?: string;
}) {
  const href = stage === 'all'
    ? (q ? `/customers?q=${encodeURIComponent(q)}` : '/customers')
    : `/customers?stage=${stage}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <Link
      href={href}
      className="btn"
      style={{
        background: active ? 'var(--primary)' : 'var(--bg-app)',
        color: active ? '#fff' : 'var(--text-muted)',
        padding: '0.4rem 0.85rem',
        fontSize: 12,
      }}
    >
      <i className={icon}></i> {label}
      <span style={{
        background: active ? 'rgba(255,255,255,0.25)' : 'var(--border-light)',
        padding: '0.05rem 0.5rem',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 700,
      }}>{count}</span>
    </Link>
  );
}

function CustomerCard({ customer: c }: { customer: CustomerRow }) {
  const stageLabel = STAGE_LABELS[c.stage];
  const stageIcon = STAGE_ICONS[c.stage];
  const daysSince = c.lastOrderAt
    ? Math.floor((Date.now() - c.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link href={`/customers/${c.phone}`} className={`customer-card ${c.stage === 'VIP' ? 'vip' : ''}`}>
      <div className="flex-between mb-3">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="fw-700" style={{ fontSize: 15, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <i className="ri-user-line text-muted"></i> {c.name || 'ไม่ระบุชื่อ'}
          </h3>
          <p className="text-sm text-muted">
            <i className="ri-phone-line"></i> {c.phone}
          </p>
        </div>
        <span className={`status-badge stage-${c.stage}`}>
          <i className={stageIcon}></i> {stageLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <div className="text-sm text-muted">ยอดสะสม</div>
          <div className="fw-700 text-blue">฿{c.totalSpent.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</div>
        </div>
        <div>
          <div className="text-sm text-muted">จำนวนออเดอร์</div>
          <div className="fw-700">{c.orderCount} ครั้ง</div>
        </div>
      </div>

      <div className="border-top pt-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
          <span><i className="ri-calendar-line"></i> สั่งล่าสุด</span>
          <span className="fw-600" style={{ color: 'var(--text-dark)' }}>
            {daysSince !== null ? `${daysSince} วันที่แล้ว` : '-'}
          </span>
        </div>
        <div className="flex-between">
          <span><i className="ri-user-star-line"></i> เซลส์</span>
          <span className="fw-500" style={{ color: 'var(--text-dark)' }}>
            {c.lastSalesRep || '-'}
          </span>
        </div>
      </div>
    </Link>
  );
}
