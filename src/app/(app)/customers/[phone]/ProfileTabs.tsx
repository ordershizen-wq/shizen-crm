'use client';

import { useState, useRef, useEffect } from 'react';

type Tab = {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  badgeColor?: string;
  content: React.ReactNode;
};

export default function ProfileTabs({ tabs, defaultTab }: { tabs: Tab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const current = tabs.find(t => t.id === active);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const activeEl = strip.querySelector<HTMLElement>('.profile-tab.active');
    if (!activeEl) return;
    // Scroll only the strip horizontally — don't use scrollIntoView (would scroll the page too)
    const target = activeEl.offsetLeft - (strip.clientWidth - activeEl.clientWidth) / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [active]);

  return (
    <div>
      {/* Tabs nav (sticky) */}
      <div className="profile-tabs-wrap">
        <div ref={stripRef} className="profile-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`profile-tab${active === t.id ? ' active' : ''}`}
            >
              <i className={t.icon}></i>
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span
                  className="profile-tab-badge"
                  style={t.badgeColor ? { background: t.badgeColor } : undefined}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content with simple fade animation per tab */}
      <div key={active} className="profile-tab-panel fade-in">
        {current?.content}
      </div>
    </div>
  );
}
