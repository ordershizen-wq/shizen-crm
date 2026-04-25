import { PrismaClient, UserRole, OrderStatus, Prisma } from '@prisma/client';
import * as fs from 'fs';
import csv from 'csv-parser';

import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  type OrderRow = {
    id: string;
    date: Date | null;
    customerName: string;
    address: string;
    phone: string | null;
    note: string;
    productsJson: Prisma.InputJsonValue;
    totalPrice: number;
    status: OrderStatus;
    salesRepId: string | null;
    salesRepName: string | null;
    channel: string | null;
    isReturned: boolean;
    createdAt: Date;
  };
  type UserRow = { id: string; fullName: string; role: UserRole };

  const orders: OrderRow[] = [];
  const usersMap: Map<string, UserRow> = new Map();

  console.log('⏳ กำลังอ่านไฟล์ CSV...');

  const processFile = () => {
    return new Promise((resolve, reject) => {
      fs.createReadStream('./data/orders_export.csv')
        .pipe(csv())
        .on('data', (row) => {
          // 1. เก็บข้อมูล Sales Rep ลง Map (ขจัดความซ้ำซ้อน)
          if (row.salesRepId) {
            usersMap.set(row.salesRepId, {
              id: row.salesRepId,
              fullName: row.salesRepName || 'ไม่ระบุชื่อ',
              // ทุกคนที่ Import มาใหม่ ยังไม่มีทีม และเป็นแค่ MEMBER ก่อน
              role: UserRole.MEMBER,
            });
          }

          // 2. จัดการเรื่องโครงสร้าง Note ในที่อยู่
          let address = row.address || '';
          let note = '';
          const hashIndex = address.indexOf('#');
          if (hashIndex !== -1) {
            note = address.substring(hashIndex + 1).trim();
            address = address.substring(0, hashIndex).trim();
          }

          // 3. แนบโน้ตไปเก็บกับข้อมูลเบอร์โทร (Phone)
          const phone = row.phone ? row.phone.replace(/[^0-9]/g, '') : null;
          
          // 4. แปลง JSON Products
          let parsedProducts = [];
          if (row.products_json) {
            try {
              parsedProducts = JSON.parse(row.products_json);
            } catch (e) {
              // Ignore parse error
            }
          }

          // ถ้ารหัส Order มีการซ้ำซ้อน อาจจะต้องจัดการผ่าน upsert ตอนบันทึก
          orders.push({
            id: row.id,
            date: row.date ? new Date(row.date) : null,
            customerName: row.customerName,
            address: address,
            phone: phone,
            note: note, // เก็บไว้ผ่านตอนสร้าง CustomerExtras
            productsJson: parsedProducts,
            totalPrice: Number(row.totalPrice) || 0,
            status: (row.status && row.status in OrderStatus ? row.status : 'PENDING') as OrderStatus,
            salesRepId: row.salesRepId || null,
            salesRepName: row.salesRepName || null,
            channel: row.platform || null,
            isReturned: row.status === 'RETURNED' || row.isReturned === 'TRUE',
            createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });
  };

  await processFile();
  console.log(`✅ อ่านข้อมูลเสร็จสิ้น ค้นพบพนักงานเซลส์: ${usersMap.size} คน | ออเดอร์ทั้งหมด: ${orders.length} รายการ`);

  console.log('⏳ (Step 1/3) กำลังบันทึกข้อมูลพนักงานเข้าสู่ระบบ...');
  let userCount = 0;
  for (const user of usersMap.values()) {
    try {
      await prisma.sheetUser.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          fullName: user.fullName,
          role: user.role,
        },
      });
      userCount++;
    } catch (err) {
      console.error(`❌ สร้างผู้ใช้ไม่สำเร็จ ${user.id}:`, err);
    }
  }
  console.log(`✅ บันทึกพนักงานเสร็จสิ้น ${userCount} รายการ!`);

  console.log('⏳ (Step 2/3) กำลังบันทึกข้อมูลลูกค้ารายบุคคล (CustomerExtras)...');
  let customerCount = 0;
  // เพื่อหลีกเลี่ยงการบันทึก note ทับกันบ่อยไป จะบันทึกเฉพาะคนที่มีโน้ตล่าสุด
  for (const order of orders) {
    if (order.phone && order.note) {
      try {
        await prisma.sheetCustomerExtra.upsert({
          where: { phone: order.phone },
          update: {
            note: order.note
          },
          create: {
            phone: order.phone,
            note: order.note
          }
        });
        customerCount++;
      } catch (err) {
        // Ignore duplicate phone conflict in loop
      }
    }
  }
  console.log(`✅ บันทึกข้อมูลลูกค้าเพิ่มเติม (Notes) เสร็จสิ้น ${customerCount} รายการ!`);

  console.log('⏳ (Step 3/3) กำลังบันทึกออเดอร์ลงฐานข้อมูล...');
  let orderCount = 0;
  for (const order of orders) {
    try {
      await prisma.sheetOrder.upsert({
        where: { id: order.id },
        update: {
          status: order.status,
          totalPrice: order.totalPrice,
          isReturned: order.isReturned,
        },
        create: {
          id: order.id,
          date: order.date,
          customerName: order.customerName,
          address: order.address,
          phone: order.phone,
          productsJson: order.productsJson,
          totalPrice: order.totalPrice,
          status: order.status,
          salesRepId: order.salesRepId,
          salesRepName: order.salesRepName,
          channel: order.channel,
          isReturned: order.isReturned,
          createdAt: order.createdAt,
        },
      });
      orderCount++;
    } catch (err) {
      console.error(`❌ เกิดข้อผิดพลาดกับออเดอร์: ${order.id}`);
      // console.error(err)
    }
  }

  console.log(`🎉 สร้างข้อมูลสำเร็จ ${orderCount} ออเดอร์!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
