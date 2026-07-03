import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NewOrderForm from './NewOrderForm';

export default async function NewOrderPage() {
  const user = (await getCurrentUser())!;

  // ADMIN ไม่ลงออเดอร์เอง
  if (user.role === 'ADMIN') {
    return (
      <>
        <PageHead />
        <div className="card p-4" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <i className="ri-shield-user-line" style={{ fontSize: 40, color: 'var(--text-muted)' }}></i>
          <p className="mt-2 text-muted">ADMIN ดูแลภาพรวม — การลงออเดอร์เป็นหน้าที่ของเซลส์</p>
          <Link href="/orders" className="btn btn-primary mt-3"><i className="ri-list-check"></i> ดูออเดอร์ทั้งหมด</Link>
        </div>
      </>
    );
  }

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { name: true },
  });

  return (
    <>
      <PageHead />
      <NewOrderForm productSuggestions={products.map(p => p.name)} />
    </>
  );
}

function PageHead() {
  return (
    <div className="page-header mb-4">
      <div className="flex-between" style={{ alignItems: 'center' }}>
        <div>
          <h1 className="page-title"><i className="ri-add-circle-line text-primary"></i> กรอกออเดอร์</h1>
          <p className="text-sm text-muted mt-1">ลงออเดอร์ลูกค้าใหม่ หรือเก่า — ระบบแยกให้อัตโนมัติจากเบอร์</p>
        </div>
        <Link href="/orders" className="btn" style={{ background: '#fff', border: '1px solid var(--border)' }}>
          <i className="ri-arrow-left-line"></i> กลับ
        </Link>
      </div>
    </div>
  );
}
