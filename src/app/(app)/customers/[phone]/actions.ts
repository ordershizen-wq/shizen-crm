'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { FollowUpOutcome, OrderSource, OrderStatus, SyncStatus } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { canModifyCustomer } from '@/lib/authz';
import { syncOrderToSheet } from '@/lib/orderSync';
import { suggestGradeFromAnswers, type ChecklistAnswers } from '@/lib/grade';
import { GENDER_VALUES, AGE_RANGE_VALUES, PROVINCE_VALUES, COUNTRY_VALUES, THAILAND } from '@/lib/demographics';
import { parseOrderDateInput, isOrderDateAllowed, MAX_BACKDATE_DAYS } from '@/lib/orderDate';

export async function saveCustomerGrade({
  phone,
  answers,
  overrideGrade,
  gradeNote,
}: {
  phone: string;
  answers: ChecklistAnswers;
  overrideGrade?: 'A' | 'B' | 'C' | null;
  gradeNote?: string;
}) {
  const user = await getCurrentUser();
  const access = await canModifyCustomer(user, phone);
  if (!access.ok) throw new Error(access.reason);

  const suggestedGrade = suggestGradeFromAnswers(answers);
  const grade = overrideGrade ?? suggestedGrade;

  await prisma.sheetCustomerExtra.upsert({
    where: { phone },
    update: {
      grade,
      gradeChecklistJson: answers as object,
      gradeNote: gradeNote || null,
      gradeUpdatedAt: new Date(),
    },
    create: {
      phone,
      grade,
      gradeChecklistJson: answers as object,
      gradeNote: gradeNote || null,
      gradeUpdatedAt: new Date(),
    },
  });

  revalidatePath(`/customers/${encodeURIComponent(phone)}`);
  return { grade, suggestedGrade };
}

export async function saveHealthConditions({
  phone,
  conditions,
}: {
  phone: string;
  conditions: string[];
}) {
  const user = await getCurrentUser();
  const access = await canModifyCustomer(user, phone);
  if (!access.ok) throw new Error(access.reason);

  await prisma.sheetCustomerExtra.upsert({
    where: { phone },
    update: { healthConditionsJson: conditions },
    create: { phone, healthConditionsJson: conditions },
  });

  revalidatePath(`/customers/${encodeURIComponent(phone)}`);
}

