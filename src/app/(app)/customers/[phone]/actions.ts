'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { FollowUpOutcome, OrderSource, OrderStatus, SyncStatus } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { syncOrderToSheet } from '@/lib/orderSync';

export type ChecklistAnswers = {
  exercise: 0 | 1 | 2;
  diet: 0 | 1 | 2;
  sleep: 0 | 1 | 2;
  water: 0 | 1 | 2;
  motivation: 0 | 1 | 2;
  consistency: 0 | 1 | 2;
};

function calcGrade(answers: ChecklistAnswers): 'A' | 'B' | 'C' {
  const total = Object.values(answers).reduce((s, v) => s + v, 0 as number);
  if (total >= 9) return 'A';
  if (total >= 5) return 'B';
  return 'C';
}

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
  const suggestedGrade = calcGrade(answers);
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
export type ReorderProduct = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type CreateReorderInput = {
  customerPhone: string;
  customerName: string;
  address: string;
  channel: string;          // LINE / FB / TikTok / Tel / OTHER
  products: ReorderProduct[];
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

  // Validation พื้นฐาน
  if (!input.customerPhone) return { ok: false, error: 'ไม่มีเบอร์ลูกค้า' };
  if (input.products.length === 0) return { ok: false, error: 'ยังไม่ได้เลือกสินค้า' };
  for (const p of input.products) {
    if (!p.name) return { ok: false, error: 'ชื่อสินค้าไม่ครบ' };
    if (p.quantity <= 0) return { ok: false, error: `จำนวน "${p.name}" ต้องมากกว่า 0` };
    if (p.unitPrice < 0) return { ok: false, error: `ราคา "${p.name}" ไม่ถูกต้อง` };
  }

  const totalPrice = input.products.reduce((s, p) => s + p.quantity * p.unitPrice, 0);

  const id = genOrderId();
  const now = new Date();

  const order = await prisma.sheetOrder.create({
    data: {
      id,
      date: now,
      customerName: input.customerName || null,
      address: input.address || null,
      phone: input.customerPhone,
      productsJson: input.products as object,
      totalPrice,
      status: OrderStatus.PENDING,
      channel: input.channel || null,
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
