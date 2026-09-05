"use client";

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, FormRow } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  vendor_id: string | null;
  vendor_name: string | null;
  vendor_code: string | null;
  last_login_at: string | null;
  created_at: string;
}

interface Vendor {
  id: string;
  name: string;
  vendor_code: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminUsersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', vendor_id: '', role: 'VENDOR' });
  const [creating, setCreating] = useState(false);
  const [resetModal, setResetModal] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' });
  const [resetPassword, setResetPassword] = useState('');

  useEffect(() => {
    const unsubscribe = subscribe(() => {});
    checkAuth();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, vendorsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: { users: UserRecord[] } }>('/admin/users'),
        apiClient.get<{ success: boolean; vendors: Vendor[] }>('/vendors'),
      ]);
      setUsers(usersRes.data?.users || usersRes?.data || []);
      setVendors((vendorsRes as any)?.vendors || (vendorsRes as any)?.data || (Array.isArray(vendorsRes) ? vendorsRes : []));
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.email || !form.password) {
      showToast('Email and password are required', 'error');
      return;
    }
    if (form.password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    setCreating(true);
    try {
      await apiClient.post('/admin/users', {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        vendor_id: form.vendor_id || null,
        role: form.role,
      });
      showToast('Vendor account created successfully', 'success');
      setShowCreate(false);
      setForm({ email: '', password: '', full_name: '', vendor_id: '', role: 'VENDOR' });
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create account', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleTerminate = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const action = newStatus === 'SUSPENDED' ? 'terminate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      await apiClient.patch(`/admin/users/${userId}/status`, { status: newStatus });
      showToast(`User ${action}d successfully`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update user', 'error');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      showToast('User deleted successfully', 'success');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete user', 'error');
    }
  };

  const handleLogout = () => logout();

  const handleResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    try {
      await apiClient.post(`/admin/users/${resetModal.userId}/reset-password`, { password: resetPassword });
      showToast('Password reset successfully', 'success');
      setResetModal({ open: false, userId: '', userName: '' });
      setResetPassword('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to reset password', 'error');
    }
  };

  const handleForcePasswordChange = async (userId: string, current: boolean) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/force-password-change`, { force: !current });
      showToast(current ? 'Force password change disabled' : 'User must change password on next login', 'success');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update', 'error');
    }
  };

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
      title="User Management"
      subtitle="Create and manage vendor accounts"
      actions={
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          + Create Vendor Account
        </Button>
      }
    >
      {loading ? (
        <div className="animate-pulse">
          <div className="h-64 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]" />
        </div>
      ) : (
        <>
          <div className="glass-card overflow-hidden animate-slide-up">
            <DataTable
              columns={[
                { key: 'email', header: 'Email' },
                { key: 'full_name', header: 'Name', render: (row) => row.full_name || '\u2014' },
                { key: 'role', header: 'Role', render: (row) => (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--accent-1)] text-white">
                    {row.role}
                  </span>
                )},
                { key: 'vendor_name', header: 'Vendor', render: (row) => row.vendor_name || '\u2014' },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                { key: 'last_login_at', header: 'Last Login', render: (row) => formatDate(row.last_login_at) },
                { key: 'actions', header: 'Actions', render: (row) => (
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setResetModal({ open: true, userId: row.id, userName: row.full_name || row.email })}
                    >
                      Reset PW
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleForcePasswordChange(row.id, (row as any).force_password_change)}
                    >
                      {(row as any).force_password_change ? 'Unforce PW' : 'Force PW'}
                    </Button>
                    <Button
                      variant={row.status === 'ACTIVE' ? 'ghost' : 'primary'}
                      size="sm"
                      onClick={() => handleTerminate(row.id, row.status)}
                    >
                      {row.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(row.id)}
                      className="text-[var(--danger)] hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                )},
              ]}
              data={users}
              keyField="id"
            />
          </div>

          <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Vendor Account">
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="vendor@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              <FormRow>
                <Select
                  label="Role"
                  options={[
                    { value: 'VENDOR', label: 'Vendor' },
                    { value: 'OPERATOR', label: 'Operator' },
                    { value: 'ANALYST', label: 'Analyst' },
                  ]}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
                <Select
                  label="Assign to Vendor"
                  options={[{ value: '', label: 'None' }, ...vendors.map((v) => ({ value: v.id, label: v.name }))]}
                  value={form.vendor_id}
                  onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                />
              </FormRow>
            </div>
            <Modal.Footer>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate} loading={creating}>Create Account</Button>
            </Modal.Footer>
          </Modal>

          {/* Reset Password Modal */}
          <Modal isOpen={resetModal.open} onClose={() => setResetModal({ open: false, userId: '', userName: '' })} title={`Reset Password — ${resetModal.userName}`}>
            <div className="space-y-4">
              <Input
                label="New Password"
                type="password"
                placeholder="At least 8 characters"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                required
              />
            </div>
            <Modal.Footer>
              <Button variant="ghost" onClick={() => setResetModal({ open: false, userId: '', userName: '' })}>Cancel</Button>
              <Button variant="primary" onClick={handleResetPassword}>Reset Password</Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </DashboardLayout>
  );
}
