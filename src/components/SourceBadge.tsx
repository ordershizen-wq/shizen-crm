import type { OrderSource } from '@prisma/client';

const STYLE: Record<OrderSource, { label: string; icon: string; bg: string; color: string }> = {
  SHEET: {
    label: 'ลูกค้าใหม่',
    icon: 'ri-user-add-line',
    bg: 'rgba(14,165,233,0.12)',
    color: '#0284c7',
  },
  CRM_NEW: {
    label: 'ลูกค้าใหม่',
    icon: 'ri-user-add-line',
    bg: 'rgba(14,165,233,0.12)',
    color: '#0284c7',
  },
  CRM_REORDER: {
    label: 'รีออเดอร์',
    icon: 'ri-repeat-line',
    bg: 'rgba(47,160,132,0.14)',
    color: '#147a5e',
  },
};

export default function SourceBadge({ source, compact = false }: { source: OrderSource; compact?: boolean }) {
  const s = STYLE[source];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: s.bg,
        color: s.color,
        borderRadius: 999,
        padding: compact ? '0.1rem 0.4rem' : '0.2rem 0.55rem',
        fontSize: compact ? 10 : 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
      title={source}
    >
      <i className={s.icon}></i>
      {!compact && s.label}
    </span>
  );
}

export const SOURCE_LABEL: Record<OrderSource, string> = {
  SHEET: 'ลูกค้าใหม่',
  CRM_NEW: 'ลูกค้าใหม่',
  CRM_REORDER: 'รีออเดอร์',
};
