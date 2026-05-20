import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { loginWithCredentials } from '@/app/actions';
import LoginClient from './LoginClient';

export default async function LoginPage() {
  const session = await getSession();
  if (session.userId) {
    const u = await prisma.sheetUser.findUnique({ where: { id: session.userId } });
    if (u && u.isActive === 'ACTIVE' && u.role !== 'PACKER') {
      redirect('/');
    }
  }

  return <LoginClient action={loginWithCredentials} />;
}
