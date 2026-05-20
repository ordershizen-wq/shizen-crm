'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Props = {
  scope: 'all' | 'me';
  status: 'pending' | 'done' | 'all';
  range: 'today' | 'overdue' | 'week' | 'all';
  view: 'list' | 'kanban' | 'calendar';
  groupBy: 'time' | 'type' | 'assignee' | 'workflow';
  canSeeAssignee: boolean;
};

export default function TasksFilterClient({ scope, status, range, view, groupBy, canSeeAssignee }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    if (
      (key === 'scope'   && value === 'all')     ||
      (key === 'status'  && value === 'pending') ||
      (key === 'range'   && value === 'all')     ||
      (key === 'view'    && value === 'list')    ||
      (key === 'groupBy' && value === 'time')
    ) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.push(`/tasks${next.toString() ? `?${next.toString()}` : ''}`);
  };

  // นับ filter ที่ active (ไม่ใช่ default) เพื่อโชว์ badge บน mobile
  const activeFilterCount =
    (scope !== 'all' ? 1 : 0) +
    (status !== 'pending' ? 1 : 0) +
    (range !== 'all' && view === 'list' && status === 'pending' ? 1 : 0);

  return (
    <div className="tasks-filter-bar card mb-3">
      {/* Mobile-only header: toggle + view switcher */}
      <div className="tasks-filter-mobile-head">
        <button
          type="button"
          onClick={() => setMobileOpen(o => !o)}
          className="btn btn-secondary tasks-filter-toggle"
          aria-expanded={mobileOpen}
        >
          <i className={mobileOpen ? 'ri-close-line' : 'ri-filter-3-line'}></i>
          <span>ตัวกรอง</span>
          {activeFilterCount > 0 && (
            <span className="tasks-filter-count-badge">{activeFilterCount}</span>
          )}
        </button>

        <div className="view-toggle">
          <button
            type="button"
            onClick={() => setParam('view', 'list')}
            className={`view-toggle-btn${view === 'list' ? ' active' : ''}`}
            aria-pressed={view === 'list'}
            aria-label="มุมมองรายการ"
          >
            <i className="ri-list-unordered"></i>
            <span>รายการ</span>
          </button>
          <button
            type="button"
            onClick={() => setParam('view', 'kanban')}
            className={`view-toggle-btn${view === 'kanban' ? ' active' : ''}`}
            aria-pressed={view === 'kanban'}
            aria-label="มุมมอง kanban"
          >
            <i className="ri-layout-column-line"></i>
            <span>Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setParam('view', 'calendar')}
            className={`view-toggle-btn${view === 'calendar' ? ' active' : ''}`}
            aria-pressed={view === 'calendar'}
            aria-label="มุมมองปฏิทิน"
          >
            <i className="ri-calendar-2-line"></i>
            <span>ปฏิทิน</span>
          </button>
        </div>
      </div>

      <div className={`tasks-filter-body${mobileOpen ? ' is-open' : ''}`}>
        <FilterGroup label="ผู้รับผิดชอบ">
          <Pill active={scope === 'all'} onClick={() => setParam('scope', 'all')}>ทั้งหมด</Pill>
          <Pill active={scope === 'me'}  onClick={() => setParam('scope', 'me')}>ของฉัน</Pill>
        </FilterGroup>

        <FilterGroup label="สถานะ">
          <Pill active={status === 'pending'} onClick={() => setParam('status', 'pending')}>ค้างอยู่</Pill>
          <Pill active={status === 'done'}    onClick={() => setParam('status', 'done')}>เสร็จแล้ว</Pill>
          <Pill active={status === 'all'}     onClick={() => setParam('status', 'all')}>ทั้งหมด</Pill>
        </FilterGroup>

        {status === 'pending' && view === 'list' && (
          <FilterGroup label="ช่วงเวลา">
            <Pill active={range === 'all'}     onClick={() => setParam('range', 'all')}>ทั้งหมด</Pill>
            <Pill active={range === 'today'}   onClick={() => setParam('range', 'today')}>วันนี้</Pill>
            <Pill active={range === 'overdue'} onClick={() => setParam('range', 'overdue')}>เลยกำหนด</Pill>
            <Pill active={range === 'week'}    onClick={() => setParam('range', 'week')}>7 วัน</Pill>
          </FilterGroup>
        )}

        {view === 'kanban' && (
          <FilterGroup label="จัดกลุ่มตาม">
            <Pill active={groupBy === 'time'} onClick={() => setParam('groupBy', 'time')}>
              <i className="ri-time-line" style={{ marginRight: 4 }}></i>เวลา
            </Pill>
            <Pill active={groupBy === 'type'} onClick={() => setParam('groupBy', 'type')}>
              <i className="ri-price-tag-3-line" style={{ marginRight: 4 }}></i>ประเภท
            </Pill>
            <Pill active={groupBy === 'workflow'} onClick={() => setParam('groupBy', 'workflow')}>
              <i className="ri-flow-chart" style={{ marginRight: 4 }}></i>ขั้นตอน
            </Pill>
            {canSeeAssignee && (
              <Pill active={groupBy === 'assignee'} onClick={() => setParam('groupBy', 'assignee')}>
                <i className="ri-team-line" style={{ marginRight: 4 }}></i>ผู้รับผิดชอบ
              </Pill>
            )}
          </FilterGroup>
        )}

        {/* Desktop-only view toggle (mobile โชว์อันบนแล้ว) */}
        <div className="tasks-filter-view-desktop">
          <FilterGroup label="มุมมอง">
            <div className="view-toggle">
              <button
                type="button"
                onClick={() => setParam('view', 'list')}
                className={`view-toggle-btn${view === 'list' ? ' active' : ''}`}
                aria-pressed={view === 'list'}
                aria-label="มุมมองรายการ"
              >
                <i className="ri-list-unordered"></i>
                <span>รายการ</span>
              </button>
              <button
                type="button"
                onClick={() => setParam('view', 'kanban')}
                className={`view-toggle-btn${view === 'kanban' ? ' active' : ''}`}
                aria-pressed={view === 'kanban'}
                aria-label="มุมมอง kanban"
              >
                <i className="ri-layout-column-line"></i>
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setParam('view', 'calendar')}
                className={`view-toggle-btn${view === 'calendar' ? ' active' : ''}`}
                aria-pressed={view === 'calendar'}
                aria-label="มุมมองปฏิทิน"
              >
                <i className="ri-calendar-2-line"></i>
                <span>ปฏิทิน</span>
              </button>
            </div>
          </FilterGroup>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="tasks-filter-group">
      <div className="text-sm text-muted" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`tasks-filter-pill${active ? ' is-active' : ''}`}
    >
      {children}
    </button>
  );
}
