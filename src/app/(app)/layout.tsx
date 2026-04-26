import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AppShell from '@/components/AppShell';

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <AppShell user={{ id: user.id, fullName: user.fullName, role: user.role, team: user.team }}>
      {children}
    </AppShell>
  );
}
