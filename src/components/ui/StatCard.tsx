"use client";

import React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

export type TrendType = 'up' | 'down' | 'neutral';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  change?: string;
  trendType?: TrendType;
}

export function StatCard({
  label,
  value,
  icon: IconComponent,
  iconBg = 'var(--icon-blue-bg)',
  iconColor = 'var(--blue)',
  change,
  trendType = 'neutral',
}: StatCardProps) {
  const TrendIcon = trendType === 'up' ? ArrowUp : trendType === 'down' ? ArrowDown : Minus;

  return (
    <div className="bg-white border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-[16px_18px] card-hover transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#64748B] truncate">{label}</p>
          <p className="text-[26px] font-bold text-[var(--text-heading)] mt-1 leading-tight tracking-tight">{value}</p>
          {change && (
            <span
              className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                trendType === 'up'
                  ? 'bg-[var(--success-bg)] text-[var(--success)]'
                  : trendType === 'down'
                  ? 'bg-[var(--danger-bg)] text-[var(--danger)]'
                  : 'bg-[var(--bg-input)] text-[var(--text-muted)]'
              }`}
            >
              <TrendIcon className="w-3 h-3" aria-hidden="true" />
              {change}
            </span>
          )}
        </div>
        {IconComponent && (
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg }}
          >
            <IconComponent className="w-[18px] h-[18px]" style={{ color: iconColor }} aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
