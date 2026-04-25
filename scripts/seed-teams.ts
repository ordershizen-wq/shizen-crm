import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ สร้างทีมจำลอง...');
  
  // Create Team A and Team B
  const teamA = await prisma.sheetTeam.upsert({
    where: { id: 'team_a' },
    update: { name: 'ทีม A (Alpha)' },
    create: { id: 'team_a', name: 'ทีม A (Alpha)' },
  });

  const teamB = await prisma.sheetTeam.upsert({
    where: { id: 'team_b' },
    update: { name: 'ทีม B (Beta)' },
    create: { id: 'team_b', name: 'ทีม B (Beta)' },
  });

  console.log('✅ สร้างทีมสำเร็จ!');

  // Fetch all users
  const users = await prisma.sheetUser.findMany();
  console.log(`⏳ กำลังสุ่มจัดทีมให้พนักงานทั้งหมด ${users.length} คน...`);

  let countA = 0;
  let countB = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    // Simple alternating logic to evenly distribute
    const assignedTeam = i % 2 === 0 ? teamA : teamB;
    
    await prisma.sheetUser.update({
      where: { id: user.id },
      data: { teamId: assignedTeam.id }
    });

    if (assignedTeam.id === teamA.id) countA++;
    else countB++;
  }

  console.log(`🎉 จัดทีมสำเร็จ: ทีม A ได้ ${countA} คน, ทีม B ได้ ${countB} คน`);
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
