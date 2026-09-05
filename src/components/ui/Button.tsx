"use client";

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-semibold rounded-[var(--radius-input)]
    transition-all duration-150 ease-linear
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    active:scale-[0.98]
  `;

  const variantStyles = {
    primary: 'bg-[var(--blue)] text-white hover:bg-[var(--blue-hover)]',
    ghost: 'bg-transparent text-[var(--text-body)] border border-[var(--border)] hover:bg-[var(--bg-input)] hover:text-[var(--text-heading)] hover:border-[#D0D9EA]',
    danger: 'bg-[var(--danger)] text-white hover:bg-[#C41D1D]',
    success: 'bg-[var(--success)] text-white hover:bg-[#138C5A]',
    warning: 'bg-[var(--warning)] text-white hover:bg-[#D68F09]',
  };

  const sizeStyles = {
    sm: 'h-8 px-3 text-[12px]',
    md: 'h-10 px-4 text-[13px]',
    lg: 'h-11 px-6 text-[14px]',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
