'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

type User = {
  id: string;
  fullName: string;
  role: string;
  team: { id: string; name: string; color: string | null } | null;
};

type Props = {
  user: User;
  children: React.ReactNode;
  atRiskCount?: number;
  taskCount?: number;
};

const COLLAPSE_KEY = 'shizen.sidebarCollapsed';

export default function AppShell({ user, children, atRiskCount = 0, taskCount = 0 }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false);     // desktop rail
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // restore preference
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved === '1') setCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  return (
    <div className={`app-wrapper${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        atRiskCount={atRiskCount}
        taskCount={taskCount}
        collapsed={hydrated && collapsed}
        onToggleCollapse={toggleCollapse}
      />

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="main-content">
        <header className="top-header">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="เปิดเมนู"
          >
            <i className="ri-menu-line"></i>
          </button>

          <button
            className="collapse-btn"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'ขยายเมนู' : 'ยุบเมนู'}
            title={collapsed ? 'ขยายเมนู' : 'ยุบเมนู'}
          >
            <i className={collapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'}></i>
          </button>

          <div className="header-search">
            <i className="ri-search-line"></i>
            <input type="text" placeholder="ค้นหาลูกค้า, ออเดอร์, เบอร์โทร..." />
          </div>

          <div className="header-actions">
            {atRiskCount > 0 && (
              <a
                href="/tasks"
                className="navbar-alert-pill"
                aria-label={`มีลูกค้าต้องติดตาม ${atRiskCount} ราย`}
              >
                <i className="ri-alarm-warning-line"></i>
                <span className="navbar-alert-pill-label">ต้องติดตาม</span>
                <span className="navbar-alert-pill-count">{atRiskCount}</span>
              </a>
            )}
            <button
              className="header-icon-btn"
              title="แจ้งเตือน"
              aria-label="แจ้งเตือน"
            >
              <i className="ri-notification-3-line"></i>
            </button>
          </div>
        </header>

        <div className="page-content fade-in">{children}</div>
      </div>
    </div>
  );
}
