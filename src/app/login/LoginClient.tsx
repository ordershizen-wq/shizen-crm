'use client';

import { useState, useTransition } from 'react';

type Option = {
  id: string;
  fullName: string;
  role: 'ADMIN' | 'LEADER' | 'MEMBER';
  team: { id: string; name: string; color: string | null } | null;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin — เห็นข้อมูลทุกทีม',
  LEADER: 'หัวหน้าทีม — เห็นข้อมูลทั้งทีม',
  MEMBER: 'เซลส์ — เห็นลูกค้าของตัวเอง',
};

const ROLE_ICON: Record<string, string> = {
  ADMIN: 'ri-shield-star-line',
  LEADER: 'ri-user-star-line',
  MEMBER: 'ri-user-line',
};

export default function LoginClient({
  options,
  action,
}: {
  options: Option[];
  action: (userId: string) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!selectedId) return;
    startTransition(() => { action(selectedId); });
  };

  // Group by team
  const grouped = new Map<string, Option[]>();
  for (const opt of options) {
    const key = opt.role === 'ADMIN' ? '__admin__' : (opt.team?.name ?? '__none__');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(opt);
  }

  return (
    <div className="legacy-body" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 1rem', borderRadius: '50%',
            background: 'linear-gradient(135deg, #4e73df, #2e59d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '1.75rem',
          }}>
            <i className="ri-customer-service-2-line"></i>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
            CRM Shizen
          </h1>
          <p className="text-muted text-sm">เลือกชื่อของคุณเพื่อเข้าใช้งาน</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {Array.from(grouped.entries()).map(([group, members]) => (
            <div key={group}>
              <div className="text-sm fw-600" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 11 }}>
                {group === '__admin__' ? 'Admin' : group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {members.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedId(opt.id)}
                    style={{
                      padding: '0.85rem 1.25rem',
                      border: `2px solid ${selectedId === opt.id ? 'var(--primary)' : 'var(--border-light)'}`,
                      borderRadius: 10,
                      background: selectedId === opt.id ? 'var(--blue-light)' : '#fff',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      transition: 'all 0.15s', fontFamily: 'inherit', textAlign: 'left', width: '100%',
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: selectedId === opt.id ? 'var(--primary)' : 'var(--bg-app)',
                      color: selectedId === opt.id ? '#fff' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                      transition: 'all 0.15s',
                    }}>
                      <i className={ROLE_ICON[opt.role] ?? 'ri-user-line'}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: 14 }}>{opt.fullName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{ROLE_LABEL[opt.role]}</div>
                    </div>
                    {selectedId === opt.id && (
                      <i className="ri-check-line" style={{ color: 'var(--primary)', fontSize: 18 }}></i>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedId || isPending}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.85rem', fontSize: 14, opacity: !selectedId || isPending ? 0.5 : 1 }}
        >
          {isPending
            ? <><i className="ri-loader-4-line"></i> กำลังเข้าสู่ระบบ...</>
            : <><i className="ri-login-circle-line"></i> เข้าใช้งาน</>}
        </button>
        <p className="text-sm text-muted text-center" style={{ marginTop: '1rem' }}>
          ยังไม่มีระบบรหัสผ่าน — ใช้ชั่วคราวก่อน
        </p>
      </div>
    </div>
  );
}
