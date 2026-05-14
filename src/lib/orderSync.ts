import { prisma } from './prisma';
import { SyncStatus } from '@prisma/client';

type ProductRow = { name: string; quantity: number; unitPrice: number };

/**
 * ส่งออเดอร์ที่สร้างใน CRM (source=CRM_REORDER) ไปต่อท้าย Google Sheet ผ่าน
 * Apps Script Web App ที่ตั้งค่าใน env: SHEET_SYNC_URL
 *
 * คืนค่า { ok, error? } และ "อัพเดต syncStatus ของ order row" ใน DB ให้
 */
export async function syncOrderToSheet(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = process.env.SHEET_SYNC_URL;
  const secret = process.env.SHEET_SYNC_SECRET;

  const order = await prisma.sheetOrder.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: 'order not found' };

  // ถ้ายังไม่ได้ตั้ง SHEET_SYNC_URL ใน env → ปล่อย PENDING ไว้ก่อน, ให้ admin retry ภายหลัง
  if (!url) {
    await prisma.sheetOrder.update({
      where: { id: orderId },
      data: {
        syncStatus: SyncStatus.PENDING,
        syncError: 'SHEET_SYNC_URL ยังไม่ได้ตั้งค่า — รอ admin ตั้งค่าและ retry',
        syncAttempts: { increment: 1 },
      },
    });
    return { ok: false, error: 'SHEET_SYNC_URL not configured' };
  }

  const products = Array.isArray(order.productsJson)
    ? (order.productsJson as unknown as ProductRow[])
    : [];

  const payload = {
    // routing สำหรับ doPost ที่มีหลาย command — Apps Script จะใช้ field นี้แยก
    command: 'reorder_sync',
    // Apps Script doPost อ่าน HTTP header ไม่ได้ → ส่ง secret/apiKey ใน body
    // ใส่ทั้ง 2 ชื่อเผื่อ doPost เดิมใช้ชื่ออื่น (เช่น apiKey)
    secret: secret ?? null,
    apiKey: secret ?? null,
    id: order.id,
    date: order.date?.toISOString() ?? order.createdAt.toISOString(),
    customerName: order.customerName,
    address: order.address,
    phone: order.phone,
    products,                                        // raw array
    productSummary: products
      .map(p => `${p.name} x${p.quantity}`)
      .join(', '),
    totalPrice: Number(order.totalPrice ?? 0),
    status: order.status,
    channel: order.channel,
    salesRepName: order.salesRepName,
    source: 'CRM_REORDER',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Apps Script web app sometimes ตอบช้า — รอ max 15s
      signal: AbortSignal.timeout(15000),
      // Apps Script redirects — follow them
      redirect: 'follow',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    await prisma.sheetOrder.update({
      where: { id: orderId },
      data: {
        syncStatus: SyncStatus.SYNCED,
        syncedAt: new Date(),
        syncError: null,
        syncAttempts: { increment: 1 },
      },
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.sheetOrder.update({
      where: { id: orderId },
      data: {
        syncStatus: SyncStatus.FAILED,
        syncError: message.slice(0, 500),
        syncAttempts: { increment: 1 },
      },
    });
    return { ok: false, error: message };
  }
}

/**
 * Retry sync ออเดอร์ที่ failed/pending — เรียกจากหน้า admin หรือ scheduler ภายหลัง
 */
export async function retrySync(orderId: string) {
  return syncOrderToSheet(orderId);
}
