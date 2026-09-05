"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  roles?: string[];
  group: 'FIELDWORK' | 'MANAGEMENT' | 'ANALYTICS' | 'SYSTEM';
}

/* ─── All Icons ───────────────────────────────────────────────────────────── */
function HomeIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function StudyIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
function VendorIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
}
function LinkIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
}
function ResponseIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
function AnalyticsIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function FinanceIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function SurveyIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
}
function QuotaIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>;
}
function UsersIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function AuditIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
function SettingsIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-1.066 2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>;
}

const allNavItems: NavItem[] = [
  // FIELDWORK
  { href: '/dashboard', label: 'Dashboard', icon: <HomeIcon />, group: 'FIELDWORK', roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'ANALYST'] },
  { href: '/dashboard/projects', label: 'Projects', icon: <StudyIcon />, group: 'FIELDWORK', roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'ANALYST'] },
  { href: '/dashboard/surveys', label: 'Surveys', icon: <SurveyIcon />, group: 'FIELDWORK', roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'ANALYST'] },
  { href: '/dashboard/tracking-links', label: 'Tracking Links', icon: <LinkIcon />, group: 'FIELDWORK', roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'ANALYST'] },
  { href: '/dashboard/responses', label: 'Responses', icon: <ResponseIcon />, group: 'FIELDWORK', roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'ANALYST', 'VENDOR'] },
  { href: '/dashboard/quotas', label: 'Quotas', icon: <QuotaIcon />, group: 'FIELDWORK', roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'ANALYST'] },
  // MANAGEMENT
  { href: '/dashboard/vendors', label: 'Vendors', icon: <VendorIcon />, group: 'MANAGEMENT', roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'ANALYST'] },
  { href: '/dashboard/admin-users', label: 'User Management', icon: <UsersIcon />, group: 'MANAGEMENT', roles: ['SUPER_ADMIN', 'ADMIN'] },
  // ANALYTICS
  { href: '/dashboard/analytics', label: 'Analytics', icon: <AnalyticsIcon />, group: 'ANALYTICS', roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'ANALYST'] },
  { href: '/dashboard/finance', label: 'Finance', icon: <FinanceIcon />, group: 'ANALYTICS', roles: ['SUPER_ADMIN', 'ADMIN'] },
  // SYSTEM
  { href: '/dashboard/audit', label: 'Audit Log', icon: <AuditIcon />, group: 'SYSTEM', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/dashboard/settings', label: 'Settings', icon: <SettingsIcon />, group: 'SYSTEM', roles: ['SUPER_ADMIN', 'ADMIN'] },
];

interface SidebarProps {
  user?: { email: string; name?: string; role: string; vendor_id: string | null | undefined };
  isOpen?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

const groupLabels: Record<string, string> = {
  FIELDWORK: 'FIELDWORK',
  MANAGEMENT: 'MANAGEMENT',
  ANALYTICS: 'ANALYTICS',
  SYSTEM: 'SYSTEM',
};

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    if (onLogout) onLogout();
    else logout();
  };

  const userRole = user?.role || 'OPERATOR';
  const navItems = allNavItems.filter(item => !item.roles || item.roles.includes(userRole));

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  // Group nav items
  const groups = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <aside
      className="fixed top-0 left-0 h-screen z-50 bg-white border-r border-[var(--border)] flex flex-col transition-all duration-200 ease-linear"
      style={{ width: 'var(--sidebar-width)' }}
      aria-label="Main navigation"
    >
      {/* Logo Area — 64px height */}
      <div className="flex items-center gap-3 px-5 border-b border-[var(--border)]" style={{ height: '64px', flexShrink: 0 }}>
        <div className="w-8 h-8 rounded-lg bg-[var(--blue)] flex items-center justify-center" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <div className="text-[15px] font-bold text-[var(--text-heading)] leading-tight">Opinion Insights</div>
          <div className="text-[11px] font-medium text-[#7B879A]">CAWI Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mb-4">
            <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8A94A6] select-none">
              {groupLabels[group]}
            </div>
            <ul className="space-y-0.5" role="list">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium transition-all duration-150 ${
                      isActive(item.href)
                        ? 'bg-[var(--blue)] text-white shadow-[var(--shadow-nav-active)]'
                        : 'text-[#475569] hover:bg-[var(--blue-soft)] hover:text-[var(--blue)]'
                    }`}
                    style={{ borderRadius: 'var(--radius-nav)' }}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    {item.badge != null && (
                      <span className="ml-auto px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[var(--blue)] text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom User Profile */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        {user && (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--blue)] font-semibold text-sm flex-shrink-0"
              style={{ background: '#DCEBFF' }}
            >
              {user.name?.[0] || user.email[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#111827] truncate">{user.name || 'Admin'}</p>
              <p className="text-[11px] text-[#8B95A7] truncate">{user.email}</p>
              {user.role && (
                <span className="inline-block mt-0.5 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider rounded bg-[var(--blue-soft)] text-[var(--blue)]">
                  {user.role}
                </span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-[#475569] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors duration-150"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
