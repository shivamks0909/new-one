"use client";

import React from 'react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function TopBar({ title, subtitle, actions, breadcrumbs }: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-40 bg-white/80 backdrop-blur-[18px] border-b border-[var(--border)] flex items-center justify-between transition-all duration-200"
      style={{ height: 'var(--topbar-height)', paddingLeft: '32px', paddingRight: '32px' }}
    >
      {/* Left: Title area */}
      <div className="flex items-center gap-4">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-[13px]" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center gap-2">
                {i > 0 && (
                  <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {crumb.href ? (
                  <a href={crumb.href} className="text-[var(--text-muted)] hover:text-[var(--blue)] transition-colors font-medium">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-[var(--text-heading)] font-semibold">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div>
          <h1 className="text-[28px] font-bold text-[var(--text-heading)] tracking-tight leading-none">{title}</h1>
          {subtitle && (
            <p className="text-[13px] text-[#7C889B] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Search + User */}
      <div className="flex items-center gap-4">
        {actions}

        {/* Search Field */}
        <div
          className="relative hidden md:flex items-center"
          style={{ width: '280px', height: '40px' }}
        >
          <svg className="absolute left-3 text-[var(--text-placeholder)]" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-full pl-9 pr-16 text-[13px] text-[var(--text-body)] placeholder-[var(--text-placeholder)] bg-[var(--bg-input)] border border-[var(--border-light)] rounded-[var(--radius-input)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[rgba(22,119,255,0.12)] transition-all duration-150"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] bg-white border border-[var(--border-light)] rounded select-none">
            Ctrl K
          </kbd>
        </div>

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-input)] transition-colors duration-150"
          aria-label="Notifications"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--blue)]" />
        </button>

        {/* User Avatar & Info */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--blue)] font-semibold text-[13px]"
            style={{ background: '#DCEBFF' }}
          >
            A
          </div>
          <div className="hidden lg:block">
            <p className="text-[13px] font-semibold text-[#111827] leading-tight">Admin</p>
            <p className="text-[11px] text-[#8B95A7] leading-tight">Administrator</p>
          </div>
          <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </header>
  );
}
