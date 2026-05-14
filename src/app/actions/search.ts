'use server';

import { getCurrentUser, getOrderFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type SearchResult = {
  customers: Array<{
    phone: string;
    name: string | null;
    orderCount: number;
  }>;
  orders: Array<{
    id: string;
    phone: string | null;
    customerName: string | null;
    totalPrice: number;
    status: string;
    source: 'SHEET' | 'CRM_REORDER';
    createdAt: string;
  }>;
};

/**
 * ค้นหาทั้งระบบ — ลูกค้า (ชื่อ/เบอร์) + ออเดอร์ (id/ชื่อ/เบอร์)
 * Scope: ผู้ใช้ปัจจุบัน (MEMBER เห็นแค่ของตัวเอง / LEADER เห็นทีม / ADMIN ทั้งระบบ)
 */
export async function searchAll(query: string): Promise<SearchResult> {
  const q = query.trim();
  if (q.length < 2) return { customers: [], orders: [] };

  const user = await getCurrentUser();
  if (!user) return { customers: [], orders: [] };

  const orderFilter = (await getOrderFilter(user)) ?? {};

  // ค้นหาทั้งชื่อ + เบอร์ พร้อมกัน
  const matchedOrders = await prisma.sheetOrder.findMany({
    where: {
      ...orderFilter,
      OR: [
        { id: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      phone: true,
      customerName: true,
      totalPrice: true,
      status: true,
      source: true,
      createdAt: true,
    },
  });

  // Group orders by phone → unique customers (sorted by latest order)
  const customerMap = new Map<
    string,
    { phone: string; name: string | null; orderCount: number; latestAt: Date }
  >();
  for (const o of matchedOrders) {
    if (!o.phone) continue;
    const ex = customerMap.get(o.phone);
    if (!ex) {
      customerMap.set(o.phone, {
        phone: o.phone,
        name: o.customerName,
        orderCount: 1,
        latestAt: o.createdAt,
      });
    } else {
      ex.orderCount += 1;
      if (!ex.name && o.customerName) ex.name = o.customerName;
      if (o.createdAt > ex.latestAt) ex.latestAt = o.createdAt;
    }
  }

  const customers = Array.from(customerMap.values())
    .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime())
    .slice(0, 6)
    .map(c => ({ phone: c.phone, name: c.name, orderCount: c.orderCount }));

  const orders = matchedOrders.slice(0, 6).map(o => ({
    id: o.id,
    phone: o.phone,
    customerName: o.customerName,
    totalPrice: Number(o.totalPrice ?? 0),
    status: o.status,
    source: o.source,
    createdAt: o.createdAt.toISOString(),
  }));

  return { customers, orders };
}
