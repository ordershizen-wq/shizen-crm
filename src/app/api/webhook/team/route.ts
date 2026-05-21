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
    createdAt: body.createdAt ? new Date(body.createdAt as string) : new Date(),
  };

  const team = await prisma.sheetTeam.upsert({
    where: { id },
    create: { id, ...data },
    update: data,
  });

  return Response.json({ success: true, teamId: team.id });
}
