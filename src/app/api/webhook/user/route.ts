import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';
import { verifyWebhookSecret } from '@/lib/webhookAuth';

const VALID_ROLES = new Set<string>(Object.values(UserRole));
const VALID_STATUS = new Set<string>(Object.values(UserStatus));

function parseRole(raw: unknown): UserRole {
  if (typeof raw === 'string' && VALID_ROLES.has(raw)) return raw as UserRole;
  return UserRole.MEMBER;
}

function parseStatus(raw: unknown): UserStatus {
  if (typeof raw === 'string' && VALID_STATUS.has(raw)) return raw as UserStatus;
  return UserStatus.ACTIVE;
}

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
  if (!id) return Response.json({ error: 'Missing user id' }, { status: 400 });

  const data = {
    employeeId: typeof body.employeeId === 'string' ? body.employeeId : null,
    fullName: typeof body.fullName === 'string' ? body.fullName : '',
    role: parseRole(body.role),
    email: typeof body.email === 'string' ? body.email : null,
    phone: typeof body.phone === 'string' ? body.phone : null,
    idCard: typeof body.idCard === 'string' ? body.idCard : null,
    photoUrl: typeof body.photoUrl === 'string' ? body.photoUrl : null,
    password: typeof body.password === 'string' ? body.password : null,
    // Sheet เรียก monthlyTarget → CRM เก็บใน monthlySales
    monthlySales: body.monthlyTarget != null ? Number(body.monthlyTarget) : 0,
    isActive: parseStatus(body.status),
    teamId: typeof body.teamId === 'string' && body.teamId ? body.teamId : null,
  };

  const user = await prisma.sheetUser.upsert({
    where: { id },
    create: { id, ...data },
    update: data,
  });

  return Response.json({ success: true, userId: user.id });
}
