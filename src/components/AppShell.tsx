'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import RouteProgressBar from './RouteProgressBar';
import HeaderSearch from './HeaderSearch';
import { FeedbackProvider } from './ui/Feedback';

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
const THEME_KEY = 'shizen.theme';

export default function AppShell({ user, children, atRiskCount = 0, taskCount = 0 }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false);     // desktop rail
  const [tabletRail, setTabletRail] = useState(false);   // auto rail at 769-1024
  const [hydrated, setHydrated] = useState(false);
  const [searchPlaceholder, setSearchPlaceholder] = useState('ค้นหาลูกค้า, ออเดอร์, เบอร์โทร...');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // restore sidebar preference
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved === '1') setCollapsed(true);
    } catch {}
    // sync dark state from html class (set by FOUC script in layout.tsx)
    setIsDark(document.documentElement.classList.contains('dark'));
    setHydrated(true);
  }, []);

  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      if (w > 768) setSidebarOpen(false);
      setTabletRail(w >= 769 && w <= 1024);
      setSearchPlaceholder(w <= 480 ? 'ค้นหา...' : 'ค้นหาลูกค้า, ออเดอร์, เบอร์โทร...');
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch {}
    setIsDark(next);
  };

  const effectiveCollapsed = hydrated && (collapsed || tabletRail);

  return (
    <div className={`app-wrapper${effectiveCollapsed ? ' sidebar-collapsed' : ''}${tabletRail ? ' tablet-rail' : ''}`}>
      <RouteProgressBar />
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        atRiskCount={atRiskCount}
        taskCount={taskCount}
        collapsed={effectiveCollapsed}
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

          <HeaderSearch placeholder={searchPlaceholder} />

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
              onClick={toggleTheme}
              title={isDark ? 'สลับ Light Mode' : 'สลับ Dark Mode'}
              aria-label={isDark ? 'สลับ Light Mode' : 'สลับ Dark Mode'}
            >
              <i className={hydrated && isDark ? 'ri-sun-line' : 'ri-moon-line'}></i>
            </button>
          </div>
        </header>

        <div className="page-content fade-in">
          <FeedbackProvider>{children}</FeedbackProvider>
        </div>
      </div>
    </div>
  );
}
