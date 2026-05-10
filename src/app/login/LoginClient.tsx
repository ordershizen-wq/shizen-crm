'use client';

import { useState, useTransition } from 'react';

type Option = {
  id: string;
  fullName: string;
  role: 'ADMIN' | 'LEADER' | 'MEMBER';
  team: { id: string; name: string; color: string | null } | null;
};

const ROLE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  ADMIN:  { label: 'ผู้ดูแลระบบ', icon: 'ri-shield-star-fill', color: '#8b5cf6', bg: '#ede9fe' },
  LEADER: { label: 'หัวหน้าทีม',  icon: 'ri-user-star-fill',   color: '#f59e0b', bg: '#fef3c7' },
  MEMBER: { label: 'เซลส์',       icon: 'ri-user-fill',        color: '#3b82f6', bg: '#dbeafe' },
};

function getInitials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): [string, string] {
  const colors: [string, string][] = [
    ['#2FA084', '#eef2ff'], ['#0891b2', '#cffafe'], ['#059669', '#d1fae5'],
    ['#d97706', '#fef3c7'], ['#dc2626', '#fee2e2'], ['#7c3aed', '#ede9fe'],
  ];
  const i = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length;
  return colors[i];
}

export default function LoginClient({
  options,
  action,
}: {
  options: Option[];
  action: (userId: string) => Promise<void>;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  // แยก admin ออกจาก member/leader
  const admins = options.filter(o => o.role === 'ADMIN');
  const teamMembers = options.filter(o => o.role !== 'ADMIN');

  // รายชื่อทีม (unique)
  const teamsMap = new Map<string, string>();
  for (const u of teamMembers) {
    if (u.team) teamsMap.set(u.team.id, u.team.name);
  }
  const teams = Array.from(teamsMap.entries()); // [id, name][]

  // กรองสมาชิกตามทีมที่เลือก
  const membersInTeam = selectedTeamId
    ? teamMembers.filter(u => u.team?.id === selectedTeamId)
    : [];

  const selectedUser = options.find(o => o.id === selectedUserId);

  function handleTeamChange(teamId: string) {
    setSelectedTeamId(teamId);
    setSelectedUserId('');
  }

  function handleSubmit() {
    if (!selectedUserId) return;
    startTransition(() => { action(selectedUserId); });
  }

  const canSubmit = !!selectedUserId && !isPending;

  return (
    <div className="legacy-body" style={{ minHeight: '100vh', display: 'flex', background: '#f1f5f9' }}>

      {/* ── Left brand panel ── */}
      <div
        className="login-left-panel"
        style={{
          width: '42%', minHeight: '100vh', flexShrink: 0,
          background: 'linear-gradient(160deg, #14342B 0%, #1F6F5F 50%, #2FA084 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '3rem', position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', pointerEvents: 'none' }} />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3.5rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #6FCF97, #2FA084)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', color: '#fff', boxShadow: '0 8px 20px rgba(99,102,241,0.4)',
            }}>
              <i className="ri-leaf-line"></i>
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9' }}>Shizen CRM</span>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: '1rem' }}>
            ระบบจัดการลูกค้า<br />
            <span style={{ color: '#60a5fa' }}>ครบในที่เดียว</span>
          </h2>
          <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.75, maxWidth: 280 }}>
            ติดตามลูกค้า วางแผนรีออเดอร์ และดูแลทีมขายได้อย่างมีประสิทธิภาพ
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {[
            { icon: 'ri-group-2-line',      text: 'จัดการลูกค้าและติดตาม Stage' },
            { icon: 'ri-calendar-2-line',    text: 'ปฏิทินงานและนัดรีออเดอร์' },
            { icon: 'ri-bar-chart-box-line', text: 'แดชบอร์ดยอดขายแบบ Real-time' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#60a5fa', fontSize: '1.1rem', flexShrink: 0,
              }}>
                <i className={f.icon}></i>
              </div>
              <span style={{ fontSize: 13.5, color: '#cbd5e1' }}>{f.text}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: '#475569' }}>© 2025 Shizen CRM · All rights reserved</div>
      </div>

      {/* ── Right login panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
              เข้าสู่ระบบ
            </h1>
            <p style={{ fontSize: 14, color: '#64748b' }}>เลือกทีมและชื่อของคุณ</p>
          </div>

          {/* ── Admin section ── */}
          {admins.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <SectionLabel icon="ri-shield-star-line" color="#8b5cf6" label="Admin" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {admins.map(opt => {
                  const selected = selectedUserId === opt.id;
                  const [avatarColor, avatarBg] = getAvatarColor(opt.fullName);
                  return (
                    <UserCard
                      key={opt.id}
                      opt={opt}
                      selected={selected}
                      avatarColor={avatarColor}
                      avatarBg={avatarBg}
                      onClick={() => setSelectedUserId(selected ? '' : opt.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Divider (ถ้ามีทั้ง admin + team) ── */}
          {admins.length > 0 && teams.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>หรือ</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>
          )}

          {/* ── Team + Member dropdowns ── */}
          {teams.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <SectionLabel icon="ri-team-line" color="#3b82f6" label="เข้าในฐานะสมาชิกทีม" />

              {/* Team dropdown */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                  ทีม
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedTeamId}
                    onChange={e => handleTeamChange(e.target.value)}
                    style={{
                      width: '100%', height: 48,
                      padding: '0 2.5rem 0 1rem',
                      borderRadius: 10,
                      border: `2px solid ${selectedTeamId ? '#2FA084' : '#e2e8f0'}`,
                      background: '#fff',
                      fontSize: 14, fontFamily: 'inherit',
                      color: selectedTeamId ? '#0f172a' : '#94a3b8',
                      cursor: 'pointer', outline: 'none',
                      appearance: 'none',
                      boxShadow: selectedTeamId ? '0 0 0 3px rgba(79,70,229,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 180ms',
                    }}
                  >
                    <option value="">— เลือกทีม —</option>
                    {teams.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                  <i className="ri-arrow-down-s-line" style={{
                    position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    color: '#64748b', fontSize: 18, pointerEvents: 'none',
                  }} />
                </div>
              </div>

              {/* Member dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                  ชื่อ-สกุล
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    disabled={!selectedTeamId}
                    style={{
                      width: '100%', height: 48,
                      padding: '0 2.5rem 0 1rem',
                      borderRadius: 10,
                      border: `2px solid ${selectedUserId && !admins.find(a => a.id === selectedUserId) ? '#2FA084' : '#e2e8f0'}`,
                      background: !selectedTeamId ? '#f8fafc' : '#fff',
                      fontSize: 14, fontFamily: 'inherit',
                      color: selectedUserId ? '#0f172a' : '#94a3b8',
                      cursor: selectedTeamId ? 'pointer' : 'not-allowed',
                      outline: 'none', appearance: 'none',
                      opacity: !selectedTeamId ? 0.6 : 1,
                      boxShadow: selectedUserId && !admins.find(a => a.id === selectedUserId)
                        ? '0 0 0 3px rgba(79,70,229,0.1)'
                        : '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 180ms',
                    }}
                  >
                    <option value="">
                      {selectedTeamId ? '— เลือกชื่อ —' : '— เลือกทีมก่อน —'}
                    </option>
                    {membersInTeam.map(opt => {
                      const roleCfg = ROLE_CONFIG[opt.role];
                      return (
                        <option key={opt.id} value={opt.id}>
                          {opt.fullName} ({roleCfg.label})
                        </option>
                      );
                    })}
                  </select>
                  <i className="ri-arrow-down-s-line" style={{
                    position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    color: '#64748b', fontSize: 18, pointerEvents: 'none',
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Selected user preview ── */}
          {selectedUser && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem 1rem',
              borderRadius: 10,
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              marginBottom: '1.25rem',
              animation: 'fadeIn 0.2s ease',
            }}>
              {(() => {
                const [ac, ab] = getAvatarColor(selectedUser.fullName);
                return (
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: ab, color: ac,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14,
                  }}>
                    {getInitials(selectedUser.fullName)}
                  </div>
                );
              })()}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#14532d' }}>{selectedUser.fullName}</div>
                <div style={{ fontSize: 12, color: '#16a34a' }}>
                  {ROLE_CONFIG[selectedUser.role].label}
                  {selectedUser.team && ` · ${selectedUser.team.name}`}
                </div>
              </div>
              <i className="ri-checkbox-circle-fill" style={{ color: '#16a34a', fontSize: 20 }}></i>
            </div>
          )}

          {/* ── Submit ── */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%', height: 52, borderRadius: 12, border: 'none',
              background: canSubmit
                ? 'linear-gradient(135deg, #2FA084, #1F6F5F)'
                : '#e2e8f0',
              color: canSubmit ? '#fff' : '#94a3b8',
              fontSize: 15, fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: canSubmit ? '0 4px 16px rgba(79,70,229,0.35)' : 'none',
              transition: 'all 200ms', fontFamily: 'inherit',
            }}
          >
            {isPending
              ? <><i className="ri-loader-4-line"></i> กำลังเข้าสู่ระบบ...</>
              : <><i className="ri-login-circle-line"></i> เข้าใช้งาน</>
            }
          </button>

          <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: '1rem' }}>
            <i className="ri-information-line"></i> ยังไม่มีระบบรหัสผ่าน — ใช้ชั่วคราวก่อน
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}

