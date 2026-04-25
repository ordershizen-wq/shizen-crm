'use client';

import { useState, useTransition } from 'react';
import { updateCustomerNote } from '@/app/actions';

export default function NoteEditor({ phone, initialNote }: { phone: string; initialNote: string }) {
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await updateCustomerNote(phone, note);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div>
      <textarea
        value={note}
        onChange={e => { setNote(e.target.value); setSaved(false); }}
        className="form-control w-100"
        rows={4}
        placeholder="บันทึกข้อมูลพิเศษของลูกค้า เช่น ชอบสินค้าไหน แพ้อะไร ห้ามโทรช่วงไหน..."
        style={{ resize: 'vertical', lineHeight: 1.6 }}
      />
      <div className="flex-between mt-2">
        <span className="text-sm text-muted" style={{ opacity: saved ? 1 : 0, color: 'var(--success)', transition: 'opacity 0.3s' }}>
          <i className="ri-check-line"></i> บันทึกแล้ว
        </span>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="btn btn-primary"
          style={{ fontSize: 13, padding: '0.4rem 1rem' }}
        >
          {isPending ? <><i className="ri-loader-4-line"></i> กำลังบันทึก...</> : <><i className="ri-save-line"></i> บันทึก</>}
        </button>
      </div>
    </div>
  );
}
