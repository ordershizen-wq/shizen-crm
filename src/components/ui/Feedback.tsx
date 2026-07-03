'use client';

/**
 * Feedback — Toast + Confirm dialog แบบเบา ไม่มี dependency
 *
 *   const toast = useToast();
 *   toast.success('บันทึกแล้ว');
 *   toast.error('เกิดข้อผิดพลาด');
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'ลบงานนี้?', danger: true })) { ... }
 *
 * ครอบทั้งแอปด้วย <FeedbackProvider> (อยู่ใน AppShell)
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ─────────────── Types ─────────────── */
type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: ToastKind; message: string };

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ToastApi = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);
const ConfirmCtx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

const TOAST_META: Record<ToastKind, { icon: string; cls: string }> = {
  success: { icon: 'ri-checkbox-circle-fill', cls: 'is-success' },
  error: { icon: 'ri-error-warning-fill', cls: 'is-error' },
  info: { icon: 'ri-information-fill', cls: 'is-info' },
};

/* ─────────────── Provider ─────────────── */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const idRef = useRef(0);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);
  const [mounted, setMounted] = useState(false);

  // portal เริ่มหลัง hydrate เสร็จ (กัน SSR/client mismatch)
  useEffect(() => { setMounted(true); }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const toastApi = useRef<ToastApi>({
    success: (m: string) => push('success', m),
    error: (m: string) => push('error', m),
    info: (m: string) => push('info', m),
  }).current;

  const confirm = useCallback((opts: ConfirmOptions) => {
    setConfirmState(opts);
    return new Promise<boolean>(resolve => {
      resolveRef.current = resolve;
    });
  }, []);

  const closeConfirm = (result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setConfirmState(null);
  };

  return (
    <ToastCtx.Provider value={toastApi}>
      <ConfirmCtx.Provider value={confirm}>
        {children}

        {mounted &&
          createPortal(
            <div className="toast-stack" role="status" aria-live="polite">
              {toasts.map(t => {
                const meta = TOAST_META[t.kind];
                return (
                  <div key={t.id} className={`toast-item ${meta.cls}`}>
                    <i className={meta.icon}></i>
                    <span>{t.message}</span>
                  </div>
                );
              })}
            </div>,
            document.body,
          )}

        {mounted &&
          confirmState &&
          createPortal(
            <div className="confirm-overlay" onClick={() => closeConfirm(false)}>
              <div
                className="confirm-box"
                role="alertdialog"
                aria-modal="true"
                onClick={e => e.stopPropagation()}
              >
                <div className={`confirm-icon ${confirmState.danger ? 'danger' : ''}`}>
                  <i className={confirmState.danger ? 'ri-delete-bin-line' : 'ri-question-line'}></i>
                </div>
                <h3 className="confirm-title">{confirmState.title}</h3>
                {confirmState.message && <p className="confirm-msg">{confirmState.message}</p>}
                <div className="confirm-actions">
                  <button className="btn btn-secondary" onClick={() => closeConfirm(false)}>
                    {confirmState.cancelLabel ?? 'ยกเลิก'}
                  </button>
                  <button
                    className={`btn ${confirmState.danger ? 'btn-danger' : 'btn-primary'}`}
                    onClick={() => closeConfirm(true)}
                    autoFocus
                  >
                    {confirmState.confirmLabel ?? 'ยืนยัน'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

/* ─────────────── Hooks ─────────────── */
export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast ต้องอยู่ภายใน <FeedbackProvider>');
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm ต้องอยู่ภายใน <FeedbackProvider>');
  return ctx;
}
