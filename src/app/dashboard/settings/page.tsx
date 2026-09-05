"use client";

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = subscribe(() => {});
    checkAuth();
    return unsubscribe;
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.currentPassword) e.currentPassword = 'Current password is required';
    if (!form.newPassword) e.newPassword = 'New password is required';
    else if (form.newPassword.length < 8) e.newPassword = 'Must be at least 8 characters';
    if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      showToast('Password changed successfully. Please log in again.', 'success');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => logout(), 2000);
    } catch (err: any) {
      const msg = err?.message || 'Failed to change password';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => logout();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--glass-border)] border-t-[var(--accent-1)]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout
      user={user ? { email: user.email, name: user.name, role: user.role, vendor_id: user.vendor_id } : undefined}
      onLogout={handleLogout}
      title="Settings"
      subtitle="Manage your account settings"
    >
      <div className="max-w-xl animate-slide-up">
        <div className="glass-card p-6 sm:p-8">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Change Password
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              error={errors.currentPassword}
              required
              autoComplete="current-password"
            />

            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 characters"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              error={errors.newPassword}
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              error={errors.confirmPassword}
              required
              autoComplete="new-password"
            />

            <div className="pt-2">
              <Button type="submit" loading={loading}>
                Update Password
              </Button>
            </div>
          </form>
        </div>

        <div className="glass-card p-6 sm:p-8 mt-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent-2)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Account Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-[var(--glass-border)]">
              <span className="text-sm text-[var(--text-muted)]">Email</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[var(--glass-border)]">
              <span className="text-sm text-[var(--text-muted)]">Role</span>
              <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-[var(--accent-1)] text-white">
                {user?.role}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-[var(--text-muted)]">User ID</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--accent-1)] select-all">
                {user?.id || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
