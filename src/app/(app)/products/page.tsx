import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProducts, seedDefaultProducts } from './actions';
import ProductManager from './ProductManager';

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // seed ครั้งแรก (ถ้า DB ยังไม่มีสินค้า)
  await seedDefaultProducts();

  const products = await getProducts();
  const isAdmin = user.role === 'ADMIN';

  return (
    <div>
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">
            <i className="ri-archive-2-line" style={{ color: 'var(--primary)' }}></i>{' '}
            คลังสินค้า
          </h1>
          <p className="text-sm text-muted mt-1">
            {products.filter(p => p.isActive).length} รายการที่ใช้งาน
            {isAdmin && ` · คลิกการ์ดเพื่อแก้ไข`}
          </p>
        </div>
      </div>
      <ProductManager initialProducts={products} isAdmin={isAdmin} />
    </div>
  );
}
