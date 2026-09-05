"use client";

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variantStyles = {
    success: 'badge-live',
    warning: 'badge-paused',
    danger: 'badge-terminated',
    info: 'bg-[rgba(59,130,246,0.12)] text-[#2563EB]',
    neutral: 'badge-draft',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-[11px]',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold uppercase tracking-wider rounded-[var(--radius-nav)] ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
}

const statusVariantMap: Record<string, BadgeProps['variant']> = {
  COMPLETED: 'success',
  COMPLETE: 'success',
  LIVE: 'success',
  ACTIVE: 'success',
  READY: 'success',
  STARTED: 'info',
  IN_PROGRESS: 'info',
  PENDING: 'warning',
  DRAFT: 'neutral',
  PAUSED: 'warning',
  SCREENED_OUT: 'warning',
  QUOTA_FULL: 'warning',
  TERMINATED: 'danger',
  TERMINATE: 'danger',
  FAILED: 'danger',
  ERROR: 'danger',
  EXPIRED: 'danger',
  CLOSED: 'neutral',
  INACTIVE: 'neutral',
  SURVEY_CLOSED: 'neutral',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant = statusVariantMap[status] || 'neutral';
  const label = status.replace(/_/g, ' ');
  return <Badge variant={variant}>{label}</Badge>;
}
