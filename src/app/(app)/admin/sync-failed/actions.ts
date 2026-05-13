'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { retrySync } from '@/lib/orderSync';

export async function retrySyncAction(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return { ok: false, error: 'ต้องเป็น admin เท่านั้น' };
  }
  const result = await retrySync(orderId);
  revalidatePath('/admin/sync-failed');
  return result;
}
