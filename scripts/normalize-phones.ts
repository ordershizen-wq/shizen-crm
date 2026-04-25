/**
 * Normalize phone numbers ใน SheetOrder และ SheetCustomerExtra
 * เอา non-digit ออกทั้งหมด เพื่อให้ group by phone ถูกต้อง
 */
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9]/g, '');
  return cleaned.length >= 8 ? cleaned : null;
}

async function main() {
  console.log('⏳ กำลัง normalize phone numbers...');

  // ดึง orders ที่มี phone
  const orders = await prisma.sheetOrder.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  });

  let updatedCount = 0;
  let skipped = 0;

  for (const o of orders) {
    const normalized = normalizePhone(o.phone);
    if (normalized !== o.phone) {
      await prisma.sheetOrder.update({
        where: { id: o.id },
        data: { phone: normalized },
      });
      updatedCount++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ SheetOrder: อัปเดต ${updatedCount} | ไม่เปลี่ยน ${skipped}`);

  // CustomerExtra
  const extras = await prisma.sheetCustomerExtra.findMany({
    select: { phone: true, note: true, tagsJson: true, lastUpdated: true },
  });

  let extraUpdated = 0;
  for (const e of extras) {
    const normalized = normalizePhone(e.phone);
    if (normalized && normalized !== e.phone) {
      // สร้างใหม่ด้วย phone ที่ normalize แล้ว + ลบอันเก่า
      const exists = await prisma.sheetCustomerExtra.findUnique({ where: { phone: normalized } });
      if (!exists) {
        await prisma.sheetCustomerExtra.create({
          data: { phone: normalized, note: e.note, tagsJson: e.tagsJson ?? [], lastUpdated: e.lastUpdated },
        });
      }
      await prisma.sheetCustomerExtra.delete({ where: { phone: e.phone } });
      extraUpdated++;
    }
  }

  console.log(`✅ SheetCustomerExtra: อัปเดต ${extraUpdated}`);
  console.log('🎉 เสร็จสิ้น');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
