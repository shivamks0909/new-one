"use client";

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { logout } from '@/lib/auth';
import { useAuthState } from '@/lib/useAuthState';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  user?: { email: string; name?: string; role: string; vendor_id: string | null | undefined };
  isOpen?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

const VENDOR_ALLOWED_PATHS = ['/dashboard/responses', '/dashboard/vendor'];

export function DashboardLayout({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
  user: userProp,
  onLogout,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, isAuthenticated, isLoading, role: authRole } = useAuthState();

  const user = userProp || (authUser ? { email: authUser.email, name: authUser.name, role: authUser.role, vendor_id: authUser.vendor_id } : undefined);
  const effectiveRole = user?.role || authRole;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (effectiveRole === 'VENDOR' && !VENDOR_ALLOWED_PATHS.some(p => pathname.startsWith(p))) {
      router.replace('/dashboard/vendor');
    }
  }, [pathname, effectiveRole, router]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    if (onLogout) { try { onLogout(); } catch {} }
    logout();
  };

  // Vendor isolation: auto-redirect if vendor navigates to protected page
  useEffect(() => {
    if (effectiveRole === 'VENDOR' && !VENDOR_ALLOWED_PATHS.some(p => pathname.startsWith(p))) {
      router.replace('/dashboard/vendor');
    }
  }, [pathname, effectiveRole, router]);

  if (effectiveRole === 'VENDOR' && !VENDOR_ALLOWED_PATHS.some(p => pathname.startsWith(p))) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] relative z-10 flex items-center justify-center">
        <div className="card p-8 max-w-md text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--danger-bg)' }}>
            <svg width="28" height="28" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-heading)] mb-2">Access Restricted</h2>
          <p className="text-[var(--text-body)] mb-6">Vendor accounts can access the Vendor Workspace and Responses pages.</p>
          <button
            onClick={() => router.push('/dashboard/vendor')}
            className="px-6 py-2.5 bg-[var(--blue)] text-white font-medium rounded-[var(--radius-input)] hover:bg-[var(--blue-hover)] transition-colors duration-150"
          >
            Go to Vendor Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] relative z-10">
      <Sidebar user={user} onLogout={handleLogout} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main
        className="transition-all duration-200 ease-linear min-h-screen flex lg:flex-col lg:ml-[var(--sidebar-width)]"
      >
        <TopBar title={title} subtitle={subtitle} actions={actions} breadcrumbs={breadcrumbs} />
        <div className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <div className="mx-auto" style={{ maxWidth: '1500px' }}>
            {children}
          </div>
        </div>
      </main>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
    </div>
  );
}
