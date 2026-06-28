import { getCurrentUser, getOrderFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { calculateStage, STAGE_LABELS, STAGE_ICONS, type CustomerStage } from '@/lib/customer';

type SearchParams = Promise<{ stage?: string; q?: string; grade?: string }>;

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
  grade: string | null;
};

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const stageFilter = params.stage;
  const gradeFilter = params.grade;
  const searchQuery = params.q?.trim().toLowerCase();

  const user = (await getCurrentUser())!;
  const orderFilter = (await getOrderFilter(user)) ?? {};

  // 1) GROUP BY phone ใน DB → ได้ 1 row ต่อลูกค้า (orderCount, totalSpent, firstOrderAt, lastOrderAt)
  // 2) ค่อยดึงรายละเอียดล่าสุด (name/address/salesRep/channel) จาก order ล่าสุดของเฉพาะเบอร์ที่ต้องโชว์
  const [phoneRows, extras] = await Promise.all([
    prisma.sheetOrder.groupBy({
      by: ['phone'],
      where: { ...orderFilter, phone: { not: null } },
      _count: { _all: true },
      _sum: { totalPrice: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    }),
    prisma.sheetCustomerExtra.findMany({
      select: { phone: true, grade: true },
    }),
  ]);

  const gradeMap = new Map(extras.map(e => [e.phone, e.grade]));

  // ดึงรายละเอียดล่าสุดต่อเบอร์ — query เดียวคืนทุก "order ล่าสุด" ผ่าน distinct on phone
  const latestPerPhone = await prisma.sheetOrder.findMany({
    where: {
      ...orderFilter,
      phone: { in: phoneRows.map(r => r.phone!).filter(Boolean) },
    },
    orderBy: [{ phone: 'asc' }, { createdAt: 'desc' }],
    distinct: ['phone'],
    select: {
      phone: true,
      customerName: true,
      address: true,
      salesRepName: true,
      channel: true,
    },
  });
  const latestMap = new Map(latestPerPhone.map(o => [o.phone!, o]));

  const customers: CustomerRow[] = phoneRows
    .filter(r => r.phone && r._max.createdAt)
    .map(r => {
      const latest = latestMap.get(r.phone!);
      const orderCount = r._count._all;
      const totalSpent = Number(r._sum.totalPrice ?? 0);
      const lastOrderAt = r._max.createdAt!;
      return {
        phone: r.phone!,
        name: latest?.customerName ?? null,
        address: latest?.address ?? null,
        orderCount,
        totalSpent,
        firstOrderAt: r._min.createdAt,
        lastOrderAt,
        lastSalesRep: latest?.salesRepName ?? null,
        lastChannel: latest?.channel ?? null,
        stage: calculateStage({ lastOrderAt, orderCount, totalSpent }),
        grade: gradeMap.get(r.phone!) ?? null,
      };
    });

  // Apply filters
  let filtered = customers;
  if (stageFilter && stageFilter !== 'all') {
    filtered = filtered.filter(c => c.stage === stageFilter);
  }
  if (gradeFilter && gradeFilter !== 'all') {
    filtered = filtered.filter(c => c.grade === gradeFilter);
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

      {/* Search box */}
      <form className="search-wrap mb-3" style={{ width: '100%' }}>
        <i className="ri-search-line"></i>
        <input
          type="text"
          name="q"
          defaultValue={searchQuery ?? ''}
          placeholder="ค้นหาชื่อ/เบอร์..."
          className="search-input"
          style={{ width: '100%' }}
        />
        {stageFilter && <input type="hidden" name="stage" value={stageFilter} />}
        {gradeFilter && <input type="hidden" name="grade" value={gradeFilter} />}
      </form>

      {/* Filter by Stage */}
      <div className="card p-3 mb-3 r-tabs-scroll" style={{ alignItems: 'center' }}>
        <StageFilter stage="all" label="ทั้งหมด" icon="ri-list-check" count={stageCounts.all} active={!stageFilter || stageFilter === 'all'} q={searchQuery} grade={gradeFilter} />
        {(['VIP', 'NEW', 'ACTIVE', 'AT_RISK', 'LAPSED', 'LOST'] as CustomerStage[]).map(s => (
          <StageFilter
            key={s}
            stage={s}
            label={STAGE_LABELS[s]}
            icon={STAGE_ICONS[s]}
            count={stageCounts[s]}
            active={stageFilter === s}
            q={searchQuery}
            grade={gradeFilter}
          />
        ))}
      </div>

      {/* Filter by Grade */}
      <div className="card p-3 mb-4 r-tabs-scroll" style={{ alignItems: 'center' }}>
        <span className="text-sm fw-600" style={{ color: 'var(--text-muted)', marginRight: 4 }}>
          <i className="ri-medal-line"></i> เกรด:
        </span>
        {[
          { g: null, label: 'ทั้งหมด' },
          { g: 'A', label: 'A — รักสุขภาพ' },
          { g: 'B', label: 'B — พอสมควร' },
          { g: 'C', label: 'C — ยังไม่ดูแล' },
        ].map(({ g, label }) => {
          const active = (!gradeFilter && g === null) || gradeFilter === g;
          const gradeColor = g === 'A' ? '#1cc88a' : g === 'B' ? '#f8961e' : g === 'C' ? '#e74a3b' : 'var(--text-muted)';
          const href = buildHref({ stage: stageFilter, grade: g ?? undefined, q: searchQuery });
          return (
            <Link
              key={g ?? 'all'}
              href={href}
              className="btn"
              style={{
                background: active ? (g ? gradeColor : 'var(--primary)') : 'var(--bg-app)',
                color: active ? '#fff' : (g ? gradeColor : 'var(--text-muted)'),
                padding: '0.4rem 0.85rem', fontSize: 12,
                border: `1.5px solid ${active ? 'transparent' : (g ? gradeColor + '55' : 'var(--border-light)')}`,
              }}
            >
              {label}
            </Link>
          );
        })}
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

function buildHref({ stage, grade, q }: { stage?: string; grade?: string; q?: string }) {
  const p = new URLSearchParams();
  if (stage && stage !== 'all') p.set('stage', stage);
  if (grade && grade !== 'all') p.set('grade', grade);
  if (q) p.set('q', q);
  const qs = p.toString();
  return `/customers${qs ? `?${qs}` : ''}`;
}

function StageFilter({
  stage, label, icon, count, active, q, grade,
}: {
  stage: string;
  label: string;
  icon: string;
  count: number;
  active: boolean;
  q?: string;
  grade?: string;
}) {
  const href = buildHref({ stage, grade, q });

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

const GRADE_BADGE: Record<string, { color: string; bg: string }> = {
  A: { color: '#1cc88a', bg: 'var(--success-light)' },
  B: { color: '#f8961e', bg: 'var(--orange-light)' },
  C: { color: '#e74a3b', bg: 'var(--danger-light)' },
};

function CustomerCard({ customer: c }: { customer: CustomerRow }) {
  const stageLabel = STAGE_LABELS[c.stage];
  const stageIcon = STAGE_ICONS[c.stage];
  const daysSince = c.lastOrderAt
    ? Math.floor((Date.now() - c.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const aov = c.orderCount > 0 ? c.totalSpent / c.orderCount : 0;
  const atRisk = c.stage === 'AT_RISK' || c.stage === 'LAPSED' || c.stage === 'LOST';

  const gradeStyle = c.grade ? GRADE_BADGE[c.grade] : null;

  return (
    <Link href={`/customers/${c.phone}`} className={`customer-card ${c.stage === 'VIP' ? 'vip' : ''}`}>
      {/* head: name/phone + chips */}
      <div className="cust-card-head">
        <div className="cust-id">
          <div className="cust-name">{c.name || 'ไม่ระบุชื่อ'}</div>
          <div className="cust-phone">{c.phone}</div>
        </div>
        <div className="cust-chips">
          {gradeStyle && (
            <span className="cust-grade" style={{ background: gradeStyle.bg, color: gradeStyle.color }}>
              {c.grade}
            </span>
          )}
          <span className={`status-badge stage-${c.stage}`}>
            <i className={stageIcon}></i> {stageLabel}
          </span>
        </div>
      </div>

      {/* 3-stat strip: ยอดรวม / ออเดอร์ / AOV */}
      <div className="cust-strip">
        <div className="cust-stat">
          <div className="cust-stat-val">฿{c.totalSpent.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</div>
          <div className="cust-stat-lbl">ยอดรวม</div>
        </div>
        <div className="cust-stat">
          <div className="cust-stat-val">{c.orderCount}</div>
          <div className="cust-stat-lbl">ออเดอร์</div>
        </div>
        <div className="cust-stat">
          <div className="cust-stat-val">฿{aov.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</div>
          <div className="cust-stat-lbl">/บิล</div>
        </div>
      </div>

      {/* footer: recency + sales rep */}
      <div className="cust-foot">
        <span className={atRisk ? 'cust-recency warn' : undefined}>
          ล่าสุด {daysSince !== null ? `${daysSince} วัน` : '-'}
        </span>
        <span className="sep">·</span>
        <span>เซลส์ <b>{c.lastSalesRep || '-'}</b></span>
      </div>
    </Link>
  );
}
