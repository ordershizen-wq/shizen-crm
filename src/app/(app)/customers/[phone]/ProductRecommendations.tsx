type Product = {
  id: string; name: string; shortDesc: string | null;
  targetProblems: unknown; contraindications: unknown;
  gradeMatch: string; isActive: boolean;
};

type RecommendResult = {
  product: Product;
  matchedProblems: string[];
  score: number;
  alreadyBuying: boolean;
  hasContraindication: boolean;
  contraNotes: string[];
};

const GRADE_COLOR: Record<string, { color: string; bg: string }> = {
  A:  { color: '#10b981', bg: '#d1fae5' },
  B:  { color: '#f59e0b', bg: '#fef3c7' },
  C:  { color: '#ef4444', bg: '#fee2e2' },
};

function toArr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function matches(a: string, b: string) {
  const na = normalize(a), nb = normalize(b);
  return na.includes(nb) || nb.includes(na);
}

export function computeRecommendations(
  products: Product[],
  healthConditions: string[],
  grade: string | null,
  recentProductNames: string[],
): RecommendResult[] {
  return products
    .filter(p => p.isActive)
    .map(p => {
      const targets = toArr(p.targetProblems);
      const contras = toArr(p.contraindications);

      // ตรวจว่า match กับ health conditions ไหม
      const matchedProblems = healthConditions.filter(cond =>
        targets.some(t => matches(cond, t))
      );

      // ตรวจ contraindications
      const contraNotes = healthConditions.filter(cond =>
        contras.some(c => matches(cond, c))
      );
      const hasContraindication = contraNotes.length > 0;

      // ตรวจว่า ซื้ออยู่แล้วไหม (fuzzy match ชื่อ)
      const alreadyBuying = recentProductNames.some(n => matches(n, p.name));

      // คะแนน
      let score = matchedProblems.length * 10;

      // Grade bonus
      if (grade && p.gradeMatch !== 'ALL') {
        const gradeList = p.gradeMatch.split(',').map(g => g.trim());
        if (gradeList.includes(grade)) score += 5;
        else score -= 2;
      }

      // ลด score ถ้ามี contraindication
      if (hasContraindication) score -= 20;

      return { product: p, matchedProblems, score, alreadyBuying, hasContraindication, contraNotes };
    })
    .sort((a, b) => {
      // ซื้ออยู่แล้วไปอยู่ท้าย
      if (a.alreadyBuying !== b.alreadyBuying) return a.alreadyBuying ? 1 : -1;
      return b.score - a.score;
    });
}

export default function ProductRecommendations({
  products,
  healthConditions,
  grade,
  recentProductNames,
}: {
  products: Product[];
  healthConditions: string[];
  grade: string | null;
  recentProductNames: string[];
}) {
  const results = computeRecommendations(products, healthConditions, grade, recentProductNames);

  const recommended = results.filter(r => !r.alreadyBuying && r.score > 0 && !r.hasContraindication);
  const buying = results.filter(r => r.alreadyBuying);
  const noMatch = results.filter(r => !r.alreadyBuying && r.score <= 0 && !r.hasContraindication);
  const contraItems = results.filter(r => r.hasContraindication && !r.alreadyBuying);

  if (healthConditions.length === 0 && !grade) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <i className="ri-information-line" style={{ fontSize: 28, marginBottom: 6, display: 'block' }}></i>
        <p style={{ fontSize: 13 }}>กรอก <strong>โรคประจำตัว/อาการ</strong> และ <strong>เกรดลูกค้า</strong> ก่อน<br />ระบบจะแนะนำสินค้าให้อัตโนมัติ</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── แนะนำ ── */}
      {recommended.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
            <i className="ri-sparkling-line"></i> แนะนำให้ลอง ({recommended.length})
          </div>
          {/* Horizontal scroll on mobile */}
          <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
            {recommended.map(r => (
              <RecommendCard key={r.product.id} r={r} grade={grade} />
            ))}
          </div>
        </div>
      )}

      {/* ── ซื้ออยู่แล้ว ── */}
      {buying.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1F6F5F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
            <i className="ri-checkbox-circle-line"></i> ซื้ออยู่แล้ว ({buying.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {buying.map(r => (
              <span key={r.product.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                background: '#E6F4EE', color: '#1F6F5F',
                borderRadius: '9999px', padding: '0.3rem 0.75rem',
                fontSize: 13, fontWeight: 600,
              }}>
                <i className="ri-check-line"></i> {r.product.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── ข้อควรระวัง ── */}
      {contraItems.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
            <i className="ri-alert-line"></i> ควรระวัง / ไม่แนะนำ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {contraItems.map(r => (
              <div key={r.product.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                background: '#fff5f5', border: '1px solid #fecaca',
                borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: 13,
              }}>
                <i className="ri-close-circle-line" style={{ color: '#ef4444', flexShrink: 0 }}></i>
                <span style={{ fontWeight: 600, color: '#7f1d1d' }}>{r.product.name}</span>
                <span style={{ color: '#ef4444', fontSize: 12 }}>— เพราะ: {r.contraNotes.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ไม่มีข้อมูลจับคู่ แต่ไม่ใช่ contraindication ── */}
      {noMatch.length > 0 && recommended.length === 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', paddingTop: '0.25rem' }}>
          <i className="ri-information-line"></i> ยังไม่มีสินค้าที่ตรงกับอาการที่บันทึกไว้
          — ลองเพิ่มข้อมูลโรค/อาการให้ครบกว่านี้
        </div>
      )}
    </div>
  );
}

function RecommendCard({ r, grade }: { r: RecommendResult; grade: string | null }) {
  const gc = grade ? (GRADE_COLOR[grade] ?? null) : null;

  return (
    <div style={{
      minWidth: 200, maxWidth: 220, flexShrink: 0,
      background: '#fff',
      border: '1.5px solid #dbeafe',
      borderRadius: 12,
      padding: '0.875rem',
      boxShadow: '0 2px 8px rgba(79,70,229,0.08)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)', marginBottom: 4 }}>
        {r.product.name}
      </div>
      {r.product.shortDesc && (
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
          {r.product.shortDesc}
        </div>
      )}

      {/* Matched reasons */}
      {r.matchedProblems.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
          {r.matchedProblems.map(m => (
            <span key={m} style={{
              background: '#d1fae5', color: '#059669',
              fontSize: 11, padding: '0.15rem 0.45rem',
              borderRadius: '9999px', fontWeight: 600,
            }}>
              <i className="ri-check-line"></i> {m}
            </span>
          ))}
        </div>
      )}

      {/* Grade match */}
      {gc && r.product.gradeMatch !== 'ALL' && r.product.gradeMatch.includes(grade ?? '') && (
        <div style={{ fontSize: 11, color: gc.color, fontWeight: 600 }}>
          <i className="ri-medal-line"></i> เหมาะกับเกรด {grade}
        </div>
      )}
    </div>
  );
}
