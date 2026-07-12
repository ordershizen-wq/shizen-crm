'use client';

import { useState, useTransition } from 'react';
import type { ResetResult } from './actions';

type Props = {
  userId: string;
  userName: string;
  employeeId: string | null;
  action: (userId: string, newPassword: string) => Promise<ResetResult>;
};

export default function ResetPasswordButton({ userId, userName, employeeId, action }: Props) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successPw, setSuccessPw] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setPw('');
    setConfirm('');
    setError(null);
    setSuccessPw(null);
  };

  const useEmployeeIdAsPassword = () => {
    if (employeeId) {
      setPw(employeeId);
      setConfirm(employeeId);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw !== confirm) { setError('รหัสผ่านและยืนยันไม่ตรงกัน'); return; }
    if (pw.length < 6) { setError('รหัสต้องยาวอย่างน้อย 6 ตัว'); return; }

    startTransition(async () => {
      const res = await action(userId, pw);
      if (!res.ok) { setError(res.error); return; }
      setSuccessPw(res.newPassword);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn"
        style={{
          background: 'var(--bg-app)',
          color: 'var(--primary)',
          fontSize: 12,
          padding: '0.4rem 0.75rem',
          fontWeight: 600,
        }}
      >
        <i className="ri-key-2-line"></i> รีเซ็ตรหัส
      </button>

      {open && (
        <div className="reset-modal-overlay" onClick={close}>
          <div className="reset-modal" onClick={e => e.stopPropagation()}>
            <button className="reset-modal-close" onClick={close} aria-label="ปิด" type="button">
              <i className="ri-close-line"></i>
            </button>

            {!successPw ? (
              <form onSubmit={onSubmit}>
                <h2 className="reset-modal-title">
                  <i className="ri-key-2-line"></i> รีเซ็ตรหัสผ่าน
                </h2>
                <p className="reset-modal-sub">
                  ตั้งรหัสใหม่ให้กับ <strong>{userName}</strong>
                  {employeeId && <> ({employeeId})</>}
                </p>

                <div className="login-field" style={{ marginTop: '1rem' }}>
                  <label htmlFor="new-pw">รหัสผ่านใหม่</label>
                  <input
                    id="new-pw" type="text" autoComplete="off"
                    value={pw} onChange={e => setPw(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    disabled={pending} required autoFocus
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="confirm-pw">ยืนยันรหัสผ่าน</label>
                  <input
                    id="confirm-pw" type="text" autoComplete="off"
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="พิมพ์รหัสอีกครั้ง"
                    disabled={pending} required
                  />
                </div>

                {employeeId && (
                  <button
                    type="button"
                    onClick={useEmployeeIdAsPassword}
                    className="reset-modal-quick"
                  >
                    <i className="ri-magic-line"></i> ใช้รหัสพนักงานเป็นรหัสผ่าน ({employeeId})
                  </button>
                )}

                {error && (
                  <div className="login-error" style={{ marginTop: '0.75rem' }}>
                    <i className="ri-error-warning-line"></i> {error}
                  </div>
                )}

                <div className="reset-modal-actions">
                  <button type="button" onClick={close} className="btn btn-secondary" disabled={pending}>
                    ยกเลิก
                  </button>
                  <button type="submit" className="login-submit" disabled={pending} style={{ flex: 1 }}>
                    {pending ? (
                      <><i className="ri-loader-4-line login-spinner"></i> กำลังบันทึก...</>
                    ) : (
                      <>บันทึกรหัสใหม่</>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h2 className="reset-modal-title" style={{ color: 'var(--success)' }}>
                  <i className="ri-checkbox-circle-line"></i> รีเซ็ตสำเร็จ
                </h2>
                <p className="reset-modal-sub">
                  รหัสใหม่ของ <strong>{userName}</strong> คือ:
                </p>
                <div className="reset-modal-newpw">
                  <code>{successPw}</code>
                </div>
                <p className="reset-modal-warn">
                  <i className="ri-information-line"></i>
                  แจ้งรหัสนี้ให้พนักงาน — ดูย้อนหลังได้ที่คอลัมน์ “รหัสผ่าน” ในตาราง
                </p>
                <div className="reset-modal-actions">
                  <button type="button" onClick={close} className="login-submit" style={{ flex: 1 }}>
                    เข้าใจแล้ว
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
