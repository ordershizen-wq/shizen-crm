'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import NewOrderForm from '@/app/(app)/orders/new/NewOrderForm';
import { useConfirm } from './ui/Feedback';

type Props = {
  open: boolean;
  phone?: string;
  productSuggestions: string[];
  onClose: () => void;
};

export default function QuickOrderModal({ open, phone, productSuggestions, onClose }: Props) {
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();

  const [dirty, setDirty] = useState(false);
  const submittedRef = useRef(false);
  const confirmingRef = useRef(false);
  const pathRef = useRef(pathname);

  const handleDirtyChange = useCallback((d: boolean) => setDirty(d), []);
  const handleSuccess = useCallback(() => { submittedRef.current = true; setDirty(false); }, []);

  const requestClose = useCallback(async () => {
    if (confirmingRef.current) return;
    if (dirty) {
      confirmingRef.current = true;
      const ok = await confirm({
        title: 'ปิดหน้าต่างลงออเดอร์?',
        message: 'ข้อมูลที่กรอกไว้ยังไม่ถูกบันทึก และจะหายทั้งหมด',
        confirmLabel: 'ปิดและล้างข้อมูล',
        cancelLabel: 'กรอกต่อ',
        danger: true,
      });
      confirmingRef.current = false;
      if (!ok) return;
    }
    if (submittedRef.current) router.refresh();
    onClose();
  }, [dirty, confirm, onClose, router]);

  // รีเซ็ตสถานะทุกครั้งที่เปิด modal ใหม่ (instance เดิมอยู่ตลอด — ตัว modal แค่ return null ตอนปิด)
  useEffect(() => {
    if (open) {
      submittedRef.current = false;
      confirmingRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ตั้งใจรีเซ็ต dirty ครั้งเดียวตอนเปิด modal ใหม่
      setDirty(false);
    }
  }, [open]);

  // Esc ปิด (ผ่าน guard) — capture phase ดักก่อน Esc ของ HeaderSearch
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); void requestClose(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, requestClose]);

  // lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ปิดอัตโนมัติเมื่อ route เปลี่ยน (success panel มี Link นำทางออก)
  useEffect(() => {
    if (pathname !== pathRef.current) {
      pathRef.current = pathname;
      if (open) onClose();
    }
  }, [pathname, open, onClose]);

  if (!open) return null;

  return (
    <div className="quick-order-overlay" onClick={() => void requestClose()}>
      <div
        className="quick-order-modal"
        role="dialog"
        aria-modal="true"
        aria-label="ลงออเดอร์"
        onClick={e => e.stopPropagation()}
      >
        <div className="quick-order-header">
          <h3 className="fw-700" style={{ fontSize: 16, margin: 0, color: 'var(--text-dark)' }}>
            <i className="ri-add-circle-line text-primary"></i> ลงออเดอร์
          </h3>
          <button type="button" className="quick-order-close" onClick={() => void requestClose()} aria-label="ปิด">
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="quick-order-body">
          <NewOrderForm
            embedded
            initialPhone={phone}
            productSuggestions={productSuggestions}
            onDirtyChange={handleDirtyChange}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
}
