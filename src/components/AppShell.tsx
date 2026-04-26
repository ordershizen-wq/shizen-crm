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
};

export default function AppShell({ user, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ปิด sidebar อัตโนมัติเมื่อ resize ไป desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-wrapper">
      {/* Sidebar */}
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Backdrop overlay (mobile เท่านั้น) */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="main-content">
        <header className="top-header">
          {/* Hamburger button — แสดงเฉพาะ mobile (CSS จัดการ display) */}
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="เปิดเมนู"
          >
            <i className="ri-menu-line"></i>
          </button>

          <div className="header-search">
            <i className="ri-search-line"></i>
            <input type="text" placeholder="ค้นหาลูกค้า, ออเดอร์, เบอร์โทร..." />
          </div>

          <div className="header-actions">
            <button className="icon-btn" title="แจ้งเตือน">
              <i className="ri-notification-3-line"></i>
            </button>
          </div>
        </header>

        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}
