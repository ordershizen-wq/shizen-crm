'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  userName: string;
  action: (currentPassword: string, newPassword: string)
    => Promise<{ ok: true } | { ok: false; error: string }>;
};

export default function ChangePasswordClient({ userName, action }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError('รหัสผ่านใหม่และยืนยันไม่ตรงกัน');
      return;
    }
    if (next.length < 6) {
      setError('รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัว');
      return;
    }

    startTransition(async () => {
      const res = await action(current, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 800);
    });
  };

  return (
    <div className="login-page">
      <form onSubmit={onSubmit} className="login-card">
        <div className="login-brand">
          <div className="login-brand-logo">
            <i className="ri-shield-keyhole-line"></i>
          </div>
          <div>
            <div className="login-brand-title">ตั้งรหัสผ่านใหม่</div>
            <div className="login-brand-sub">{userName}</div>
          </div>
        </div>

        <div className="login-field">
          <label htmlFor="current">รหัสผ่านปัจจุบัน</label>
          <input
            id="current" type="password" autoComplete="current-password"
            value={current} onChange={e => setCurrent(e.target.value)}
            placeholder="รหัสผ่านปัจจุบัน"
            disabled={pending || success} required
          />
        </div>

        <div className="login-field">
          <label htmlFor="next">รหัสผ่านใหม่</label>
          <input
            id="next" type="password" autoComplete="new-password"
            value={next} onChange={e => setNext(e.target.value)}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            disabled={pending || success} required
          />
        </div>

        <div className="login-field">
          <label htmlFor="confirm">ยืนยันรหัสผ่านใหม่</label>
          <input
            id="confirm" type="password" autoComplete="new-password"
            value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="พิมพ์รหัสใหม่อีกครั้ง"
            disabled={pending || success} required
          />
        </div>

        {error && (
          <div className="login-error" role="alert">
            <i className="ri-error-warning-line"></i> {error}
          </div>
        )}
        {success && (
          <div className="login-error" style={{ background: 'var(--success-light, #d1fae5)', color: 'var(--success)' }}>
            <i className="ri-checkbox-circle-line"></i> เปลี่ยนรหัสสำเร็จ กำลังพาเข้าระบบ...
          </div>
        )}

        <button type="submit" className="login-submit" disabled={pending || success}>
          {pending ? (
            <><i className="ri-loader-4-line login-spinner"></i> กำลังบันทึก...</>
          ) : (
            <>บันทึกรหัสผ่านใหม่ <i className="ri-check-line"></i></>
          )}
        </button>
      </form>
    </div>
  );
}
