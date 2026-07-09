'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { OrderSource, OrderStatus, SyncStatus } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { syncOrderToSheet } from '@/lib/orderSync';
import { GENDER_VALUES, AGE_RANGE_VALUES, PROVINCE_VALUES, COUNTRY_VALUES, THAILAND } from '@/lib/demographics';
import { parseOrderDateInput, isOrderDateAllowed, MAX_BACKDATE_DAYS } from '@/lib/orderDate';
import { toPhoneDigits } from '@/lib/customer';

// ราคาเป็นยอดรวมต่อออเดอร์ — สินค้าเก็บแค่ชื่อ+จำนวน
export type NewOrderProduct = { name: string; quantity: number };

export type CreateOrderInput = {
  customerPhone: string;
  customerName: string;
  address: string;
  channel: string;            // ค่า legacy: TIKTOK / FB_PROFILE / FB_PAGE / LINE / TEL / OTHER (ดู lib/channels.ts)
  products: NewOrderProduct[];
  totalPrice: number;
  orderDate: string;          // "YYYY-MM-DD" วันที่ปิดการขายจริง (ลงย้อนหลังได้ ดู orderDate.ts)
  // ข้อมูลจำเป็น (สรุปใน Dashboard) — ค่าต้องตรง format เดิม
  gender: string;             // FEMALE / MALE / OTHER
  ageRange: string;           // 18-24 / 25-34 / 35-44 / 45-54 / 55+
  country: string;            // "ไทย" = ในประเทศ (ต้องมี province) / อื่น = ต่างประเทศ
  province: string;           // 77 จังหวัด (เฉพาะในประเทศ) — ต่างประเทศส่ง '' ได้
  note?: string;
};

export type CreateOrderResult =
  | { ok: true; orderId: string; synced: boolean; isExisting: boolean; phone: string }
  | { ok: false; error: string };

function genOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CRM-${ts}-${rnd}`;
}

export type CustomerLookup = {
  customerName: string | null;
  address: string | null;
  channel: string | null;
  gender: string | null;
  ageRange: string | null;
  country: string | null;
  province: string | null;
  orderCount: number;
};

/** ค้นเบอร์ในระบบ → คืนข้อมูลล่าสุดไว้ autofill (null = ลูกค้าใหม่) */
export async function lookupCustomer(phone: string): Promise<CustomerLookup | null> {
  // ค้นด้วยตัวเลขล้วน — DB เก็บเบอร์เป็นตัวเลขล้วนเสมอ (ดู toPhoneDigits)
  const clean = toPhoneDigits(phone) ?? '';
  if (clean.length < 4) return null;

  const [last, count] = await Promise.all([
    prisma.sheetOrder.findFirst({
      where: { phone: clean },
      orderBy: { createdAt: 'desc' },
      select: {
        customerName: true, address: true, channel: true,
        gender: true, ageRange: true, country: true, province: true,
      },
    }),
    prisma.sheetOrder.count({ where: { phone: clean } }),
  ]);

  if (!last || count === 0) return null;
  return { ...last, orderCount: count };
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' };

  // ADMIN ไม่ลงออเดอร์ — supervise เท่านั้น (เหมือน createReorder)
  if (user.role === 'ADMIN') {
    return { ok: false, error: 'ADMIN ไม่สามารถลงออเดอร์ได้ — กรุณาให้เซลส์ลงเอง' };
  }

  // เก็บเบอร์เป็นตัวเลขล้วนเสมอ (โหมดต่างประเทศ '+' จะถูกตัด — รหัสประเทศยังอยู่ครบ)
  const phone = toPhoneDigits(input.customerPhone) ?? '';
  if (!phone) return { ok: false, error: 'กรุณากรอกเบอร์ลูกค้า' };
  if (input.products.length === 0) return { ok: false, error: 'ยังไม่ได้เลือกสินค้า' };
  for (const p of input.products) {
    if (!p.name.trim()) return { ok: false, error: 'ชื่อสินค้าไม่ครบ' };
    if (p.quantity <= 0) return { ok: false, error: `จำนวน "${p.name}" ต้องมากกว่า 0` };
  }
  const totalPrice = Math.round(Number(input.totalPrice) || 0);
  if (totalPrice <= 0) return { ok: false, error: 'กรุณาระบุยอดรวมให้ถูกต้อง' };

  const now = new Date();
  const orderDate = parseOrderDateInput(input.orderDate);
  if (!orderDate) return { ok: false, error: 'วันที่ปิดการขายไม่ถูกต้อง' };
  if (!isOrderDateAllowed(orderDate, now)) {
    return { ok: false, error: `เลือกวันที่ย้อนหลังได้ไม่เกิน ${MAX_BACKDATE_DAYS} วัน และห้ามเป็นวันในอนาคต` };
  }

  // ข้อมูลจำเป็นสำหรับ Dashboard — บังคับ + ต้องเป็นค่ามาตรฐาน
  const gender = input.gender?.trim() ?? '';
  const ageRange = input.ageRange?.trim() ?? '';
  if (!GENDER_VALUES.has(gender)) return { ok: false, error: 'กรุณาเลือกเพศ' };
  if (!AGE_RANGE_VALUES.has(ageRange)) return { ok: false, error: 'กรุณาเลือกช่วงอายุ' };

  // ประเทศ + จังหวัด: ไทย → ต้องมีจังหวัดใน 77 / ต่างประเทศ → ต้องเลือกประเทศจากรายการ
  const country = input.country?.trim() || THAILAND;
  const isThai = country === THAILAND;
  if (!isThai && !COUNTRY_VALUES.has(country)) return { ok: false, error: 'กรุณาเลือกประเทศจากรายการ' };
  const province = input.province?.trim() ?? '';
  if (isThai && !PROVINCE_VALUES.has(province)) return { ok: false, error: 'กรุณาเลือกจังหวัดจากรายการ' };

  // ลูกค้าใหม่ vs เก่า → กำหนด source ให้ถูก (แยกชัดใน analytics)
  const existingCount = await prisma.sheetOrder.count({ where: { phone } });
  const isExisting = existingCount > 0;
  const source = isExisting ? OrderSource.CRM_REORDER : OrderSource.CRM_NEW;

  // Sheet ไม่มี column note → แนบต่อท้าย address
  const addressWithNote = input.note?.trim()
    ? `${(input.address || '').trim()}\n📝 ${input.note.trim()}`.trim()
    : (input.address?.trim() || null);

  const id = genOrderId();

  const order = await prisma.sheetOrder.create({
    data: {
      id,
      date: orderDate,
      customerName: input.customerName?.trim() || null,
      address: addressWithNote,
      phone,
      productsJson: input.products.map(p => ({ name: p.name.trim(), quantity: p.quantity })) as object,
      totalPrice,
      status: OrderStatus.PENDING,
      channel: input.channel || null,
      gender,
      ageRange,
      country,
      province: isThai ? province : null,
      salesRepId: user.id,
      salesRepName: user.fullName,
      teamId: user.teamId,
      source,
      syncStatus: SyncStatus.PENDING,
      createdByUserId: user.id,
    },
  });

  // ยิง webhook ไป Apps Script (แพ็คเกอร์ยังใช้ Sheet ในช่วงเปลี่ยนผ่าน)
  const syncResult = await syncOrderToSheet(order.id).catch(err => ({
    ok: false as const,
    error: err instanceof Error ? err.message : String(err),
  }));

  revalidatePath('/orders');
  revalidatePath('/');
  revalidatePath(`/customers/${encodeURIComponent(phone)}`);

  return { ok: true, orderId: order.id, synced: syncResult.ok, isExisting, phone };
}

/** ชื่อสินค้า active สำหรับ datalist ใน Quick Order Modal (mirror query ของ orders/new/page.tsx) */
export async function getProductSuggestions(): Promise<string[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { name: true },
  });
  return products.map(p => p.name);
}
