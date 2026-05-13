'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * แถบ progress บางๆ บนสุดของจอ ขณะ route กำลังเปลี่ยน
 *
 * ทำงาน:
 *  - คลิก <a href="..."> ภายใน app  → เริ่มวิ่ง 0 → 90% (trickle)
 *  - pathname เปลี่ยน              → วิ่งถึง 100% แล้วเฟด
 */
export default function RouteProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPathRef = useRef(pathname);

  const stop = () => {
    if (trickleRef.current) {
      clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
  };

  const start = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    stop();
    setVisible(true);
    setProgress(8);
    trickleRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return p;
        const delta = (90 - p) * 0.08 + 0.5;
        return Math.min(90, p + delta);
      });
    }, 200);
  };

  const finish = () => {
    stop();
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  };

  // จับการคลิกลิงก์ภายใน app
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = (e.target as HTMLElement | null)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (target.target && target.target !== '_self') return;
      if (target.hasAttribute('download')) return;

      // เช็คว่าเป็น URL ภายในแอป
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }

      start();
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // จบเมื่อ pathname เปลี่ยน
  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      if (visible) finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => () => { stop(); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #2FA084 0%, #4ade80 50%, #2FA084 100%)',
          boxShadow: '0 0 10px rgba(47,160,132,0.7), 0 0 6px rgba(47,160,132,0.5)',
          transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  );
}
