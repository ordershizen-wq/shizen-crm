'use client';

import { useState, useTransition } from 'react';
import { saveCustomerGrade, type ChecklistAnswers } from './actions';

const CHECKLIST = [
  {
    key: 'exercise' as const,
    label: 'การออกกำลังกาย',
    icon: 'ri-run-line',
    options: ['แทบไม่ออกเลย', 'บ้างบางครั้ง', '≥3 ครั้ง/สัปดาห์'],
  },
  {
    key: 'diet' as const,
    label: 'การกินอาหาร',
    icon: 'ri-restaurant-line',
    options: ['กินทุกอย่าง ไม่ระวัง', 'พยายามแต่ไม่สม่ำเสมอ', 'ควบคุมดี หลีกเลี่ยงของทอด/หวาน'],
  },
  {
    key: 'sleep' as const,
    label: 'การนอนหลับ',
    icon: 'ri-moon-line',
    options: ['นอนดึก/น้อยเป็นประจำ', 'ไม่แน่นอน', '≥7 ชั่วโมง สม่ำเสมอ'],
  },
  {
    key: 'water' as const,
    label: 'การดื่มน้ำ',
    icon: 'ri-drop-line',
    options: ['ดื่มน้อยมาก', 'พอประมาณ', '≥8 แก้ว/วัน'],
  },
  {
    key: 'motivation' as const,
    label: 'แรงจูงใจ',
    icon: 'ri-fire-line',
    options: ['อยากผอมแต่ไม่อยากเปลี่ยนพฤติกรรม', 'อยากผอมแต่ลังเล', 'มีเป้าหมายชัด ตั้งใจจริง'],
  },
  {
    key: 'consistency' as const,
    label: 'ความสม่ำเสมอกินอาหารเสริม',
    icon: 'ri-capsule-line',
    options: ['ลืมบ่อย/กินไม่ครบ', 'กินบ้างลืมบ้าง', 'ตรงเวลาทุกวัน'],
  },
] as const;

const GRADE_CONFIG = {
  A: { color: '#1cc88a', bg: 'var(--success-light)', label: 'เกรด A', desc: 'รักสุขภาพ ดูแลตัวเองดี สม่ำเสมอ' },
  B: { color: '#f8961e', bg: 'var(--orange-light)', label: 'เกรด B', desc: 'ดูแลตัวเองบ้างแต่ไม่สม่ำเสมอ' },
  C: { color: '#e74a3b', bg: 'var(--danger-light)', label: 'เกรด C', desc: 'ยังไม่ค่อยดูแลตัวเอง' },
};

type Props = {
  phone: string;
  currentGrade: string | null;
  currentChecklist: ChecklistAnswers | null;
  gradeNote: string | null;
  gradeUpdatedAt: Date | null;
};

