'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { FollowUpOutcome } from '@prisma/client';

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
