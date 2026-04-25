import { PrismaClient, CrmRole } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ กำลังหา team IDs...');
  const teams = await prisma.sheetTeam.findMany({ select: { id: true, name: true } });
  const teamKong = teams.find(t => t.name === 'ทีมก้อง');
  const teamToey = teams.find(t => t.name === 'ทีมเตย');

  if (!teamKong || !teamToey) {
    console.error('❌ ไม่พบทีมก้อง หรือ ทีมเตย ใน DB');
    process.exit(1);
  }

  console.log(`✅ ทีมก้อง: ${teamKong.id}`);
  console.log(`✅ ทีมเตย: ${teamToey.id}`);

  const seedUsers = [
    { name: 'Admin', role: CrmRole.ADMIN, teamId: null },
    { name: 'CRM ทีมก้อง', role: CrmRole.STAFF, teamId: teamKong.id },
    { name: 'CRM ทีมเตย', role: CrmRole.STAFF, teamId: teamToey.id },
  ];

  console.log('⏳ กำลังสร้าง CRM users...');
  for (const user of seedUsers) {
    // Check if exists by name
    const existing = await prisma.crmUser.findFirst({ where: { name: user.name } });
    if (existing) {
      await prisma.crmUser.update({
        where: { id: existing.id },
        data: { role: user.role, teamId: user.teamId, isActive: true },
      });
      console.log(`  ↻ อัปเดต: ${user.name}`);
    } else {
      const created = await prisma.crmUser.create({ data: user });
      console.log(`  + สร้าง: ${user.name} (${created.id})`);
    }
  }

  const all = await prisma.crmUser.findMany();
  console.log(`\n🎉 เสร็จสิ้น มี CRM users ทั้งหมด ${all.length} คน`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
