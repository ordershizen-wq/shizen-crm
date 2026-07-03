'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ค้นหาลูกค้าแบบสด (debounce 350ms) + ปุ่มล้าง
 * อัปเดต ?q= บน URL โดยคง stage/grade เดิม และรีเซ็ตหน้า (page) เป็น 1
 * รับ filter ปัจจุบันเป็น props (เลี่ยง useSearchParams ที่ต้องมี Suspense)
 */
export default function CustomerSearch({
  initialQuery, stage, grade,
}: {
  initialQuery: string;
  stage?: string;
  grade?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const firstRun = useRef(true);

  useEffect(() => {
    // ข้ามรอบแรก (ค่าเริ่มต้น = URL อยู่แล้ว)
    if (firstRun.current) { firstRun.current = false; return; }

    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (stage && stage !== 'all') params.set('stage', stage);
      if (grade) params.set('grade', grade);
      const q = value.trim();
      if (q) params.set('q', q);
      // คำค้นเปลี่ยน → กลับหน้า 1 (ไม่ใส่ page)
      const qs = params.toString();
      startTransition(() => {
        router.replace(`/customers${qs ? `?${qs}` : ''}`, { scroll: false });
      });
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="search-wrap mb-3" style={{ width: '100%', position: 'relative' }}>
      <i className="ri-search-line"></i>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="ค้นหาชื่อ/เบอร์..."
        className="search-input"
        style={{ width: '100%' }}
        autoComplete="off"
        enterKeyHint="search"
      />
      {isPending && <i className="ri-loader-4-line search-spin" aria-hidden="true"></i>}
      {value && !isPending && (
        <button
          type="button"
          className="search-clear"
          onClick={() => setValue('')}
          aria-label="ล้างคำค้นหา"
        >
          <i className="ri-close-line"></i>
        </button>
      )}
    </div>
  );
}
