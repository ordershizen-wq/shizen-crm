export default function Loading() {
  return (
    <>
      <div className="flex-between mb-4">
        <div>
          <div className="skeleton skeleton-title" style={{ width: 180, marginBottom: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: 100 }} />
        </div>
      </div>

      {/* search */}
      <div className="skeleton mb-3" style={{ height: 44, borderRadius: 999 }} />

      {/* tabs */}
      <div className="card p-3 mb-3" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-pill" style={{ width: 90 + (i % 3) * 20 }} />
        ))}
      </div>

      <div className="card p-3 mb-4" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-pill" style={{ width: 100 }} />
        ))}
      </div>

      {/* customer grid */}
      <div className="customer-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="flex-between mb-3">
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '70%', marginBottom: 6 }} />
                <div className="skeleton skeleton-text" style={{ width: '50%' }} />
              </div>
              <div className="skeleton skeleton-pill" style={{ width: 70 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <div className="skeleton skeleton-text" style={{ width: 60, marginBottom: 4 }} />
                <div className="skeleton skeleton-text" style={{ width: 80, height: 18 }} />
              </div>
              <div>
                <div className="skeleton skeleton-text" style={{ width: 80, marginBottom: 4 }} />
                <div className="skeleton skeleton-text" style={{ width: 60, height: 18 }} />
              </div>
            </div>
            <div className="border-top pt-3" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton skeleton-text" style={{ width: '100%' }} />
              <div className="skeleton skeleton-text" style={{ width: '80%' }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
