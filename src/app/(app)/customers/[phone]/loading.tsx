export default function Loading() {
  return (
    <>
      {/* Hero */}
      <div className="card p-4 mb-3" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="skeleton skeleton-avatar" style={{ width: 56, height: 56 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-title" style={{ width: 200, marginBottom: 8 }} />
          <div className="skeleton skeleton-text"  style={{ width: 320 }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-pill" style={{ width: 110, height: 38 }} />
        ))}
      </div>

      {/* Body grid */}
      <div className="customer-profile-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="skeleton skeleton-text" style={{ width: 160, marginBottom: 12 }} />
              <div className="skeleton skeleton-text" style={{ width: '90%', marginBottom: 8 }} />
              <div className="skeleton skeleton-text" style={{ width: '70%' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="skeleton skeleton-text" style={{ width: 130, marginBottom: 12 }} />
              <div className="skeleton skeleton-text" style={{ width: '85%', marginBottom: 8 }} />
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
