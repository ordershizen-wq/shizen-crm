import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ResetPasswordButton from './ResetPasswordButton';
import PasswordCell from './PasswordCell';
import { resetUserPassword } from './actions';

const ROLE_LABEL: Record<string, string> = {
  ADMIN:  'แอดมิน',
  LEADER: 'หัวหน้าทีม',
  MEMBER: 'เซลส์',
};
const ROLE_COLOR: Record<string, string> = {
  ADMIN:  '#8b5cf6',
  LEADER: '#f59e0b',
  MEMBER: '#3b82f6',
};

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  const users = await prisma.sheetUser.findMany({
    where: { role: { not: 'PACKER' } },
    orderBy: [{ isActive: 'asc' }, { role: 'asc' }, { fullName: 'asc' }],
    select: {
      id: true,
      fullName: true,
      employeeId: true,
      role: true,
      isActive: true,
      passwordChangedAt: true,
      password: true,
      team: { select: { name: true, color: true } },
    },
  });

  return (
    <>
      <div className="page-header mb-4">
        <h1 className="page-title">
          <i className="ri-team-line text-primary"></i> จัดการผู้ใช้
        </h1>
        <p className="text-sm text-muted mt-1">
          รีเซ็ตรหัสผ่านให้พนักงาน · ทั้งหมด {users.length} คน
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="r-table-wrap">
          <table className="r-table">
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>รหัสพนักงาน</th>
                <th>รหัสผ่าน</th>
                <th>บทบาท</th>
                <th>ทีม</th>
                <th>เปลี่ยนรหัสล่าสุด</th>
                <th>สถานะ</th>
                <th style={{ textAlign: 'right' }}>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const lastChange = u.passwordChangedAt
                  ? u.passwordChangedAt.toLocaleDateString('th-TH', {
                      day: 'numeric', month: 'short', year: '2-digit',
                    })
                  : <span className="text-muted">— ยังไม่เคยเปลี่ยน</span>;
                const inactive = u.isActive !== 'ACTIVE';

                return (
                  <tr key={u.id} style={inactive ? { opacity: 0.5 } : undefined}>
                    <td data-label="ชื่อ" className="fw-600">{u.fullName}</td>
                    <td data-label="รหัสพนักงาน" style={{ fontFamily: 'monospace' }}>
                      {u.employeeId ?? <span className="text-muted">—</span>}
                    </td>
                    <td data-label="รหัสผ่าน">
                      <PasswordCell password={u.password} />
                    </td>
                    <td data-label="บทบาท">
                      <span style={{
                        background: `${ROLE_COLOR[u.role]}1a`,
                        color: ROLE_COLOR[u.role],
                        padding: '0.2rem 0.6rem',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </td>
                    <td data-label="ทีม" className="text-sm">
                      {u.team?.name ?? <span className="text-muted">—</span>}
                    </td>
                    <td data-label="เปลี่ยนรหัสล่าสุด" className="text-sm">
                      {lastChange}
                    </td>
                    <td data-label="สถานะ">
                      {inactive ? (
                        <span className="text-muted text-sm">ปิดการใช้งาน</span>
                      ) : !u.password ? (
                        <span style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>
                          ⚠️ ไม่มีรหัส
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 600 }}>
                          ✓ ใช้งานได้
                        </span>
                      )}
                    </td>
                    <td data-label="การจัดการ" style={{ textAlign: 'right' }}>
                      {!inactive && (
                        <ResetPasswordButton
                          userId={u.id}
                          userName={u.fullName}
                          employeeId={u.employeeId}
                          action={resetUserPassword}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 mt-3 admin-info-card" style={{ background: 'var(--blue-light)', border: '1px solid #93c5fd' }}>
        <div className="fw-700 mb-2 admin-info-card-title" style={{ fontSize: 14, color: '#1e40af' }}>
          <i className="ri-information-line"></i> วิธีรีเซ็ตรหัสผ่าน
        </div>
        <ol style={{ paddingLeft: '1.25rem', margin: 0, fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.6 }}>
          <li>ดูรหัสปัจจุบันของแต่ละคนได้ที่คอลัมน์ “รหัสผ่าน” (กดไอคอนรูปตา)</li>
          <li>ถ้าต้องตั้งใหม่ กดปุ่ม “รีเซ็ตรหัส” ที่แถวของพนักงาน แล้วกรอกรหัสใหม่ (≥ 6 ตัวอักษร)</li>
          <li>แจ้งรหัสใหม่ให้พนักงานเพื่อ login</li>
          <li>พนักงานสามารถเปลี่ยนเองได้ภายหลังที่หน้า “เปลี่ยนรหัสผ่าน”</li>
        </ol>
      </div>
    </>
  );
}
