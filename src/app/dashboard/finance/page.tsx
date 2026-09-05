"use client";

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { apiClient, getAuthToken } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

interface FinanceRow {
  vendor_id: string;
  vendor_name: string;
  study_name: string;
  completes: number;
  revenue_cents: number;
  cost_cents: number;
  margin_cents: number;
  margin_pct?: number;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function FinancePage() {
  const { user, isAuthenticated, isLoading: authLoading, role, vendor_id } = useAuthState();
  const { showToast } = useToast();
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribe(() => {});
    checkAuth();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFinance();
    }
  }, [isAuthenticated]);

  const loadFinance = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ data: FinanceRow[] }>('/exports/finance');
      setRows(data.data || []);
    } catch (err) {
      showToast('Failed to load finance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/exports/finance?format=csv', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Finance export downloaded', 'success');
    } catch (err) {
      showToast('Failed to download export', 'error');
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
      title="Finance"
      subtitle="Revenue, cost, and margin analysis"
      actions={
        <Button variant="primary" onClick={downloadCsv}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
         </svg>
          Download CSV
       </Button>
      }
    >
      {loading ? (
        <div className="animate-pulse">
          <div className="h-64 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]" />
     </div>
      ) : (
        <DataTable
          columns={[
            { key: 'vendor_name', header: 'Vendor' },
            { key: 'study_name', header: 'Study' },
            { key: 'completes', header: 'Completes', className: 'tabular-nums' },
            { key: 'revenue_cents', header: 'Revenue', render: (row) => formatCurrency(row.revenue_cents) },
            { key: 'cost_cents', header: 'Cost', render: (row) => formatCurrency(row.cost_cents) },
            { key: 'margin_cents', header: 'Margin', render: (row) => formatCurrency(row.margin_cents) },
            { key: 'margin_pct', header: 'Margin %', render: (row) => row.margin_pct ? `${row.margin_pct.toFixed(1)}%` : '0%' },
          ]}
          data={rows}
          keyField="vendor_id"
          emptyMessage="No finance data available"
        />
      )}
 </DashboardLayout>
  );
}
