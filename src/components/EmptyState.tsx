import Link from 'next/link';

type Variant = 'default' | 'success' | 'info' | 'warning';

type Props = {
  icon: string;          // remixicon class e.g. 'ri-task-line'
  title: string;
  description?: string;
  variant?: Variant;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: string;
  };
  small?: boolean;
};

const VARIANT_STYLE: Record<Variant, { iconBg: string; iconColor: string }> = {
  default: { iconBg: 'var(--primary-tint)',   iconColor: 'var(--primary)' },
  success: { iconBg: 'var(--success-light)',  iconColor: 'var(--success)' },
  info:    { iconBg: 'var(--info-light)',     iconColor: 'var(--info)'    },
  warning: { iconBg: 'var(--warning-light)',  iconColor: '#d39e00'        },
};

export default function EmptyState({
  icon, title, description, variant = 'default', action, small = false,
}: Props) {
  const v = VARIANT_STYLE[variant];
  const ActionEl = action?.href ? Link : 'button';

  return (
    <div
      className="card"
      style={{
        padding: small ? '2rem 1rem' : '3rem 1.5rem',
        textAlign: 'center',
        background: '#fff',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: small ? 56 : 72,
          height: small ? 56 : 72,
          borderRadius: '50%',
          background: v.iconBg,
          color: v.iconColor,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: small ? 26 : 34,
          margin: '0 auto 1rem',
        }}
      >
        <i className={icon}></i>
      </div>

      <h3
        style={{
          fontSize: small ? 15 : 17,
          fontWeight: 700,
          color: 'var(--text-dark)',
          margin: '0 0 0.4rem',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            fontSize: 13.5,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            margin: '0 auto',
            maxWidth: 360,
          }}
        >
          {description}
        </p>
      )}

      {action && (
        <div style={{ marginTop: '1.25rem' }}>
          {action.href ? (
            <Link href={action.href} className="btn btn-primary" style={{ fontSize: 13 }}>
              {action.icon && <i className={action.icon}></i>}
              {action.label}
            </Link>
          ) : (
            <button onClick={action.onClick} className="btn btn-primary" style={{ fontSize: 13 }}>
              {action.icon && <i className={action.icon}></i>}
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
