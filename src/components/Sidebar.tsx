'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions';

/** ไอคอน spinner เล็กที่แสดงเฉพาะตอนลิงก์กำลังโหลด — fixed-size, ไม่ดันเลย์เอาต์ */
function MenuItemPendingIndicator() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className="menu-item-pending"
      data-pending={pending ? 'true' : 'false'}
    />
  );
}

type Props = {
  user: {
    id: string;
    fullName: string;
    role: string;
    team: { id: string; name: string; color: string | null } | null;
  };
  isOpen?: boolean;
  onClose?: () => void;
  atRiskCount?: number;
  taskCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type NavItem = {
  href: string;
  icon: string;
  text: string;
  badge?: 'atRisk' | 'task';
  adminOnly?: boolean;
  hideFromAdmin?: boolean;   // งานรายลูกค้าซึ่ง ADMIN supervise ไม่ใช่ exec
};

const NAV: { label: string; items: NavItem[] }[] = [
  { label: 'เมนูหลัก', items: [
    { href: '/',          icon: 'ri-dashboard-3-line',    text: 'แดชบอร์ด' },
    { href: '/tasks',     icon: 'ri-checkbox-line',       text: 'งาน',          badge: 'task', hideFromAdmin: true },
    { href: '/customers', icon: 'ri-group-2-line',         text: 'จัดการลูกค้า' },
    { href: '/orders',    icon: 'ri-shopping-bag-3-line',  text: 'ออเดอร์' },
    { href: '/products',  icon: 'ri-archive-2-line',       text: 'คลังสินค้า' },
    { href: '/insights',    icon: 'ri-bar-chart-2-line',   text: 'สถิติเชิงลึก' },
  ]},
  { label: 'แอดมิน', items: [
    { href: '/admin/users',       icon: 'ri-team-line',    text: 'จัดการผู้ใช้',    adminOnly: true },
    { href: '/admin/sync-failed', icon: 'ri-refresh-line', text: 'ออเดอร์รอ sync', adminOnly: true },
  ]},
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN:  'ผู้ดูแลระบบ',
  LEADER: 'หัวหน้าทีม',
  MEMBER: 'เซลส์',
};

export default function Sidebar({
  user, isOpen = false, onClose, atRiskCount = 0, taskCount = 0,
  collapsed = false, onToggleCollapse,
}: Props) {
  const pathname = usePathname();
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  const initials = user.fullName
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const showText = !collapsed;

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          <i className="ri-leaf-line"></i>
        </div>
        {showText && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-brand-text">Shizen CRM</div>
            <div className="sidebar-brand-sub">ระบบจัดการลูกค้า</div>
          </div>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            aria-label="ปิดเมนู"
          >
            <i className="ri-close-line"></i>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-menu">
        {NAV.map(group => {
          const visibleItems = group.items.filter(it => {
            if (it.adminOnly && user.role !== 'ADMIN') return false;
            if (it.hideFromAdmin && user.role === 'ADMIN') return false;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
          <div key={group.label}>
            {showText && <div className="menu-label">{group.label}</div>}
            {visibleItems.map(item => {
              const active = isActive(item.href);
              const showBadge =
                (item.badge === 'atRisk' && atRiskCount > 0) ||
                (item.badge === 'task' && taskCount > 0);
              const badgeNum = item.badge === 'atRisk' ? atRiskCount : taskCount;
              const badgeColor = item.badge === 'task' ? 'var(--primary)' : 'var(--orange)';

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`menu-item${active ? ' active' : ''}`}
                  onClick={onClose}
                  title={collapsed ? item.text : undefined}
                  data-tooltip={collapsed ? item.text : undefined}
                >
                  <i className={item.icon}></i>
                  {showText && <span style={{ flex: 1 }}>{item.text}</span>}
                  {showBadge && showText && (
                    <span className="menu-badge" style={{ background: badgeColor }}>
                      {badgeNum}
                    </span>
                  )}
                  {showBadge && !showText && (
                    <span className="menu-badge-dot" style={{ background: badgeColor }} />
                  )}
                  <MenuItemPendingIndicator />
                </Link>
              );
            })}
          </div>
          );
        })}
      </nav>

      {/* Expand button when collapsed */}
      {collapsed && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="sidebar-rail-expand"
          aria-label="ขยายเมนู"
          title="ขยายเมนู"
        >
          <i className="ri-arrow-right-s-line"></i>
        </button>
      )}

      {/* User profile + logout */}
      <div className="sidebar-bottom">
        <div className="user-profile-sm" title={collapsed ? user.fullName : undefined}>
          <div className="user-avatar">{initials}</div>
          {showText && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-name">{user.fullName}</div>
                <div className="user-role">
                  {ROLE_LABEL[user.role] ?? user.role}
                  {user.team && ` · ${user.team.name}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Link
                  href="/change-password"
                  title="เปลี่ยนรหัสผ่าน"
                  aria-label="เปลี่ยนรหัสผ่าน"
                  onClick={onClose}
                  style={{
                    width: 32, height: 32,
                    color: 'rgba(255,255,255,0.7)',
                    borderRadius: '8px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', transition: 'all 150ms',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(99,102,241,0.20)'; (e.currentTarget as HTMLAnchorElement).style.color = '#a5b4fc'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.7)'; }}
                >
                  <i className="ri-key-2-line"></i>
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    title="ออกจากระบบ"
                    aria-label="ออกจากระบบ"
                    style={{
                      width: 32, height: 32,
                      border: 'none', background: 'transparent',
                      color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                      borderRadius: '8px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', transition: 'all 150ms',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.20)'; (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'; }}
                  >
                    <i className="ri-logout-box-r-line"></i>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
