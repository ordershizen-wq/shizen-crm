import { redirect } from 'next/navigation';
import { getCurrentUser, getQueueFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateStage } from '@/lib/customer';
import { getTaskFilter } from '@/lib/tasks';
import AppShell from '@/components/AppShell';

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // คำนวณ AT_RISK + LAPSED count สำหรับ sidebar badge
  const queueFilter = getQueueFilter(user);
  const orders = await prisma.sheetOrder.findMany({
    where: { ...queueFilter, phone: { not: null } },
    select: { phone: true, totalPrice: true, createdAt: true },
  });

  const phoneMap = new Map<string, { orderCount: number; totalSpent: number; lastOrderAt: Date }>();
  for (const o of orders) {
    const ph = o.phone!;
    const ex = phoneMap.get(ph);
    if (!ex) {
      phoneMap.set(ph, { orderCount: 1, totalSpent: Number(o.totalPrice ?? 0), lastOrderAt: o.createdAt });
    } else {
      ex.orderCount += 1;
      ex.totalSpent += Number(o.totalPrice ?? 0);
      if (o.createdAt > ex.lastOrderAt) ex.lastOrderAt = o.createdAt;
    }
  }

  let atRiskCount = 0;
  for (const row of phoneMap.values()) {
    const stage = calculateStage(row);
    if (stage === 'AT_RISK' || stage === 'LAPSED') atRiskCount++;
  }

  // นับงานที่ค้าง (due ≤ วันนี้) สำหรับ badge เมนู "งานทั้งหมด"
  const taskFilter = await getTaskFilter(user);
  const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
  const taskCount = await prisma.customerTask.count({
    where: { AND: [taskFilter, { status: 'PENDING', dueDate: { lt: tomorrow } }] },
  });

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
