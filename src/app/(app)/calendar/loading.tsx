export default function Loading() {
  return (
    <>
      <div className="flex-between mb-4">
        <div>
          <div className="skeleton skeleton-title" style={{ width: 160, marginBottom: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: 220 }} />
        </div>
      </div>

      <div className="card p-3 mb-3" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton skeleton-pill" style={{ width: 110 }} />
        <div className="skeleton skeleton-title" style={{ width: 140 }} />
        <div className="skeleton skeleton-pill" style={{ width: 110 }} />
      </div>

      {/* calendar grid */}
      <div className="card p-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 84, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    </>
  );
}
