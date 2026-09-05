import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md', ...props }: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`bg-white border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
