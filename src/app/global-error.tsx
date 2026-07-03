'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Anuphan', sans-serif",
          background: '#0E0E16',
          color: '#EEEDF8',
          padding: '1.5rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(248,113,113,0.14)',
              color: '#F87171',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              margin: '0 auto 1rem',
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 0.5rem' }}>ระบบขัดข้อง</h1>
          <p style={{ fontSize: 14, color: '#9C9AB8', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
            เกิดข้อผิดพลาดร้ายแรง กรุณาลองใหม่อีกครั้ง
          </p>
          <button
            onClick={reset}
            style={{
              background: '#22E5A0',
              color: '#0E0E16',
              border: 'none',
              borderRadius: 10,
              padding: '0.7rem 1.4rem',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ลองใหม่
          </button>
        </div>
      </body>
    </html>
  );
}
