export default function Loading() {
  return (
    <>
      <div className="flex-between mb-4">
        <div>
          <div className="skeleton skeleton-title" style={{ width: 160, marginBottom: 8 }} />
          <div className="skeleton skeleton-text"  style={{ width: 220 }} />
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="flex-between mb-3">
              <div className="skeleton skeleton-text" style={{ width: 90 }} />
              <div className="skeleton skeleton-avatar" style={{ width: 36, height: 36 }} />
            </div>
            <div className="skeleton skeleton-title" style={{ width: 130, height: 28 }} />
            <div className="skeleton skeleton-text" style={{ width: 160, marginTop: 8 }} />
          </div>
        ))}
      </div>

      {/* Chart + list */}
      <div className="card p-4 mb-4" style={{ height: 260 }}>
        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)' }} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem' }}>
          <div className="skeleton skeleton-title" style={{ width: 140 }} />
        </div>
        <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    </>
  );
}
