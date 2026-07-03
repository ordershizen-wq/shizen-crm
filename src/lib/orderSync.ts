import { prisma } from './prisma';
import { SyncStatus } from '@prisma/client';

// ราคาเก็บเป็นยอดรวมต่อออเดอร์ (order.totalPrice) — สินค้าเก็บแค่ชื่อ+จำนวน
type ProductRow = { name: string; quantity: number };

/**
 * ส่งออเดอร์ที่สร้างใน CRM (source=CRM_NEW / CRM_REORDER) → Google Sheet ผ่าน Apps Script Web App
 *
 * Key behaviors:
 *  - POST ด้วย redirect: 'follow' — Node fetch จะแปลง POST → GET ตอน follow 302
 *    (Apps Script doPost คืน 302 → googleusercontent.com ที่ cache response)
 *  - ส่ง User-Agent แบบ browser-like กัน Google bot detection
 *  - เก็บ error preview ใน syncError ให้ admin diagnose ผ่าน /admin/sync-failed
 */
export async function syncOrderToSheet(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = process.env.SHEET_SYNC_URL;
  const secret = process.env.SHEET_SYNC_SECRET;

  const order = await prisma.sheetOrder.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: 'order not found' };

  if (!url) {
    await prisma.sheetOrder.update({
      where: { id: orderId },
      data: {
        syncStatus: SyncStatus.PENDING,
        syncError: 'SHEET_SYNC_URL ยังไม่ได้ตั้งค่า',
        syncAttempts: { increment: 1 },
      },
    });
    return { ok: false, error: 'SHEET_SYNC_URL not configured' };
  }

  const products = Array.isArray(order.productsJson)
    ? (order.productsJson as unknown as ProductRow[])
    : [];

  const payload = {
    command: 'reorder_sync',
    // Apps Script doPost อ่าน HTTP header ไม่ได้ → ใส่ secret ใน body
    secret: secret ?? null,
    apiKey: secret ?? null,
    id: order.id,
    date: order.date?.toISOString() ?? order.createdAt.toISOString(),
    customerName: order.customerName,
    address: order.address,
    phone: order.phone,
    products,
    productSummary: products.map(p => `${p.name} x${p.quantity}`).join(', '),
    totalPrice: Number(order.totalPrice ?? 0),
    status: order.status,
    channel: order.channel,
    salesRepId: order.salesRepId,
    salesRepName: order.salesRepName,
    paymentProofUrl: order.paymentProofUrl,
    isReturned: order.isReturned,
    // ส่ง source จริงของออเดอร์ (CRM_NEW = ลูกค้าใหม่ / CRM_REORDER = รีออเดอร์)
    // ก่อนหน้านี้ hardcode 'CRM_REORDER' ทำให้ลูกค้าใหม่ที่ลงผ่าน CRM ติดป้ายผิดใน Sheet
    source: order.source,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        // กัน Google bot detection จาก datacenter IP
        'User-Agent': 'Mozilla/5.0 (compatible; ShizenCRM-Sync/1.0)',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
      redirect: 'follow',
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    // Apps Script ตอบเป็น JSON เสมอ — ถ้าได้ HTML แปลว่ามีปัญหา (redirect ไป login etc.)
    let parsed: { ok?: boolean; error?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
    }

    if (!parsed.ok) {
      throw new Error(`Apps Script not-ok: ${parsed.error ?? 'unknown'}`);
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
 * Retry sync ออเดอร์ที่ failed/pending — เรียกจากหน้า admin หรือ scheduler
 */
export async function retrySync(orderId: string) {
  return syncOrderToSheet(orderId);
}
