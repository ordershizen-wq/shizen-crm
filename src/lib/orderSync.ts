import { prisma } from './prisma';
import { SyncStatus } from '@prisma/client';

type ProductRow = { name: string; quantity: number; unitPrice: number };

/**
 * ส่งออเดอร์ที่สร้างใน CRM (source=CRM_REORDER) ไปต่อท้าย Google Sheet ผ่าน
 * Apps Script Web App ที่ตั้งค่าใน env: SHEET_SYNC_URL
 *
 * Strategy:
 *  1) POST ไป /exec ของ Apps Script ด้วย redirect: 'manual'
 *  2) ถ้าได้ 302 → GET location URL เอง (จัดการ redirect manually เพราะ Node fetch
 *     บน Vercel datacenter บางครั้งโดน Google block ตอน follow 302 → googleusercontent)
 *  3) Parse response JSON → success
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
    command: 'reorder_sync',
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
    source: 'CRM_REORDER',
  };

  // เก็บรายละเอียดการ debug ลง syncError เมื่อ fail
  const trace: string[] = [];
  trace.push(`url=${url.slice(0, 80)}...`);
  trace.push(`urlLen=${url.length}`);
  trace.push(`secretLen=${secret?.length ?? 0}`);

  try {
    // Step 1: POST without following redirect (ดู Location header เอง)
    const res1 = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        // browser-like UA เผื่อ Google trigger bot detection
        'User-Agent': 'Mozilla/5.0 (compatible; ShizenCRM-Sync/1.0)',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
      redirect: 'manual',
    });

    trace.push(`step1.status=${res1.status}`);
    trace.push(`step1.type=${res1.type}`);

    let finalRes = res1;
    let finalText = '';

    if (res1.status === 0 || res1.type === 'opaqueredirect' || (res1.status >= 300 && res1.status < 400)) {
      // Got redirect — follow manually
      const location = res1.headers.get('location');
      trace.push(`step1.location=${location ? location.slice(0, 80) : 'null'}`);

      if (!location) {
        // บางครั้ง redirect: 'manual' บน Node fetch จะคืน type=opaqueredirect แบบไม่มี location header
        // → ใช้ redirect: 'follow' แทน
        trace.push('fallback: redirect=follow');
        const res2 = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (compatible; ShizenCRM-Sync/1.0)',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20000),
          redirect: 'follow',
        });
        trace.push(`step2.status=${res2.status}`);
        trace.push(`step2.finalUrl=${res2.url.slice(0, 80)}`);
        finalRes = res2;
        finalText = await res2.text().catch(() => '');
      } else {
        // Follow redirect ด้วย GET
        const res2 = await fetch(location, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (compatible; ShizenCRM-Sync/1.0)',
          },
          signal: AbortSignal.timeout(20000),
          redirect: 'follow',
        });
        trace.push(`step2.status=${res2.status}`);
        trace.push(`step2.contentType=${res2.headers.get('content-type') ?? '?'}`);
        trace.push(`step2.finalUrl=${res2.url.slice(0, 80)}`);
        finalRes = res2;
        finalText = await res2.text().catch(() => '');
      }
    } else {
      finalText = await res1.text().catch(() => '');
    }

    trace.push(`final.status=${finalRes.status}`);
    trace.push(`final.bodyLen=${finalText.length}`);
    trace.push(`final.bodyPreview=${finalText.slice(0, 120).replace(/\s+/g, ' ')}`);

    if (!finalRes.ok) {
      throw new Error(`[${trace.join(' | ')}]`);
    }

    // Parse JSON
    type ScriptResp = { ok?: boolean; error?: string; id?: string };
    let parsed: ScriptResp;
    try {
      parsed = JSON.parse(finalText) as ScriptResp;
    } catch {
      throw new Error(`Non-JSON response [${trace.join(' | ')}]`);
    }

    if (!parsed.ok) {
      throw new Error(`Apps Script returned not-ok: ${parsed.error ?? 'unknown'} [${trace.join(' | ')}]`);
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
        syncError: message.slice(0, 800),   // เก็บ trace ได้ยาวขึ้น
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
