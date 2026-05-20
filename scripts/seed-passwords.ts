/**
 * เข้ารหัส password ที่เป็น plaintext ใน sheet_users ให้เป็น bcrypt hash
 * — รหัสเดิมยังใช้ได้ทันที พนักงานไม่ต้องเปลี่ยนอะไร
 * — รันซ้ำได้ จะข้าม row ที่เป็น bcrypt hash อยู่แล้ว
 *
 * รันด้วย: npx tsx scripts/seed-passwords.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

function isBcryptHash(s: string | null | undefined): boolean {
  if (!s) return false;
  // bcrypt hash ขึ้นต้นด้วย $2a$, $2b$, $2y$ และยาว ≥ 50
  return /^\$2[aby]\$/.test(s) && s.length >= 50;
}

async function main() {
  const users = await prisma.sheetUser.findMany({
    where: { isActive: 'ACTIVE', role: { not: 'PACKER' } },
    select: { id: true, fullName: true, employeeId: true, password: true },
  });

  console.log(`พบ ${users.length} คน — เริ่มตรวจสอบ...\n`);

  let hashed = 0;
  let skipped = 0;
  let noPassword = 0;

  for (const u of users) {
    if (!u.password) {
      console.log(`⚠️  ${u.fullName} (${u.employeeId ?? '-'}) — ไม่มี password ใน DB, ข้าม`);
      noPassword++;
      continue;
    }

    if (isBcryptHash(u.password)) {
      skipped++;
      continue;
    }

    const hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    await prisma.sheetUser.update({
      where: { id: u.id },
      data: { password: hash },
    });
    console.log(`🔒 ${u.fullName} (${u.employeeId}) — hash สำเร็จ`);
    hashed++;
  }

  console.log(`\n=== สรุป ===`);
  console.log(`  - hash ใหม่: ${hashed} คน`);
  console.log(`  - ข้าม (เป็น bcrypt อยู่แล้ว): ${skipped} คน`);
  console.log(`  - ไม่มี password: ${noPassword} คน`);
  console.log(`\n✅ พนักงานสามารถ login ด้วยรหัสเดิมได้ทันที`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
