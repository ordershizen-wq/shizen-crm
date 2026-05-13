import { redirect } from 'next/navigation';
import { getCurrentUser, getQueueFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aggregateOrdersByPhone, calculateStage } from '@/lib/customer';
import { getTaskFilter } from '@/lib/tasks';
import AppShell from '@/components/AppShell';

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const queueFilter = getQueueFilter(user);
  const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
  const taskFilter = await getTaskFilter(user);

  // ขนาน 2 queries: aggregate stages + count tasks
  const [phoneAggs, taskCount] = await Promise.all([
    aggregateOrdersByPhone(queueFilter),
    prisma.customerTask.count({
      where: { AND: [taskFilter, { status: 'PENDING', dueDate: { lt: tomorrow } }] },
    }),
  ]);

  let atRiskCount = 0;
  for (const row of phoneAggs) {
    const stage = calculateStage(row);
    if (stage === 'AT_RISK' || stage === 'LAPSED') atRiskCount++;
  }

  return (
    <AppShell
      user={{ id: user.id, fullName: user.fullName, role: user.role, team: user.team }}
      atRiskCount={atRiskCount}
      taskCount={taskCount}
    >
      {children}
    </AppShell>
  );
}
