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
  if (provided !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
