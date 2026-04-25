import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TEAM_KONG_ID = 'team-1770815264157';
const TEAM_TOEY_ID = 'team-1770815279150';

const kongMembers = [
  'ประภาพร ผันผักแว่น',
  'ธิติพล ไทยภักดี',
  'ณัฐติญา อินทร์แป้นพะเนา',
  'นภัสวรรณ ลาแสง',
  'นงนุช ปลั่งกลาง',
  'กาญจนา ศรีโยธี',
  'อรรถโกวิท หอยสังข์',
  'พุททธิเดช บูรณ์โภคา',
  'สิรภพ สิบโท',
  'ศุภกร จิตโคกกรวด',
  'อัษฎา นาหมื่นไวย',
  'บัลลังก์ ศิริมั่น',
  'ปภากร มาสูงเนิน',
  'จิรายุ รอดนุกูล'
];

const toeyMembers = [
  'ปิยวรรณ สังข์แก้ว',
  'สิริภัสสร หอยสังข์',
  'ปวีณา โชติสันเทียะ',
  'ปาริฉัตร อนุเคราะห์',
  'ฮาฟีเส๊าะ สงวนศิลป์',
  'ฐิติชญา อัครอุดมโชติ'
];

async function main() {
  console.log('⏳ เริ่มต้นการย้ายทีม...');

  // 1. Reset all users to NO team (null)
  await prisma.sheetUser.updateMany({
    data: { teamId: null }
  });
  console.log('✅ ล้างข้อมูลทีมเดิมออกหมดแล้ว');

  // 2. Assign Team Kong
  let countKong = 0;
  for (const name of kongMembers) {
    const result = await prisma.sheetUser.updateMany({
      where: { fullName: name },
      data: { teamId: TEAM_KONG_ID }
    });
    if (result.count > 0) countKong++;
    else console.log(`⚠️ ไม่พบพนักงาน: ${name}`);
  }
  console.log(`✅ ย้ายเข้าทีมก้องสำเร็จ: ${countKong} คน`);

  // 3. Assign Team Toey
  let countToey = 0;
  for (const name of toeyMembers) {
    const result = await prisma.sheetUser.updateMany({
      where: { fullName: name },
      data: { teamId: TEAM_TOEY_ID }
    });
    if (result.count > 0) countToey++;
    else console.log(`⚠️ ไม่พบพนักงาน: ${name}`);
  }
  console.log(`✅ ย้ายเข้าทีมเตยสำเร็จ: ${countToey} คน`);

  // 4. Update Orders to match Team IDs
  console.log('⏳ กำลังปรับปรุงข้อมูลทีมในออเดอร์ (Sync Order -> Team)...');
  
  // Fetch all users with their teams
  const users = await prisma.sheetUser.findMany({
    where: { teamId: { not: null } },
    select: { id: true, teamId: true }
  });

  let orderUpdateCount = 0;
  for (const user of users) {
    const result = await prisma.sheetOrder.updateMany({
      where: { salesRepId: user.id },
      data: { teamId: user.teamId }
    });
    orderUpdateCount += result.count;
  }
  console.log(`✅ ปรับปรุงทีมในออเดอร์สำเร็จ: ${orderUpdateCount} รายการ`);

  // 5. Cleanup temporary teams
  await prisma.sheetTeam.deleteMany({
    where: { id: { in: ['team_a', 'team_b'] } }
  });
  console.log('✅ ลบทีมชั่วคราว (Team A/B) ออกเรียบร้อย');
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
