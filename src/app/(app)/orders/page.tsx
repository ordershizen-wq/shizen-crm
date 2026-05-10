import { getCurrentUser, getOrderFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

type SearchParams = Promise<{ status?: string; q?: string }>;

const STATUS_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด', icon: 'ri-list-check' },
  { value: 'PENDING', label: 'รอดำเนินการ', icon: 'ri-time-line' },
  { value: 'PAID', label: 'ชำระแล้ว', icon: 'ri-checkbox-circle-line' },
  { value: 'PACKED', label: 'แพ็คแล้ว', icon: 'ri-archive-line' },
  { value: 'COD', label: 'COD', icon: 'ri-truck-line' },
  { value: 'RETURNED', label: 'ตีกลับ', icon: 'ri-arrow-go-back-line' },
  { value: 'CANCELLED', label: 'ยกเลิก', icon: 'ri-close-circle-line' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PAID: { bg: 'var(--success-light)', color: 'var(--success)', label: 'ชำระแล้ว' },
  PACKED: { bg: 'var(--blue-light)', color: 'var(--primary)', label: 'แพ็คแล้ว' },
  COD: { bg: 'var(--warning-light)', color: '#d39e00', label: 'COD' },
  PENDING: { bg: 'var(--purple-light)', color: '#6f42c1', label: 'รอดำเนินการ' },
  RETURNED: { bg: 'var(--danger-light)', color: 'var(--danger)', label: 'ตีกลับ' },
  CANCELLED: { bg: 'var(--danger-light)', color: 'var(--danger)', label: 'ยกเลิก' },
  OTHER: { bg: '#f1f5f9', color: '#64748b', label: 'อื่นๆ' },
};

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const statusFilter = params.status && params.status !== 'all' ? params.status : undefined;
  const q = params.q?.trim().toLowerCase();

  const user = (await getCurrentUser())!;
  const teamFilter = (await getOrderFilter(user)) ?? {};

  const where = {
    ...teamFilter,
    ...(statusFilter ? { status: statusFilter as never } : {}),
  };

  const orders = await prisma.sheetOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      customerName: true,
      phone: true,
      totalPrice: true,
      status: true,
      channel: true,
      salesRepName: true,
      createdAt: true,
      productsJson: true,
    },
  });

  // Client-side search filter
  const filtered = q
    ? orders.filter(
        o =>
          o.customerName?.toLowerCase().includes(q) ||
          o.phone?.includes(q) ||
          o.salesRepName?.toLowerCase().includes(q)
      )
    : orders;

  // Count per status
  const allCount = await prisma.sheetOrder.count({ where: teamFilter });
  const countPerStatus = await prisma.sheetOrder.groupBy({
    by: ['status'],
    where: teamFilter,
    _count: true,
  });
  const countMap = new Map(countPerStatus.map(c => [c.status, c._count]));

  return (
    <>
      <div className="page-header flex-between mb-4">
        <div>
          <h1 className="page-title">ออเดอร์ทั้งหมด</h1>
          <p className="text-sm text-muted mt-1">
            {allCount.toLocaleString()} รายการ
            {user.role === 'MEMBER' && ` (เฉพาะของฉัน)`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-3 mb-4 r-tabs-scroll" style={{ alignItems: 'center' }}>
        {STATUS_OPTIONS.map(opt => {
          const count = opt.value === 'all' ? allCount : (countMap.get(opt.value as never) ?? 0);
          const active = (!statusFilter && opt.value === 'all') || statusFilter === opt.value;
          const href = opt.value === 'all'
            ? (q ? `/orders?q=${encodeURIComponent(q)}` : '/orders')
            : `/orders?status=${opt.value}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
          return (
            <Link
              key={opt.value}
              href={href}
              className="btn"
              style={{
                background: active ? 'var(--primary)' : 'var(--bg-app)',
                color: active ? '#fff' : 'var(--text-muted)',
                padding: '0.4rem 0.85rem',
                fontSize: 12,
              }}
            >
              <i className={opt.icon}></i> {opt.label}
              <span style={{
                background: active ? 'rgba(255,255,255,0.25)' : 'var(--border-light)',
                padding: '0.05rem 0.5rem',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
              }}>{count}</span>
            </Link>
          );
        })}

      </div>

      <form className="search-wrap mb-3" style={{ width: '100%' }}>
        <i className="ri-search-line"></i>
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="ค้นหาชื่อ/เบอร์/เซลส์..."
          className="search-input"
          style={{ width: '100%' }}
        />
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
      </form>

      {/* Orders table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="r-table-wrap">
          <table className="r-table">
            <thead>
              <tr>
                <th>ลูกค้า</th>
                <th>สินค้า</th>
                <th>เซลส์</th>
                <th>ช่องทาง</th>
                <th>สถานะ</th>
                <th style={{ textAlign: 'right' }}>ยอด</th>
                <th>วันที่</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="r-cell-block" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <i className="ri-inbox-line" style={{ fontSize: 36 }}></i>
                    <p className="mt-1">ไม่พบออเดอร์</p>
                  </td>
                </tr>
              ) : (
                filtered.map(o => {
                  const products = Array.isArray(o.productsJson)
                    ? (o.productsJson as { name?: string; quantity?: number }[])
                    : [];
                  const style = STATUS_STYLE[o.status] ?? STATUS_STYLE.OTHER;
                  return (
                    <tr key={o.id}>
                      <td data-label="ลูกค้า">
                        <div>
                          {o.phone ? (
                            <Link href={`/customers/${o.phone}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                              {o.customerName || '(ไม่ระบุ)'}
                            </Link>
                          ) : (
                            <span className="fw-500">{o.customerName || '(ไม่ระบุ)'}</span>
                          )}
                          {o.phone && <div className="text-sm text-muted">{o.phone}</div>}
                        </div>
                      </td>
                      <td className="text-sm r-cell-block" data-label="สินค้า" style={{ maxWidth: 240 }}>
                        {products.length > 0
                          ? products.map(p => `${p.name ?? '-'} x${p.quantity ?? 1}`).join(', ')
                          : '-'}
                      </td>
                      <td className="text-sm" data-label="เซลส์">{o.salesRepName || '-'}</td>
                      <td className="text-sm" data-label="ช่องทาง">{o.channel || '-'}</td>
                      <td data-label="สถานะ">
                        <span className="status-badge" style={{ background: style.bg, color: style.color }}>
                          {style.label}
                        </span>
                      </td>
                      <td className="fw-600" data-label="ยอด" style={{ textAlign: 'right' }}>
                        ฿{Number(o.totalPrice ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-sm text-muted" data-label="วันที่">
                        {o.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length >= 200 && (
          <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid var(--border-light)' }}>
            <p className="text-sm text-muted">แสดง 200 รายการล่าสุด — ใช้ตัวกรองสถานะเพื่อค้นหาเพิ่มเติม</p>
          </div>
        )}
      </div>
    </>
  );
}
