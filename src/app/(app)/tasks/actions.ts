'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canModifyCustomer } from '@/lib/authz';
import { TaskType, TaskStatus, TaskPriority } from '@prisma/client';

/**
 * MEMBER → ส่ง assignedToId ได้เฉพาะตัวเอง (กัน assign งานให้คนอื่น)
 * LEADER → assign ได้คนในทีมตัวเอง
 * ADMIN  → assign ใครก็ได้
 *
 * คืน assignedToId ที่ "ถูกต้อง" ตาม role (resolve fallback = user.id)
 */
async function resolveAssignedToId(
  user: { id: string; role: string; teamId: string | null },
  requestedId: string | null | undefined,
): Promise<string> {
  const req = requestedId?.trim();
  if (!req || req === user.id) return user.id;

  if (user.role === 'ADMIN') return req;

  if (user.role === 'LEADER' && user.teamId) {
    const target = await prisma.sheetUser.findUnique({
      where: { id: req },
      select: { teamId: true },
    });
    if (target?.teamId === user.teamId) return req;
    throw new Error('ไม่สามารถมอบหมายให้คนนอกทีมได้');
  }

  // MEMBER → ห้าม assign คนอื่น
  throw new Error('คุณสามารถมอบหมายงานให้ตัวเองเท่านั้น');
}

function parseEnum<T extends Record<string, string>>(e: T, v: string | undefined, fallback: T[keyof T]): T[keyof T] {
  if (v && v in e) return e[v as keyof T];
  return fallback;
}

