export default function Loading() {
  return (
    <>
      <div className="flex-between mb-4">
        <div>
          <div className="skeleton skeleton-title" style={{ width: 180, marginBottom: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: 100 }} />
        </div>
      </div>

      <div className="card p-3 mb-4" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-pill" style={{ width: 90 + (i % 3) * 20 }} />
        ))}
      </div>

      <div className="skeleton mb-3" style={{ height: 44, borderRadius: 999 }} />

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    </>
  );
}