/* ── Sub-components ── */

function SectionLabel({ icon, color, label }: { icon: string; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
      <i className={icon} style={{ color, fontSize: 14 }}></i>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b' }}>
        {label}
      </span>
    </div>
  );
}

function UserCard({ opt, selected, avatarColor, avatarBg, onClick }: {
  opt: Option; selected: boolean;
  avatarColor: string; avatarBg: string;
  onClick: () => void;
}) {
  const roleCfg = ROLE_CONFIG[opt.role] ?? ROLE_CONFIG.MEMBER;
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.75rem 1rem',
        border: `2px solid ${selected ? '#2FA084' : '#e2e8f0'}`,
        borderRadius: 10,
        background: selected ? 'linear-gradient(135deg, #eef2ff, #f5f3ff)' : '#fff',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        transition: 'all 180ms', fontFamily: 'inherit',
        textAlign: 'left', width: '100%',
        boxShadow: selected ? '0 0 0 3px rgba(79,70,229,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: selected ? '#2FA084' : avatarBg,
        color: selected ? '#fff' : avatarColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 14, transition: 'all 180ms',
      }}>
        {opt.fullName.trim().slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: selected ? '#1F6F5F' : '#0f172a' }}>
          {opt.fullName}
        </div>
        <span style={{
          background: roleCfg.bg, color: roleCfg.color,
          fontSize: 11, fontWeight: 600,
          padding: '0.1rem 0.5rem', borderRadius: '9999px',
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}>
          <i className={roleCfg.icon} style={{ fontSize: 10 }}></i> {roleCfg.label}
        </span>
      </div>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${selected ? '#2FA084' : '#e2e8f0'}`,
        background: selected ? '#2FA084' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 180ms',
      }}>
        {selected && <i className="ri-check-line" style={{ color: '#fff', fontSize: 11 }}></i>}
      </div>
    </button>
  );
}
