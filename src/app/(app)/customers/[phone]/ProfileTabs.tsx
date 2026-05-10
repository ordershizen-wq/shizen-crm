'use client';

import { useState } from 'react';

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

  return (
    <div>
      {/* Tabs nav (sticky) */}
      <div className="profile-tabs-wrap">
        <div className="profile-tabs">
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
