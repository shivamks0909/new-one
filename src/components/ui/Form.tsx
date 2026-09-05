"use client";

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-[var(--text-secondary)] tracking-wide"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          px-3.5 py-2.5
          bg-[var(--bg-tertiary)]
          border border-[var(--glass-border)]
          rounded-[var(--radius-sm)]
          text-[var(--text-primary)]
          placeholder:text-[var(--text-muted)]
          text-sm
          transition-all duration-150
          focus-visible:outline-none
          focus-visible:border-[var(--accent-1)]
          focus-visible:ring-2 focus-visible:ring-[var(--accent-1)] focus-visible:ring-opacity-15
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-[var(--color-danger)] focus-visible:border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]' : ''}
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="text-xs text-[var(--text-muted)]">
          {helperText}
        </p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  helperText,
  options,
  className = '',
  id,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-[var(--text-secondary)] tracking-wide"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          px-3.5 py-2.5
          bg-[var(--bg-tertiary)]
          border border-[var(--glass-border)]
          rounded-[var(--radius-sm)]
          text-[var(--text-primary)]
          text-sm
          transition-all duration-150
          focus-visible:outline-none
          focus-visible:border-[var(--accent-1)]
          focus-visible:ring-2 focus-visible:ring-[var(--accent-1)] focus-visible:ring-opacity-15
          disabled:opacity-50 disabled:cursor-not-allowed
          appearance-none
          bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")]
          bg-[right_0.75rem_center]
          bg-no-repeat
          pr-10
          ${error ? 'border-[var(--color-danger)] focus-visible:border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]' : ''}
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${selectId}-helper`} className="text-xs text-[var(--text-muted)]">
          {helperText}
        </p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-medium text-[var(--text-secondary)] tracking-wide"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          px-3.5 py-2.5
          bg-[var(--bg-tertiary)]
          border border-[var(--glass-border)]
          rounded-[var(--radius-sm)]
          text-[var(--text-primary)]
          placeholder:text-[var(--text-muted)]
          text-sm
          transition-all duration-150
          focus-visible:outline-none
          focus-visible:border-[var(--accent-1)]
          focus-visible:ring-2 focus-visible:ring-[var(--accent-1)] focus-visible:ring-opacity-15
          disabled:opacity-50 disabled:cursor-not-allowed
          resize-y min-h-[80px]
          font-inherit
          ${error ? 'border-[var(--color-danger)] focus-visible:border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]' : ''}
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${textareaId}-error`} className="text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${textareaId}-helper`} className="text-xs text-[var(--text-muted)]">
          {helperText}
        </p>
      )}
    </div>
  );
}

export function FormRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {children}
    </div>
  );
}
