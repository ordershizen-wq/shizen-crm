export default function Loading() {
  return (
    <>
      <div className="flex-between mb-4">
        <div>
          <div className="skeleton skeleton-title" style={{ width: 160, marginBottom: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: 220 }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="flex-between mb-3">
              <div className="skeleton skeleton-title" style={{ width: '60%' }} />
              <div className="skeleton skeleton-pill" style={{ width: 60 }} />
            </div>
            <div className="skeleton skeleton-text" style={{ width: '100%', marginBottom: 6 }} />
            <div className="skeleton skeleton-text" style={{ width: '85%', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <div className="skeleton skeleton-pill" style={{ width: 80 }} />
              <div className="skeleton skeleton-pill" style={{ width: 100 }} />
              <div className="skeleton skeleton-pill" style={{ width: 70 }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
