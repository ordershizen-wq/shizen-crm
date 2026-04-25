import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="app-wrapper">
      <Sidebar user={{ id: user.id, fullName: user.fullName, role: user.role, team: user.team }} />
      <div className="main-content">
        <header className="top-header">
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
