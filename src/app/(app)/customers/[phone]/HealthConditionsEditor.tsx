'use client';

import { useState, useTransition, useRef } from 'react';
import { saveHealthConditions } from './actions';

const PRESET_CONDITIONS = [
  'เบาหวาน', 'ความดันสูง', 'ไขมันในเลือดสูง', 'ไทรอยด์',
  'โรคหัวใจ', 'กรดไหลย้อน', 'ข้อเข่าเสื่อม', 'ภูมิแพ้',
  'นิ่วในไต', 'ไขมันพอกตับ', 'ออทิสติก/สมาธิสั้น', 'ซึมเศร้า/วิตกกังวล',
];

export default function HealthConditionsEditor({
  phone,
  initialConditions,
}: {
  phone: string;
  initialConditions: string[];
}) {
  const [conditions, setConditions] = useState<string[]>(initialConditions);
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || conditions.includes(trimmed)) return;
    setConditions(prev => [...prev, trimmed]);
    setInput('');
    setSaved(false);
  };

  const remove = (val: string) => {
    setConditions(prev => prev.filter(c => c !== val));
    setSaved(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(input);
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveHealthConditions({ phone, conditions });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const conditionColor = (c: string) => PRESET_CONDITIONS.includes(c)
    ? { bg: 'var(--blue-light)', color: 'var(--primary)' }
    : { bg: 'var(--purple-light)', color: '#6f42c1' };

  return (
    <div>
      {/* Selected tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: 32, marginBottom: '0.75rem' }}>
        {conditions.length === 0 && (
          <span className="text-sm text-muted">ยังไม่มีข้อมูล</span>
        )}
        {conditions.map(c => {
          const { bg, color } = conditionColor(c);
          return (
            <span key={c} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              background: bg, color, borderRadius: 20,
              fontSize: 12, fontWeight: 600, padding: '0.2rem 0.65rem',
            }}>
              {c}
              <button
                onClick={() => remove(c)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, lineHeight: 1, fontSize: 14 }}
              >×</button>
            </span>
          );
        })}
      </div>

      {/* Custom input */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์โรค/อาการ แล้วกด Enter..."
          className="form-control"
          style={{ flex: 1, fontSize: 13 }}
        />
        <button
          onClick={() => add(input)}
          className="btn btn-secondary"
          style={{ fontSize: 12, whiteSpace: 'nowrap' }}
        >
          <i className="ri-add-line"></i> เพิ่ม
        </button>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
        {PRESET_CONDITIONS.filter(c => !conditions.includes(c)).map(c => (
          <button
            key={c}
            onClick={() => add(c)}
            style={{
              fontSize: 11, padding: '0.2rem 0.6rem', borderRadius: 20,
              border: '1px solid var(--border-light)', background: 'var(--bg-app)',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            + {c}
          </button>
        ))}
      </div>

      <div className="flex-between">
        <span className="text-sm" style={{ opacity: saved ? 1 : 0, color: 'var(--success)', transition: 'opacity 0.3s' }}>
          <i className="ri-check-line"></i> บันทึกแล้ว
        </span>
        <button onClick={handleSave} disabled={isPending} className="btn btn-primary" style={{ fontSize: 13 }}>
          {isPending ? <><i className="ri-loader-4-line"></i> กำลังบันทึก...</> : <><i className="ri-save-line"></i> บันทึก</>}
        </button>
      </div>
    </div>
  );
}
