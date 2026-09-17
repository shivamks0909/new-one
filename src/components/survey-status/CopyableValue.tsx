'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyableValueProps {
  label: string;
  value: string;
  className?: string;
  isFullWidth?: boolean;
}

export function CopyableValue({
  label,
  value,
  className = '',
  isFullWidth = false,
}: CopyableValueProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value || value === '—') return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback if clipboard API denied
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between ${
        isFullWidth ? 'col-span-2' : ''
      } ${className}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-400 select-none">
        {label}
      </span>
      <div className="mt-1 flex items-center justify-between gap-1.5">
        <span
          className="truncate text-[13.5px] font-bold text-slate-800"
          title={value}
        >
          {value || '—'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
          title={copied ? 'Copied!' : 'Copy to clipboard'}
          className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-200/60 hover:text-slate-700 active:scale-90"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600 animate-in zoom-in duration-200" />
          ) : (
            <Copy className="h-3.5 w-3.5 transition-colors" />
          )}
          {copied && (
            <span className="pointer-events-none absolute -top-6 right-0 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-medium text-white shadow-sm animate-fade-in">
              Copied!
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
