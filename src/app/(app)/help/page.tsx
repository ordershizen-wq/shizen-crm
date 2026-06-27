import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import HelpManual from './HelpManual';

export const metadata: Metadata = {
  title: 'คู่มือการใช้งาน · Shizen CRM',
  description: 'วิธีใช้งานระบบ Shizen CRM สำหรับเซลส์ หัวหน้าทีม และแอดมิน',
};

export default async function HelpPage() {
  const user = (await getCurrentUser())!;
  const firstName = user.fullName.split(' ')[0] || user.fullName;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">คู่มือการใช้งาน</h1>
        <p className="text-sm text-muted mt-1">
          แตะแต่ละหัวข้อเพื่อกางอ่าน · เปิดดูได้ตลอดระหว่างใช้งานจริง
        </p>
      </div>

      <HelpManual role={user.role} firstName={firstName} />
    </>
  );
}
