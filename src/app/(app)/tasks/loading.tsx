export default function Loading() {
  return (
    <>
      <div className="flex-between mb-4">
        <div>
          <div className="skeleton skeleton-title" style={{ width: 180, marginBottom: 8 }} />
          <div className="skeleton skeleton-text"  style={{ width: 240 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="skeleton skeleton-pill" />
        <div className="skeleton skeleton-pill" style={{ width: 110 }} />
        <div className="skeleton skeleton-pill" style={{ width: 130 }} />
      </div>

      <div className="card p-3 mb-3" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="skeleton skeleton-pill" />
        <div className="skeleton skeleton-pill" />
        <div className="skeleton skeleton-pill" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-row" />
        ))}
      </div>
    </>
  );
}
