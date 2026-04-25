'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions';

type Props = {
  user: {
    id: string;
    fullName: string;
    role: string;
    team: { id: string; name: string; color: string | null } | null;
  };
};

const NAV = [
  { label: 'Main Menu', items: [
    { href: '/',          icon: 'ri-dashboard-line',  text: 'แดชบอร์ด' },
    { href: '/followup',  icon: 'ri-task-line',        text: 'งานวันนี้' },
    { href: '/customers', icon: 'ri-group-line',        text: 'จัดการลูกค้า' },
    { href: '/orders',    icon: 'ri-truck-line',        text: 'ออเดอร์' },
  ]},
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  LEADER: 'หัวหน้าทีม',
  MEMBER: 'เซลส์',
};

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  ADMIN:  { bg: '#ececf6', color: '#6f42c1' },
  LEADER: { bg: 'var(--blue-light)', color: 'var(--primary)' },
  MEMBER: { bg: 'var(--success-light)', color: 'var(--success)' },
};

export default function Sidebar({ user }: Props) {
  const pathname = usePathname();
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  const style = ROLE_STYLE[user.role] ?? ROLE_STYLE.MEMBER;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <i className="ri-customer-service-2-fill"></i>
        <span>CRM Shizen</span>
      </div>

      <nav className="sidebar-menu">
        {NAV.map(group => (
          <div key={group.label} style={{ marginBottom: '1rem' }}>
            <div className="menu-label">{group.label}</div>
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`menu-item ${isActive(item.href) ? 'active' : ''}`}
              >
                <i className={item.icon}></i>
                <span>{item.text}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="user-profile-sm">
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: style.bg, color: style.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, flexShrink: 0,
          }}>
            {user.fullName.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fw-600" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.fullName}
            </div>
            <div className="text-sm text-muted" style={{ fontSize: 11 }}>
              {ROLE_LABEL[user.role] ?? user.role}
              {user.team && ` · ${user.team.name}`}
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="icon-btn" title="ออกจากระบบ" style={{ width: 32, height: 32 }}>
              <i className="ri-logout-box-r-line"></i>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
