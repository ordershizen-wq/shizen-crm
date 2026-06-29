// Shared label / color mappings + due-date helper for the tasks UI.
// Single source of truth reused by TasksList, TaskDetail, TaskDrawer, TasksKanban.

export const TYPE_LABEL: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  FOLLOW_UP:  { label: 'ตามอาการ',     icon: 'ri-stethoscope-line', color: '#0ea5e9', bg: '#EFF6FF' },
  CALL:       { label: 'โทรหา',          icon: 'ri-phone-line',        color: '#10b981', bg: '#ECFDF5' },
  REPEAT_BUY: { label: 'เตือนซื้อซ้ำ',    icon: 'ri-repeat-line',        color: '#f59e0b', bg: '#FFFBEB' },
  DELIVERY:   { label: 'ตามของ',         icon: 'ri-truck-line',         color: '#8b5cf6', bg: '#F5F3FF' },
  CUSTOM:     { label: 'อื่นๆ',           icon: 'ri-bookmark-line',      color: '#64748b', bg: '#F1F5F9' },
};

export const PRIORITY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  HIGH:   { label: 'ด่วน',     color: 'var(--danger)',  bg: 'var(--danger-light)' },
  NORMAL: { label: 'ปกติ',     color: 'var(--primary)', bg: 'var(--blue-light)'   },
  LOW:    { label: 'ไม่เร่ง',  color: '#64748b',         bg: '#f1f5f9'             },
};

export function typeInfo(type: string) {
  return TYPE_LABEL[type] ?? TYPE_LABEL.CUSTOM;
}

/** ป้ายกำหนดส่ง + สี + className สำหรับ section/quick filtering */
export function dueLabel(due: Date, status: string): { text: string; color: string; cls: 'od' | 'td' | 'fu' | 'done' } {
  if (status === 'DONE' || status === 'SKIPPED') {
    return { text: due.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }), color: 'var(--text-muted)', cls: 'done' };
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(due); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { text: `เลย ${-diff} วัน`, color: 'var(--danger)', cls: 'od' };
  if (diff === 0) return { text: 'วันนี้', color: 'var(--orange)', cls: 'td' };
  if (diff === 1) return { text: 'พรุ่งนี้', color: 'var(--orange)', cls: 'fu' };
  return { text: `อีก ${diff} วัน · ${due.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`, color: 'var(--text-dark)', cls: 'fu' };
}

/** จัดกลุ่มงานค้างตามเวลา: overdue / today / week / later */
export type TimeBucket = 'overdue' | 'today' | 'week' | 'later';

export function timeBucket(due: Date): TimeBucket {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(due); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'week';
  return 'later';
}

export const TIME_BUCKET_META: Record<TimeBucket, { label: string; dot: string }> = {
  overdue: { label: 'เลยกำหนด', dot: 'var(--danger)' },
  today:   { label: 'วันนี้',   dot: 'var(--orange)' },
  week:    { label: 'สัปดาห์นี้', dot: 'var(--text-light)' },
  later:   { label: 'ภายหลัง',   dot: 'var(--text-light)' },
};
