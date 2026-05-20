import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.sheetUser.findMany({
    where: { isActive: 'ACTIVE', role: { not: 'PACKER' } },
    select: { id: true, fullName: true, employeeId: true, password: true, role: true },
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
  });

  console.log(`=== sheet_users ที่ ACTIVE: ${users.length} คน ===\n`);

  let hasPassword = 0;
  let noPassword = 0;
  let noEmployeeId = 0;
  let plaintext = 0;
  let bcrypt = 0;

  for (const u of users) {
    const pwState = !u.password
      ? '❌ ไม่มี password'
      : u.password.startsWith('$2') && u.password.length >= 50
        ? '🔒 bcrypt hash'
        : `📝 plaintext (${u.password.length} chars)`;
    const idState = u.employeeId ? `ID=${u.employeeId}` : '⚠️ ไม่มี employeeId';
    console.log(`  [${u.role}] ${u.fullName.padEnd(25)} ${idState.padEnd(20)} ${pwState}`);

    if (!u.password) noPassword++;
    else if (u.password.startsWith('$2') && u.password.length >= 50) {
      bcrypt++; hasPassword++;
    } else {
      plaintext++; hasPassword++;
    }
    if (!u.employeeId) noEmployeeId++;
  }

  console.log(`\n=== สรุป ===`);
  console.log(`  - มี password อยู่แล้ว: ${hasPassword} คน`);
  console.log(`     • plaintext (ยังไม่ hash): ${plaintext} คน`);
  console.log(`     • bcrypt hashed:           ${bcrypt} คน`);
  console.log(`  - ไม่มี password:             ${noPassword} คน`);
  console.log(`  - ไม่มี employeeId:           ${noEmployeeId} คน`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
