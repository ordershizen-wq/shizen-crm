import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          maxWidth: 460,
          background: 'var(--bg-card)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--primary-tint)',
            color: 'var(--primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 34,
            margin: '0 auto 1rem',
          }}
        >
          <i className="ri-compass-3-line"></i>
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 0.5rem' }}>
          ไม่พบหน้าที่คุณค้นหา
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 1.5rem' }}>
          หน้านี้อาจถูกย้าย ลบ หรือลิงก์ไม่ถูกต้อง
        </p>

        <Link href="/" className="btn btn-primary" style={{ fontSize: 13.5 }}>
          <i className="ri-home-4-line"></i> กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}
