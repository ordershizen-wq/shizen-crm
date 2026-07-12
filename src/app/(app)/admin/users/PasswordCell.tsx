'use client';

import { useState } from 'react';

/**
 * แสดงรหัสผ่านพนักงานในตารางจัดการผู้ใช้ (ระบบภายใน — เฉพาะ ADMIN เข้าถึงหน้านี้ได้)
 * - null → ยังไม่ตั้งรหัส
 * - bcrypt hash ($2...) จากรหัสที่เคยตั้งผ่านเว็บรุ่นก่อน → ดูค่าจริงไม่ได้
 * - plaintext → กดปุ่มตาเพื่อดู/ซ่อน
 */
export default function PasswordCell({ password }: { password: string | null }) {
  const [shown, setShown] = useState(false);

  if (!password) {
    return <span className="text-muted" style={{ fontSize: 12 }}>— ยังไม่ตั้ง</span>;
  }

  if (password.startsWith('$2')) {
    return <span className="text-muted" style={{ fontSize: 12 }}>ตั้งผ่านเว็บ (ดูไม่ได้)</span>;
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <code style={{ fontFamily: 'monospace', fontSize: 13 }}>
        {shown ? password : '••••••'}
      </code>
      <button
        type="button"
        onClick={() => setShown(s => !s)}
        className="btn"
        style={{
          background: 'var(--bg-app)',
          color: 'var(--text-muted)',
          padding: '0.2rem 0.5rem',
          fontSize: 12,
        }}
        aria-label={shown ? 'ซ่อนรหัส' : 'ดูรหัส'}
      >
        <i className={shown ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
      </button>
    </span>
  );
}
