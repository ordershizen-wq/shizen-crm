import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSecret } from '@/lib/webhookAuth';

export async function POST(request: NextRequest) {
  const denied = verifyWebhookSecret(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : null;
  if (!id) return Response.json({ error: 'Missing team id' }, { status: 400 });

  const data = {
    name: typeof body.name === 'string' ? body.name : '',
    color: typeof body.color === 'string' ? body.color : null,
    leaderId: typeof body.leaderId === 'string' ? body.leaderId : null,
  };

  // createdAt ใส่เฉพาะตอน create เท่านั้น — ไม่งั้น webhook ยิงซ้ำจะรีเซ็ตวันสร้างทีมเป็น now()
  let createdAt: Date | undefined;
  if (body.createdAt) {
    const d = new Date(body.createdAt as string);
    if (!isNaN(d.getTime())) createdAt = d;
  }

  try {
    const team = await prisma.sheetTeam.upsert({
      where: { id },
      create: { id, ...data, createdAt: createdAt ?? new Date() },
      update: data,
    });
    return Response.json({ success: true, teamId: team.id });
  } catch (err) {
    console.error(`[webhook/team] upsert failed for id=${id}:`, err);
    return Response.json({ error: 'Failed to save team' }, { status: 500 });
  }
}
