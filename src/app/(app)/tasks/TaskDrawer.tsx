'use client';

import { useEffect } from 'react';
import TaskDetail, { type TaskItem } from './TaskDetail';

export type { TaskItem };
/** alias ย้อนหลัง — TasksKanban เดิมเรียกชื่อนี้ */
export type DrawerTask = TaskItem;

/** Drawer overlay สำหรับมือถือ — ห่อ TaskDetail ตัวเดียวกับ pane บน desktop */
export default function TaskDrawer({ task, onClose }: { task: TaskItem | null; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (task) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [task, onClose]);

  if (!task) return null;

  return (
    <>
      <div className="task-drawer-backdrop" onClick={onClose} />
      <aside className="task-drawer" role="dialog" aria-modal="true">
        <TaskDetail task={task} onClose={onClose} />
      </aside>
    </>
  );
}
