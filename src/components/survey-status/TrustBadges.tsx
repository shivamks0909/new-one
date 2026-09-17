'use client';

import { Users, BarChart3, Sparkles } from 'lucide-react';
import { OutcomeConfig } from '../../lib/survey/outcome-config';

interface TrustBadgesProps {
  config: OutcomeConfig;
}

export function TrustBadges({ config }: TrustBadgesProps) {
  const badges = [
    {
      icon: Users,
      title: 'Real People',
      subtitle: 'Verified Panels',
    },
    {
      icon: BarChart3,
      title: 'Better Decisions',
      subtitle: 'Accurate Analytics',
    },
    {
      icon: Sparkles,
      title: 'A Brighter Tomorrow',
      subtitle: 'Ethical Insights',
    },
  ];

  return (
    <div className="w-full">
      <div
        className="relative overflow-hidden grid grid-cols-3 divide-x divide-slate-200/50 rounded-2xl p-2 sm:p-2.5 border transition-all duration-300"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderColor: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 8px 25px -4px rgba(15, 23, 42, 0.07), inset 0 1px 0.5px rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Top Gloss Reflection Sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 to-transparent rounded-t-2xl" />

        {badges.map((b, i) => {
          const Icon = b.icon;
          return (
            <div
              key={i}
              className="relative z-10 flex items-center gap-2 px-2.5 py-1 text-left rounded-xl transition-all duration-200 hover:bg-white/50 cursor-default"
            >
              <div
                className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-xs border border-white/80"
                style={{
                  backgroundColor: `${config.accentLight}88`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Icon
                  className="h-3.5 w-3.5"
                  style={{ color: config.accentText }}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[11px] font-bold text-slate-800 leading-tight">
                  {b.title}
                </span>
                <span className="truncate text-[9.5px] font-medium text-slate-400 leading-tight">
                  {b.subtitle}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
