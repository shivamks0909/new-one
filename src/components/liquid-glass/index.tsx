'use client';

import React from 'react';

export interface LiquidGlassOptions {
  cornerRadius?: number;
  shadowRadius?: number;
  borderOpacity?: number;
  sheen?: boolean;
}

/**
 * Returns the exact LiquidGlass CSS classes and inline styles
 * based on LiquidGlassKit's Swift 6 .ultraThinMaterial specs.
 */
export function getLiquidGlassStyle(options: LiquidGlassOptions = {}) {
  const {
    cornerRadius = 24,
    shadowRadius = 10,
    borderOpacity = 0.35,
  } = options;

  return {
    borderRadius: `${cornerRadius}px`,
    boxShadow: `0 5px ${shadowRadius}px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, ${borderOpacity})`,
    border: `1px solid rgba(255, 255, 255, ${borderOpacity})`,
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  } as React.CSSProperties;
}

/**
 * LiquidGlassCard: Port of LiquidGlassKit's LiquidGlassCard
 */
export interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  cornerRadius?: number;
  shadowRadius?: number;
  children: React.ReactNode;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  title,
  subtitle,
  cornerRadius = 24,
  shadowRadius = 10,
  children,
  className = '',
  style,
  ...props
}) => {
  const glassStyle = getLiquidGlassStyle({ cornerRadius, shadowRadius });

  return (
    <div
      className={`relative overflow-hidden p-5 transition-all duration-300 ${className}`}
      style={{ ...glassStyle, ...style }}
      {...props}
    >
      {/* Top Gloss Sheen Reflection */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
        style={{ borderTopLeftRadius: cornerRadius, borderTopRightRadius: cornerRadius }}
      />

      {(title || subtitle) && (
        <div className="relative z-10 mb-4 flex flex-col gap-1">
          {title && <h3 className="font-semibold text-slate-900 text-lg tracking-tight">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
};

/**
 * LiquidGlassButton: Port of LiquidGlassKit's LiquidGlassButton
 */
export interface LiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title?: string;
  icon?: React.ReactNode;
  cornerRadius?: number;
  children?: React.ReactNode;
}

export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  title,
  icon,
  cornerRadius = 16,
  children,
  className = '',
  style,
  ...props
}) => {
  const glassStyle = getLiquidGlassStyle({ cornerRadius, shadowRadius: 6, borderOpacity: 0.4 });

  return (
    <button
      type="button"
      className={`relative inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-slate-900 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] select-none ${className}`}
      style={{ ...glassStyle, ...style }}
      {...props}
    >
      {/* Top Gloss Reflection */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent"
        style={{ borderTopLeftRadius: cornerRadius, borderTopRightRadius: cornerRadius }}
      />
      {icon && <span className="relative z-10">{icon}</span>}
      <span className="relative z-10">{title || children}</span>
    </button>
  );
};

export default LiquidGlassCard;
