'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { LoginResult } from '@/app/actions';

type Props = {
  action: (employeeId: string, password: string) => Promise<LoginResult>;
};

export default function LoginClient({ action }: Props) {
  const router = useRouter();
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
      router.push('/');
      router.refresh();
    });
  };

  return (
    <div className="login-page">
      <form onSubmit={onSubmit} className="login-card">
        <div className="login-brand">
          <div className="login-brand-logo">
            <i className="ri-leaf-line"></i>
          </div>
          <div>
            <div className="login-brand-title">Shizen CRM</div>
            <div className="login-brand-sub">ระบบจัดการลูกค้า</div>
          </div>
        </div>

        <h1 className="login-title">เข้าสู่ระบบ</h1>
        <p className="login-subtitle">กรุณากรอกรหัสพนักงานและรหัสผ่าน</p>

        <div className="login-field">
          <label htmlFor="employeeId">รหัสพนักงาน</label>
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

        <div className="login-field">
          <label htmlFor="password">รหัสผ่าน</label>
          <div className="login-password-wrap">
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
  );
}
