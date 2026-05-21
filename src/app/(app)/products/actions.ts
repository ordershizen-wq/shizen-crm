'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// ── Seed สินค้าเริ่มต้น (เรียกครั้งเดียว) ──────────────────────────────
export async function seedDefaultProducts() {
  const user = await getCurrentUser();
  if (user?.role !== 'ADMIN') throw new Error('ไม่มีสิทธิ์');

  const count = await prisma.product.count();
  if (count > 0) return;

  const defaults = [
    {
      name: 'My Mild',
      shortDesc: 'สายเร่งเผาผลาญ / คุมหิว',
      targetProblems: ['ลดน้ำหนัก', 'เผาผลาญช้า', 'คุมหิว', 'ชอบของหวาน', 'เบาหวาน', 'ไขมันในเลือดสูง', 'สะสมไขมันง่าย'],
      contraindications: ['ตั้งครรภ์', 'ให้นมบุตร', 'โรคหัวใจ'],
      gradeMatch: 'ALL', sortOrder: 1,
    },
    {
      name: 'Sentina',
      shortDesc: 'สายดักจับ / ระบายท้อง',
      targetProblems: ['ท้องผูก', 'ชอบแป้ง/น้ำตาล', 'ไขมันในเลือดสูง', 'ไขมันพอกตับ', 'ลดน้ำหนัก'],
      contraindications: ['ตั้งครรภ์', 'ให้นมบุตร'],
      gradeMatch: 'B,C', sortOrder: 2,
    },
    {
      name: 'Drive Energy',
      shortDesc: 'สายฟิต / เพิ่มพลัง',
      targetProblems: ['เพิ่มพลัง', 'เหนื่อยง่าย', 'ออกกำลังกาย', 'ทำงานหนัก', 'สมาธิสั้น'],
      contraindications: ['โรคหัวใจ', 'ความดันสูง'],
      gradeMatch: 'A,B', sortOrder: 3,
    },
    {
      name: 'Sereniz',
      shortDesc: 'สายพักผ่อน / คลายเครียด',
      targetProblems: ['นอนไม่หลับ', 'เครียด', 'วิตกกังวล', 'ซึมเศร้า/วิตกกังวล', 'ความดันสูง'],
      contraindications: ['ตั้งครรภ์'],
      gradeMatch: 'ALL', sortOrder: 4,
    },
    {
      name: 'โปรตีน',
      shortDesc: 'สายซ่อมแซม / ยกกระชับ',
      targetProblems: ['ออกกำลังกาย', 'เพิ่มกล้ามเนื้อ', 'หุ่นหย่อนคล้อย', 'ข้อเข่าเสื่อม', 'ซ่อมแซมร่าง'],
      contraindications: ['โรคไต', 'นิ่วในไต'],
      gradeMatch: 'A,B', sortOrder: 5,
    },
    {
      name: 'ไฟเบอร์',
      shortDesc: 'สายดีท็อกซ์ / ล้างลำไส้',
      targetProblems: ['ท้องผูก', 'ดีท็อกซ์', 'ไขมันพอกตับ', 'เบาหวาน', 'ลดน้ำหนัก'],
      contraindications: [],
      gradeMatch: 'ALL', sortOrder: 6,
    },
  ];

  for (const p of defaults) {
    await prisma.product.create({ data: p });
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────

export async function getProducts() {
  return prisma.product.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
}

export async function upsertProduct(data: {
  id?: string;
  name: string;
  shortDesc?: string;
  targetProblems: string[];
  contraindications: string[];
  gradeMatch: string;
  sortOrder?: number;
}) {
  const user = await getCurrentUser();
  if (user?.role !== 'ADMIN') throw new Error('ไม่มีสิทธิ์');

  if (data.id) {
    await prisma.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        shortDesc: data.shortDesc,
        targetProblems: data.targetProblems,
        contraindications: data.contraindications,
        gradeMatch: data.gradeMatch,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  } else {
    await prisma.product.create({
      data: {
        name: data.name,
        shortDesc: data.shortDesc,
        targetProblems: data.targetProblems,
        contraindications: data.contraindications,
        gradeMatch: data.gradeMatch,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }
  revalidatePath('/products');
}

export async function toggleProductActive(id: string) {
  const user = await getCurrentUser();
  if (user?.role !== 'ADMIN') throw new Error('ไม่มีสิทธิ์');

  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) return;
  await prisma.product.update({ where: { id }, data: { isActive: !p.isActive } });
  revalidatePath('/products');
}

export async function deleteProduct(id: string) {
  const user = await getCurrentUser();
  if (user?.role !== 'ADMIN') throw new Error('ไม่มีสิทธิ์');

  await prisma.product.delete({ where: { id } });
  revalidatePath('/products');
}
