'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LoginResult } from '@/app/actions';

type Props = {
  action: (employeeId: string, password: string) => Promise<LoginResult>;
};

// คำนวณครั้งเดียวตอนโหลดโมดูล (ไม่เรียกใน render เพื่อเลี่ยง react-hooks/purity)
const CURRENT_YEAR = new Date().getFullYear();

export default function LoginClient({ action }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const safeFrom = from && from.startsWith('/') && !from.startsWith('//') ? from : null;
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await action(employeeId, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(safeFrom ?? '/');
      router.refresh();
    });
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        {/* ── Brand panel (เดสก์ท็อปเท่านั้น) ── */}
        <aside className="login-brand-panel" aria-hidden="true">
          <div className="login-brand-orbs" />
          <div className="login-brand-panel-top">
            <div className="login-brand-logo"><i className="ri-leaf-line"></i></div>
            <div className="login-brand-name">Shizen CRM</div>
          </div>

          <div className="login-brand-panel-mid">
            <h2 className="login-brand-headline">
              จัดการลูกค้า<br />ครบ จบ ในที่เดียว
            </h2>
            <p className="login-brand-lead">
              ติดตามออเดอร์ ดูแลลูกค้า และวิเคราะห์ยอดขาย — ทุกอย่างในระบบเดียว
            </p>
            <ul className="login-brand-feats">
              <li><i className="ri-line-chart-line"></i> ภาพรวมยอดขายแบบเรียลไทม์</li>
              <li><i className="ri-group-line"></i> ดูแลลูกค้ารายคน ไม่ตกหล่น</li>
              <li><i className="ri-checkbox-circle-line"></i> งานติดตามอัตโนมัติทุกวัน</li>
            </ul>
          </div>

          <div className="login-brand-panel-foot">
            © {CURRENT_YEAR} Shizen · ระบบจัดการลูกค้า
          </div>
        </aside>

        {/* ── ฟอร์มเข้าสู่ระบบ ── */}
        <form onSubmit={onSubmit} className="login-form-panel">
          {/* แบรนด์ย่อ — โผล่เฉพาะมือถือ (พาเนลซ้ายถูกซ่อน) */}
          <div className="login-brand login-brand-mobile">
            <div className="login-brand-logo"><i className="ri-leaf-line"></i></div>
            <div>
              <div className="login-brand-title">Shizen CRM</div>
              <div className="login-brand-sub">ระบบจัดการลูกค้า</div>
            </div>
          </div>

          <h1 className="login-title">เข้าสู่ระบบ</h1>
          <p className="login-subtitle">กรุณากรอกรหัสพนักงานและรหัสผ่าน</p>

          <div className="login-field">
            <label htmlFor="employeeId">รหัสพนักงาน</label>
            <div className="login-input-icon">
              <i className="ri-user-3-line login-input-lead"></i>
              <input
                id="employeeId"
                type="text"
                inputMode="text"
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck={false}
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="เช่น E001"
                disabled={pending}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">รหัสผ่าน</label>
            <div className="login-input-icon">
              <i className="ri-lock-2-line login-input-lead"></i>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="รหัสผ่าน"
                disabled={pending}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="login-password-toggle"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                tabIndex={-1}
              >
                <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
              </button>
            </div>
            <p className="login-hint">
              ใช้รหัสพนักงานและรหัสผ่านเดิมจากระบบเก่า
            </p>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <i className="ri-error-warning-line"></i> {error}
            </div>
          )}

          <button type="submit" className="login-submit" disabled={pending}>
            {pending ? (
              <>
                <i className="ri-loader-4-line login-spinner"></i> กำลังเข้าสู่ระบบ...
              </>
            ) : (
              <>เข้าสู่ระบบ <i className="ri-arrow-right-line"></i></>
            )}
          </button>

          <div className="login-footer">
            <i className="ri-information-line"></i> ลืมรหัสผ่าน? ติดต่อแอดมินเพื่อรีเซ็ต
          </div>
        </form>
      </div>
    </div>
  );
}