export default function GradePanel({ phone, currentGrade, currentChecklist, gradeNote, gradeUpdatedAt }: Props) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<ChecklistAnswers>(
    currentChecklist ?? { exercise: 0, diet: 0, sleep: 0, water: 0, motivation: 0, consistency: 0 }
  );
  const [overrideGrade, setOverrideGrade] = useState<'A' | 'B' | 'C' | null>(null);
  const [note, setNote] = useState(gradeNote ?? '');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalScore = Object.values(answers).reduce((s, v) => s + v, 0 as number);
  const suggestedGrade: 'A' | 'B' | 'C' = totalScore >= 9 ? 'A' : totalScore >= 5 ? 'B' : 'C';
  const finalGrade = overrideGrade ?? suggestedGrade;

  const handleOpen = () => {
    setAnswers(currentChecklist ?? { exercise: 0, diet: 0, sleep: 0, water: 0, motivation: 0, consistency: 0 });
    setOverrideGrade(null);
    setNote(gradeNote ?? '');
    setSaved(false);
    setOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveCustomerGrade({ phone, answers, overrideGrade, gradeNote: note });
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
    });
  };

  const gradeInfo = currentGrade ? GRADE_CONFIG[currentGrade as 'A' | 'B' | 'C'] : null;

  return (
    <>
      {/* Grade display */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {gradeInfo ? (
            <>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: gradeInfo.bg, color: gradeInfo.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800,
              }}>
                {currentGrade}
              </div>
              <div>
                <div className="fw-700" style={{ color: gradeInfo.color }}>{gradeInfo.label}</div>
                <div className="text-sm text-muted">{gradeInfo.desc}</div>
                {gradeUpdatedAt && (
                  <div className="text-sm text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                    ประเมินเมื่อ {new Date(gradeUpdatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              <i className="ri-questionnaire-line" style={{ fontSize: 20, marginRight: 8 }}></i>
              ยังไม่ได้ประเมินเกรด
            </div>
          )}
        </div>
        <button onClick={handleOpen} className="btn btn-secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          <i className="ri-edit-line"></i> {currentGrade ? 'ประเมินใหม่' : 'ประเมินเกรด'}
        </button>
      </div>

      {/* Checklist summary (if graded) */}
      {currentChecklist && currentGrade && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {CHECKLIST.map(c => {
            const score = currentChecklist[c.key];
            const scoreColor = score === 2 ? 'var(--success)' : score === 1 ? 'var(--orange)' : 'var(--danger)';
            return (
              <div key={c.key} style={{
                fontSize: 11, padding: '0.2rem 0.6rem', borderRadius: 12,
                background: score === 2 ? 'var(--success-light)' : score === 1 ? 'var(--orange-light)' : 'var(--danger-light)',
                color: scoreColor,
              }}>
                <i className={c.icon}></i> {c.label}: {score === 2 ? 'ดี' : score === 1 ? 'พอสมควร' : 'น้อย'}
              </div>
            );
          })}
        </div>
      )}

      {gradeNote && (
        <p className="text-sm" style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          <i className="ri-chat-1-line"></i> {gradeNote}
        </p>
      )}

      {/* Modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16,
            padding: '1.5rem', maxWidth: 520, width: '100%',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div className="flex-between mb-4">
              <h2 className="fw-700" style={{ fontSize: 17 }}>
                <i className="ri-medal-line text-primary"></i> ประเมินเกรดลูกค้า
              </h2>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {CHECKLIST.map(item => (
                <div key={item.key}>
                  <div className="fw-600 text-sm mb-2">
                    <i className={item.icon} style={{ marginRight: 6, color: 'var(--primary)' }}></i>
                    {item.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {item.options.map((opt, idx) => {
                      const score = idx as 0 | 1 | 2;
                      const selected = answers[item.key] === score;
                      const optColor = score === 2 ? 'var(--success)' : score === 1 ? 'var(--orange)' : 'var(--danger)';
                      return (
                        <label key={idx} style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          cursor: 'pointer', padding: '0.5rem 0.75rem', borderRadius: 8,
                          background: selected ? (score === 2 ? 'var(--success-light)' : score === 1 ? 'var(--orange-light)' : 'var(--danger-light)') : 'var(--bg-app)',
                          border: `1.5px solid ${selected ? optColor : 'var(--border-light)'}`,
                          transition: 'all 0.15s',
                        }}>
                          <input
                            type="radio"
                            name={item.key}
                            checked={selected}
                            onChange={() => setAnswers(prev => ({ ...prev, [item.key]: score }))}
                            style={{ display: 'none' }}
                          />
                          <span style={{
                            width: 18, height: 18, borderRadius: '50%',
                            border: `2px solid ${selected ? optColor : 'var(--border-light)'}`,
                            background: selected ? optColor : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {selected && <i className="ri-check-line" style={{ fontSize: 10, color: '#fff' }}></i>}
                          </span>
                          <span className="text-sm" style={{ color: selected ? optColor : 'var(--text-dark)' }}>{opt}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: optColor }}>+{score}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Score summary */}
            <div style={{
              background: 'var(--bg-app)', borderRadius: 12,
              padding: '1rem', marginBottom: '1rem',
              border: `2px solid ${GRADE_CONFIG[finalGrade].color}`,
            }}>
              <div className="flex-between">
                <div>
                  <div className="text-sm text-muted">คะแนนรวม</div>
                  <div className="fw-700" style={{ fontSize: 22 }}>{totalScore} / 12</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-sm text-muted">เกรดที่แนะนำ</div>
                  <div className="fw-800" style={{ fontSize: 28, color: GRADE_CONFIG[suggestedGrade].color }}>{suggestedGrade}</div>
                </div>
              </div>

              {/* Override */}
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                <div className="text-sm text-muted mb-2">เซลส์ปรับเกรดเอง (ถ้าต้องการ)</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['A', 'B', 'C'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => setOverrideGrade(overrideGrade === g ? null : g)}
                      style={{
                        flex: 1, padding: '0.4rem', borderRadius: 8, border: '2px solid',
                        borderColor: overrideGrade === g ? GRADE_CONFIG[g].color : 'var(--border-light)',
                        background: overrideGrade === g ? GRADE_CONFIG[g].bg : 'transparent',
                        color: GRADE_CONFIG[g].color, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                {overrideGrade && (
                  <p className="text-sm text-muted mt-1">
                    <i className="ri-information-line"></i> จะบันทึกเป็น เกรด {overrideGrade} (ปรับโดยเซลส์)
                  </p>
                )}
              </div>
            </div>

            {/* Note */}
            <div style={{ marginBottom: '1rem' }}>
              <div className="text-sm fw-600 mb-1">หมายเหตุเพิ่มเติม (ไม่บังคับ)</div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                className="form-control w-100"
                rows={2}
                placeholder="เช่น มีอาการพิเศษ, เป้าหมายระยะสั้น..."
                style={{ resize: 'none' }}
              />
            </div>

            <div className="flex-between">
              <button onClick={() => setOpen(false)} className="btn btn-secondary">ยกเลิก</button>
              <button onClick={handleSave} disabled={isPending} className="btn btn-primary">
                {saved
                  ? <><i className="ri-check-line"></i> บันทึกแล้ว!</>
                  : isPending
                    ? <><i className="ri-loader-4-line"></i> กำลังบันทึก...</>
                    : <><i className="ri-save-line"></i> บันทึกเกรด {finalGrade}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