export async function createTask(input: {
  customerPhone: string;
  title: string;
  note?: string;
  dueDate: string;            // ISO yyyy-mm-dd or full ISO
  type?: string;
  priority?: string;
  assignedToId?: string | null;
  orderId?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  if (!input.title.trim()) throw new Error('กรุณาระบุชื่องาน');
  if (!input.customerPhone.trim()) throw new Error('ไม่พบเบอร์ลูกค้า');
  if (!input.dueDate) throw new Error('กรุณาระบุวันที่');

  const due = new Date(input.dueDate);
  if (isNaN(due.getTime())) throw new Error('วันที่ไม่ถูกต้อง');

  const access = await canModifyCustomer(user, input.customerPhone.trim());
  if (!access.ok) throw new Error(access.reason);

  const assignedToId = await resolveAssignedToId(user, input.assignedToId);

  await prisma.customerTask.create({
    data: {
      customerPhone: input.customerPhone.trim(),
      title: input.title.trim(),
      note: input.note?.trim() || null,
      dueDate: due,
      type: parseEnum(TaskType, input.type, TaskType.CUSTOM),
      priority: parseEnum(TaskPriority, input.priority, TaskPriority.NORMAL),
      assignedToId,
      createdById: user.id,
      orderId: input.orderId?.trim() || null,
    },
  });

  revalidatePath(`/customers/${encodeURIComponent(input.customerPhone)}`);
  revalidatePath('/tasks');
}

export async function completeTask(input: { taskId: string; resultNote?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const task = await prisma.customerTask.findUnique({ where: { id: input.taskId } });
  if (!task) throw new Error('ไม่พบงาน');
  const access = await canModifyCustomer(user, task.customerPhone);
  if (!access.ok) throw new Error(access.reason);

  await prisma.customerTask.update({
    where: { id: input.taskId },
    data: {
      status: TaskStatus.DONE,
      completedAt: new Date(),
      completedById: user.id,
      resultNote: input.resultNote?.trim() || null,
    },
  });

  revalidatePath(`/customers/${encodeURIComponent(task.customerPhone)}`);
  revalidatePath('/tasks');
}

export async function reopenTask(input: { taskId: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const task = await prisma.customerTask.findUnique({ where: { id: input.taskId } });
  if (!task) throw new Error('ไม่พบงาน');
  const access = await canModifyCustomer(user, task.customerPhone);
  if (!access.ok) throw new Error(access.reason);

  await prisma.customerTask.update({
    where: { id: input.taskId },
    data: {
      status: TaskStatus.PENDING,
      completedAt: null,
      completedById: null,
      resultNote: null,
    },
  });

  revalidatePath(`/customers/${encodeURIComponent(task.customerPhone)}`);
  revalidatePath('/tasks');
}

export async function skipTask(input: { taskId: string; resultNote?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const task = await prisma.customerTask.findUnique({ where: { id: input.taskId } });
  if (!task) throw new Error('ไม่พบงาน');
  const access = await canModifyCustomer(user, task.customerPhone);
  if (!access.ok) throw new Error(access.reason);

  await prisma.customerTask.update({
    where: { id: input.taskId },
    data: {
      status: TaskStatus.SKIPPED,
      completedAt: new Date(),
      completedById: user.id,
      resultNote: input.resultNote?.trim() || null,
    },
  });

  revalidatePath(`/customers/${encodeURIComponent(task.customerPhone)}`);
  revalidatePath('/tasks');
}

export async function deleteTask(input: { taskId: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const task = await prisma.customerTask.findUnique({ where: { id: input.taskId } });
  if (!task) throw new Error('ไม่พบงาน');
  const access = await canModifyCustomer(user, task.customerPhone);
  if (!access.ok) throw new Error(access.reason);

  // เฉพาะ ADMIN/LEADER หรือผู้สร้างเท่านั้น
  if (user.role !== 'ADMIN' && user.role !== 'LEADER' && task.createdById !== user.id) {
    throw new Error('ไม่มีสิทธิ์ลบงานนี้');
  }

  await prisma.customerTask.delete({ where: { id: input.taskId } });

  revalidatePath(`/customers/${encodeURIComponent(task.customerPhone)}`);
  revalidatePath('/tasks');
}

/**
 * สร้าง CustomerTask จาก suggestion (ลูกค้า AT_RISK/LAPSED ที่หน้า /tasks เสนอ)
 * — ค่า default: type=FOLLOW_UP, priority=HIGH, dueDate=วันนี้, assign ให้ user เอง
 */
export async function createTaskFromSuggestion(input: {
  customerPhone: string;
  customerName: string;
  stage: 'AT_RISK' | 'LAPSED';
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role === 'ADMIN') throw new Error('ADMIN ไม่สามารถสร้าง task รายลูกค้าได้');
  if (!input.customerPhone.trim()) throw new Error('ไม่พบเบอร์ลูกค้า');

  const access = await canModifyCustomer(user, input.customerPhone.trim());
  if (!access.ok) throw new Error(access.reason);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const title = input.stage === 'AT_RISK'
    ? `ติดตาม ${input.customerName} — ถึงเวลารีออเดอร์`
    : `ติดตาม ${input.customerName} — ห่างหายไปนาน`;

  await prisma.customerTask.create({
    data: {
      customerPhone: input.customerPhone.trim(),
      title,
      dueDate: today,
      type: TaskType.FOLLOW_UP,
      priority: TaskPriority.HIGH,
      assignedToId: user.id,
      createdById: user.id,
    },
  });

  revalidatePath('/tasks');
  revalidatePath(`/customers/${encodeURIComponent(input.customerPhone)}`);
}

export async function batchCreateTasks(input: {
  customerPhone: string;
  orderId?: string | null;
  tasks: {
    title: string;
    note?: string;
    dueDate: string;
    type?: string;
    priority?: string;
    assignedToId?: string | null;
  }[];
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  if (!input.customerPhone.trim()) throw new Error('ไม่พบเบอร์ลูกค้า');
  if (!input.tasks.length) throw new Error('ไม่มีงานที่จะสร้าง');

  const access = await canModifyCustomer(user, input.customerPhone.trim());
  if (!access.ok) throw new Error(access.reason);

  const rowsAsync = await Promise.all(
    input.tasks.map(async t => {
      if (!t.title.trim()) return null;
      const due = new Date(t.dueDate);
      if (isNaN(due.getTime())) return null;
      const assignedToId = await resolveAssignedToId(user, t.assignedToId);
      return {
        customerPhone: input.customerPhone.trim(),
        title: t.title.trim(),
        note: t.note?.trim() || null,
        dueDate: due,
        type: parseEnum(TaskType, t.type, TaskType.FOLLOW_UP),
        priority: parseEnum(TaskPriority, t.priority, TaskPriority.NORMAL),
        assignedToId,
        createdById: user.id,
        orderId: input.orderId?.trim() || null,
      };
    }),
  );
  const rows = rowsAsync.filter((r): r is NonNullable<typeof r> => r !== null);

  if (!rows.length) throw new Error('ไม่มีงานที่ถูกต้อง');

  await prisma.customerTask.createMany({ data: rows });

  revalidatePath(`/customers/${encodeURIComponent(input.customerPhone)}`);
  revalidatePath('/tasks');
  return { count: rows.length };
}

export async function updateTask(input: {
  taskId: string;
  title?: string;
  note?: string;
  dueDate?: string;
  priority?: string;
  type?: string;
  status?: string;
  assignedToId?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const task = await prisma.customerTask.findUnique({ where: { id: input.taskId } });
  if (!task) throw new Error('ไม่พบงาน');
  const access = await canModifyCustomer(user, task.customerPhone);
  if (!access.ok) throw new Error(access.reason);

  const data: {
    title?: string;
    note?: string | null;
    dueDate?: Date;
    priority?: TaskPriority;
    type?: TaskType;
    status?: TaskStatus;
    completedAt?: Date | null;
    completedById?: string | null;
    assignedToId?: string | null;
  } = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.note !== undefined) data.note = input.note.trim() || null;
  if (input.dueDate !== undefined) {
    const d = new Date(input.dueDate);
    if (!isNaN(d.getTime())) data.dueDate = d;
  }
  if (input.priority !== undefined) data.priority = parseEnum(TaskPriority, input.priority, task.priority);
  if (input.type !== undefined) data.type = parseEnum(TaskType, input.type, task.type);
  if (input.status !== undefined) {
    const next = parseEnum(TaskStatus, input.status, task.status);
    data.status = next;
    if (next === TaskStatus.DONE || next === TaskStatus.SKIPPED) {
      // กลายเป็นปิด — บันทึก completedAt ถ้ายังไม่มี
      if (!task.completedAt) {
        data.completedAt = new Date();
        data.completedById = user.id;
      }
    } else {
      // กลับมา active (PENDING / IN_PROGRESS / WAITING_REPLY) — เคลียร์ done meta
      data.completedAt = null;
      data.completedById = null;
    }
  }
  if (input.assignedToId !== undefined) {
    data.assignedToId = input.assignedToId === null
      ? null
      : await resolveAssignedToId(user, input.assignedToId);
  }

  await prisma.customerTask.update({ where: { id: input.taskId }, data });

  revalidatePath(`/customers/${encodeURIComponent(task.customerPhone)}`);
  revalidatePath('/tasks');
}
