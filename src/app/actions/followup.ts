'use server';

import { prisma } from '@/lib/prisma';
import { FollowUpOutcome } from '@prisma/client';

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
