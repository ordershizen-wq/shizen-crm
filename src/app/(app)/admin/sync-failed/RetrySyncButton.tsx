'use client';

import { useState, useTransition } from 'react';
import { retrySyncAction } from './actions';

export default function RetrySyncButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<'ok' | 'err' | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleClick = () => {
    setDone(null);
    setErrMsg(null);
    startTransition(async () => {
      const res = await retrySyncAction(orderId);
      if (res.ok) {
        setDone('ok');
      } else {
        setDone('err');
        setErrMsg(res.error);
      }
    });
  };

  if (done === 'ok') {
    return (
      <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>
        <i className="ri-check-line"></i> sync แล้ว
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="btn btn-primary"
        style={{ padding: '0.35rem 0.7rem', fontSize: 12, opacity: pending ? 0.6 : 1 }}
      >
        {pending
          ? (<><i className="ri-loader-4-line ri-spin"></i> กำลังลอง...</>)
          : (<><i className="ri-refresh-line"></i> Retry</>)}
      </button>
      {done === 'err' && errMsg && (
        <span style={{ fontSize: 11, color: 'var(--danger)', maxWidth: 160 }}>{errMsg.slice(0, 80)}</span>
      )}
    </div>
  );
}
