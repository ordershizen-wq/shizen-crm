import { redirect } from 'next/navigation';
import { getCurrentUser, getQueueFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aggregateOrdersByPhone, calculateStage } from '@/lib/customer';
import { getTaskFilter } from '@/lib/tasks';
import AppShell from '@/components/AppShell';

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // ADMIN ไม่มี daily sales work → ข้าม atRisk/task count (ประหยัด query + ไม่โชว์ badge)
  const isAdmin = user.role === 'ADMIN';
  let atRiskCount = 0;
  let taskCount = 0;

  if (!isAdmin) {
    const queueFilter = getQueueFilter(user);
    const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
    const taskFilter = await getTaskFilter(user);

    const [phoneAggs, taskCountRes] = await Promise.all([
      aggregateOrdersByPhone(queueFilter),
      prisma.customerTask.count({
        where: { AND: [taskFilter, { status: 'PENDING', dueDate: { lt: tomorrow } }] },
      }),
    ]);

    for (const row of phoneAggs) {
      const stage = calculateStage(row);
      if (stage === 'AT_RISK' || stage === 'LAPSED') atRiskCount++;
    }
    taskCount = taskCountRes;
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
