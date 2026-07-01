import { timingSafeEqual } from 'crypto';

/** เทียบ string แบบ constant-time กัน timing attack (คืน false ถ้ายาวไม่เท่ากัน) */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify x-webhook-secret header against WEBHOOK_SECRET env
 * Fail-closed: ถ้า env ไม่ได้ตั้ง → ปฏิเสธทุก request (กัน config หลุด)
 */
export function verifyWebhookSecret(request: Request): Response | null {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected || expected.length < 8) {
    console.error('[webhook] WEBHOOK_SECRET missing or too short — refusing request');
    return Response.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  const provided = request.headers.get('x-webhook-secret');
  if (!provided || !safeEqual(provided, expected)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
