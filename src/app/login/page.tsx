import { prisma } from '@/lib/prisma';
import { loginAsSheetUser } from '@/app/actions';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/auth';
import LoginClient from './LoginClient';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing) {
    const u = await prisma.sheetUser.findUnique({ where: { id: existing } });
    if (u && u.isActive === 'ACTIVE' && u.role !== 'PACKER') redirect('/');
  }

  const users = await prisma.sheetUser.findMany({
    where: { isActive: 'ACTIVE', role: { not: 'PACKER' } },
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    select: { id: true, fullName: true, role: true, teamId: true },
  });

  const teamIds = [...new Set(users.map(u => u.teamId).filter((id): id is string => Boolean(id)))];
  const teams = teamIds.length > 0
    ? await prisma.sheetTeam.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true, color: true },
      })
    : [];
  const teamMap = new Map(teams.map(t => [t.id, t]));

  const options = users.map(u => ({
    id: u.id,
    fullName: u.fullName,
    role: u.role as 'ADMIN' | 'LEADER' | 'MEMBER',
    team: u.teamId ? (teamMap.get(u.teamId) ?? null) : null,
  }));

  return <LoginClient options={options} action={loginAsSheetUser} />;
}