export async function saveFollowUp({
  customerPhone,
  sheetUserId,
  outcome,
  channel,
  note,
  nextActionAt,
}: {
  customerPhone: string;
  sheetUserId: string;
  outcome: string;
  channel: string;
  note: string;
  nextActionAt: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('ไม่ได้เข้าสู่ระบบ');
  // ADMIN ไม่บันทึก followup เอง — เป็นงานของเซลส์
  if (user.role === 'ADMIN') throw new Error('ADMIN ไม่สามารถบันทึกการติดตามเองได้');
  // sheetUserId ต้องเป็นตัวเอง (กันใส่ id คนอื่น)
  if (sheetUserId !== user.id) throw new Error('ไม่สามารถบันทึกแทนคนอื่นได้');
  const access = await canModifyCustomer(user, customerPhone);
  if (!access.ok) throw new Error(access.reason);

  const validOutcomes = new Set<string>(Object.values(FollowUpOutcome));
  const safeOutcome = validOutcomes.has(outcome) ? (outcome as FollowUpOutcome) : FollowUpOutcome.OTHER;

  await prisma.crmFollowUp.create({
    data: {
      customerPhone,
      sheetUserId,
      channel,
      outcome: safeOutcome,
      note: note || null,
      nextActionAt: nextActionAt ? new Date(nextActionAt) : null,
    },
  });
}

// ─── Reorder: สร้างออเดอร์ใหม่จาก CRM (ลูกค้าเก่า) ────────────────────────────
// ราคาเป็นยอดรวมต่อออเดอร์ (totalPrice) — สินค้าเก็บแค่ชื่อ+จำนวน
export type ReorderProduct = {
  name: string;
  quantity: number;
};

export type CreateReorderInput = {
  customerPhone: string;
  customerName: string;
  address: string;
  channel: string;          // LINE / FB / TikTok / Tel / OTHER
  products: ReorderProduct[];
  totalPrice: number;
  orderDate: string;          // "YYYY-MM-DD" วันที่ปิดการขายจริง (ลงย้อนหลังได้ ดู orderDate.ts)
  note?: string;
};

export type CreateReorderResult =
  | { ok: true; orderId: string; syncStatus: SyncStatus }
  | { ok: false; error: string };

function genOrderId(): string {
  // CRM-prefixed id ให้ดูออกจาก SheetOrder.id ของฝั่ง Sheet
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CRM-${ts}-${rnd}`;
}

export async function createReorder(input: CreateReorderInput): Promise<CreateReorderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' };

  // ADMIN ไม่ลงออเดอร์ — supervise เท่านั้น
  if (user.role === 'ADMIN') {
    return { ok: false, error: 'ADMIN ไม่สามารถลงออเดอร์ได้ — กรุณาให้เซลส์ลงเอง' };
  }

  // Validation พื้นฐาน
  if (!input.customerPhone) return { ok: false, error: 'ไม่มีเบอร์ลูกค้า' };

  // ลูกค้าต้องเป็นของ user (MEMBER) หรือทีมตัวเอง (LEADER)
  const access = await canModifyCustomer(user, input.customerPhone);
  if (!access.ok) return { ok: false, error: access.reason };
  if (input.products.length === 0) return { ok: false, error: 'ยังไม่ได้เลือกสินค้า' };
  for (const p of input.products) {
    if (!p.name) return { ok: false, error: 'ชื่อสินค้าไม่ครบ' };
    if (p.quantity <= 0) return { ok: false, error: `จำนวน "${p.name}" ต้องมากกว่า 0` };
  }

  const totalPrice = Math.round(Number(input.totalPrice) || 0);
  if (totalPrice <= 0) return { ok: false, error: 'กรุณาระบุยอดรวมให้ถูกต้อง' };

  const orderDate = parseOrderDateInput(input.orderDate);
  if (!orderDate) return { ok: false, error: 'วันที่ปิดการขายไม่ถูกต้อง' };
  if (!isOrderDateAllowed(orderDate)) {
    return { ok: false, error: `เลือกวันที่ย้อนหลังได้ไม่เกิน ${MAX_BACKDATE_DAYS} วัน และห้ามเป็นวันในอนาคต` };
  }

  const id = genOrderId();

  // รวมหมายเหตุต่อท้าย address (Sheet ไม่มี column สำหรับ note → เก็บใน address)
  const addressWithNote = input.note?.trim()
    ? `${(input.address || '').trim()}\n📝 ${input.note.trim()}`.trim()
    : (input.address?.trim() || null);

  // Backfill demographic จากออเดอร์ล่าสุดของเบอร์นี้ที่มีข้อมูลครบ
  // (ปุ่มรีออเดอร์ไม่มีฟอร์มกรอกเอง ต่างจาก /orders/new) — ต้อง validate ค่าก่อนใช้ซ้ำ
  // เผื่อเป็นข้อมูล legacy ที่ format ไม่ตรงมาตรฐาน (gender/ageRange/province)
  const lastDemo = await prisma.sheetOrder.findFirst({
    where: { phone: input.customerPhone, gender: { not: null }, ageRange: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { gender: true, ageRange: true, country: true, province: true },
  });
  const demoGender = lastDemo?.gender && GENDER_VALUES.has(lastDemo.gender) ? lastDemo.gender : null;
  const demoAgeRange = lastDemo?.ageRange && AGE_RANGE_VALUES.has(lastDemo.ageRange) ? lastDemo.ageRange : null;
  const demoIsThai = !lastDemo?.country || lastDemo.country === THAILAND;
  const demoCountry = lastDemo?.country && (demoIsThai || COUNTRY_VALUES.has(lastDemo.country))
    ? lastDemo.country
    : null;
  const demoProvince = demoIsThai && lastDemo?.province && PROVINCE_VALUES.has(lastDemo.province)
    ? lastDemo.province
    : null;

  const order = await prisma.sheetOrder.create({
    data: {
      id,
      date: orderDate,
      customerName: input.customerName || null,
      address: addressWithNote,
      phone: input.customerPhone,
      productsJson: input.products as object,
      totalPrice,
      status: OrderStatus.PENDING,
      channel: input.channel || null,
      gender: demoGender,
      ageRange: demoAgeRange,
      country: demoCountry,
      province: demoProvince,
      salesRepId: user.id,
      salesRepName: user.fullName,
      teamId: user.teamId,
      source: OrderSource.CRM_REORDER,
      syncStatus: SyncStatus.PENDING,
      createdByUserId: user.id,
    },
  });

  // ยิง webhook ไป Apps Script — เก็บผลใน syncStatus ของ row
  const syncResult = await syncOrderToSheet(order.id).catch(err => {
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
  });

  revalidatePath(`/customers/${encodeURIComponent(input.customerPhone)}`);
  revalidatePath('/orders');
  revalidatePath('/');

  return {
    ok: true,
    orderId: order.id,
    syncStatus: syncResult.ok ? SyncStatus.SYNCED : SyncStatus.FAILED,
  };
}
