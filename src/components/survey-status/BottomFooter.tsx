'use client';

import { OutcomeConfig } from '../../lib/survey/outcome-config';

interface BottomFooterProps {
  config: OutcomeConfig;
}

export function BottomFooter({ config }: BottomFooterProps) {
  return (
    <footer className="mt-1 flex w-full items-center justify-between pt-3 border-t border-slate-200/60 select-none">
      {/* Left Brand Mark */}
      <div className="flex items-center gap-1.5">
        <img
          src="/brand-logo.png"
          alt="Opinion Insights"
          className="h-4 w-4 object-contain rounded-xs"
        />
        <span className="text-[11px] font-extrabold tracking-wider text-slate-800 uppercase">
          OPINION INSIGHTS
        </span>
      </div>

      {/* Right Handwritten Script with Rotated Accent & Underline */}
      <div className="relative flex flex-col items-end">
        <span
          className="text-[13.5px] font-semibold tracking-wide italic transition-transform hover:scale-105 duration-200"
          style={{
            fontFamily:
              'Caveat, "Brush Script MT", "Comic Sans MS", "Bradley Hand", cursive',
            color: config.accentText,
            transform: 'rotate(-2.5deg)',
          }}
        >
          {config.handwritten}
        </span>
        {/* Subtle wavy or curved underline accent */}
        <svg
          className="w-16 h-1.5 opacity-70 -mt-0.5"
          viewBox="0 0 100 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 7C25 2 75 11 98 6"
            stroke={config.accent}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </footer>
  );
}
