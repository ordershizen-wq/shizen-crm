'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // log ไว้ดูใน console / error reporting
    console.error(error);
  }, [error]);

  return (
    <div
      className="card"
      style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        maxWidth: 460,
        margin: '3rem auto',
        background: 'var(--bg-card)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--danger-light)',
          color: 'var(--danger)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 34,
          margin: '0 auto 1rem',
        }}
      >
        <i className="ri-error-warning-line"></i>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 0.5rem' }}>
        เกิดข้อผิดพลาด
      </h3>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 1.5rem' }}>
        ระบบมีปัญหาชั่วคราว ลองใหม่อีกครั้ง หากยังไม่หายให้แจ้งผู้ดูแลระบบ
      </p>

      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={reset} className="btn btn-primary" style={{ fontSize: 13.5 }}>
          <i className="ri-refresh-line"></i> ลองใหม่
        </button>
        <a href="/" className="btn btn-secondary" style={{ fontSize: 13.5 }}>
          <i className="ri-home-4-line"></i> กลับหน้าแรก
        </a>
      </div>

      {error.digest && (
        <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: '1.25rem', fontFamily: 'monospace' }}>
          รหัสอ้างอิง: {error.digest}
        </p>
      )}
    </div>
  );
}
