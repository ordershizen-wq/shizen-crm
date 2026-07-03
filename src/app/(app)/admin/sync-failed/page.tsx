import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import RetrySyncButton from './RetrySyncButton';
import { OrderSource, SyncStatus } from '@prisma/client';

export default async function SyncFailedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  // ออเดอร์ที่สร้างใน CRM มี 2 source: CRM_NEW (ลูกค้าใหม่) + CRM_REORDER — ต้อง sync ทั้งคู่
  const crmSources = [OrderSource.CRM_NEW, OrderSource.CRM_REORDER];

  const orders = await prisma.sheetOrder.findMany({
    where: {
      source: { in: crmSources },
      syncStatus: { in: [SyncStatus.FAILED, SyncStatus.PENDING] },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      customerName: true,
      phone: true,
      totalPrice: true,
      syncStatus: true,
      syncError: true,
      syncAttempts: true,
      createdAt: true,
      salesRepName: true,
    },
  });

  const [pendingCount, failedCount, syncedCount] = await Promise.all([
    prisma.sheetOrder.count({
      where: { source: { in: crmSources }, syncStatus: SyncStatus.PENDING },
    }),
    prisma.sheetOrder.count({
      where: { source: { in: crmSources }, syncStatus: SyncStatus.FAILED },
    }),
    prisma.sheetOrder.count({
      where: { source: { in: crmSources }, syncStatus: SyncStatus.SYNCED },
    }),
  ]);

  return (
    <>
      <div className="page-header flex-between mb-4">
        <div>
          <h1 className="page-title">
            <i className="ri-refresh-line text-orange"></i> ออเดอร์ที่ sync ไป Sheet ล้มเหลว
          </h1>
          <p className="text-sm text-muted mt-1">
            ออเดอร์ที่สร้างใน CRM (ลูกค้าใหม่ + รีออเดอร์) แต่ยังไม่ไปถึง Sheet — กด retry เพื่อส่งใหม่
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiBox label="รอ sync" value={pendingCount} color="#d39e00" icon="ri-time-line" />
        <KpiBox label="ล้มเหลว" value={failedCount} color="var(--danger)" icon="ri-error-warning-line" />
        <KpiBox label="sync สำเร็จแล้ว" value={syncedCount} color="var(--success)" icon="ri-checkbox-circle-line" />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {orders.length === 0 ? (
          <div className="text-center text-muted" style={{ padding: '4rem' }}>
            <i className="ri-checkbox-circle-line" style={{ fontSize: 56, color: 'var(--success)' }}></i>
            <h3 className="fw-600 mt-2" style={{ color: 'var(--text-dark)' }}>ไม่มีออเดอร์รอ sync</h3>
            <p className="text-sm">ทุกออเดอร์ที่สร้างใน CRM ถูก sync เข้า Sheet เรียบร้อย</p>
          </div>
        ) : (
          <div className="r-table-wrap">
            <table className="r-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>ลูกค้า</th>
                  <th>เซลส์</th>
                  <th>สถานะ</th>
                  <th>พยายาม</th>
                  <th>ข้อผิดพลาด</th>
                  <th style={{ textAlign: 'right' }}>ยอด</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="text-sm" data-label="วันที่">
                      {o.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td data-label="ลูกค้า">
                      {o.phone ? (
                        <Link href={`/customers/${o.phone}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                          {o.customerName ?? '(ไม่ระบุ)'}
                        </Link>
                      ) : (
                        o.customerName ?? '-'
                      )}
                      {o.phone && <div className="text-sm text-muted">{o.phone}</div>}
                    </td>
                    <td className="text-sm" data-label="เซลส์">{o.salesRepName ?? '-'}</td>
                    <td data-label="สถานะ">
                      <SyncStatusBadge status={o.syncStatus} />
                    </td>
                    <td className="text-sm text-muted" data-label="พยายาม">{o.syncAttempts}</td>
                    <td className="text-sm r-cell-block" data-label="ข้อผิดพลาด" style={{ maxWidth: 320 }}>
                      <span style={{ color: 'var(--danger)', fontSize: 12 }}>{o.syncError ?? '-'}</span>
                    </td>
                    <td className="fw-600" data-label="ยอด" style={{ textAlign: 'right' }}>
                      ฿{Number(o.totalPrice ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="r-cell-actions">
                      <RetrySyncButton orderId={o.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function KpiBox({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="card p-4">
      <div className="flex-between mb-2">
        <span className="text-sm text-muted">{label}</span>
        <i className={icon} style={{ color, fontSize: 20 }}></i>
      </div>
      <div className="fw-700" style={{ fontSize: 24, color }}>{value.toLocaleString()}</div>
    </div>
  );
}

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const config: Record<SyncStatus, { bg: string; color: string; label: string }> = {
    NA:      { bg: '#f1f5f9', color: '#64748b', label: 'ไม่ต้อง sync' },
    PENDING: { bg: 'var(--warning-light)', color: '#d39e00', label: 'รอ sync' },
    SYNCED:  { bg: 'var(--success-light)', color: 'var(--success)', label: 'sync แล้ว' },
    FAILED:  { bg: 'var(--danger-light)', color: 'var(--danger)', label: 'ล้มเหลว' },
  };
  const c = config[status];
  return <span className="status-badge" style={{ background: c.bg, color: c.color }}>{c.label}</span>;
}
