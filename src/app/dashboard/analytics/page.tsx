"use client";

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

interface Funnel {
  total_sessions: number;
  completed: number;
  fake_clicks?: number;
}

interface ByStudy {
  study_name?: string;
  study_id?: string;
  sessions_started?: number;
  sessions_completed?: number;
  conversion_rate?: number;
}

interface ByVendor {
  vendor_name?: string;
  vendor_id?: string;
  sessions_count?: number;
  completes?: number;
  avg_cpi_cents?: number;
}

function formatNumber(n: number) {
  if (!n) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function AnalyticsPage() {
  const { user, isAuthenticated, isLoading: authLoading, role, vendor_id } = useAuthState();
  const { showToast } = useToast();
  const [funnel, setFunnel] = useState<Funnel>({ total_sessions: 0, completed: 0 });
  const [byStudy, setByStudy] = useState<ByStudy[]>([]);
  const [byVendor, setByVendor] = useState<ByVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [trafficFilter, setTrafficFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  useEffect(() => {
    const unsubscribe = subscribe(() => {});
    checkAuth();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAnalytics();
    }
  }, [isAuthenticated]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [funnelRes, byStudyRes, byVendorRes] = await Promise.all([
        apiClient.get<any>('/analytics/funnel?verified=' + trafficFilter),
        apiClient.get<any>('/analytics/by-study?verified=' + trafficFilter),
        apiClient.get<any>('/analytics/by-vendor?verified=' + trafficFilter),
      ]);

      setFunnel({
        total_sessions: funnelRes?.total_sessions || 0,
        completed: funnelRes?.completed || 0,
        fake_clicks: funnelRes?.fake_clicks,
      });
      setByStudy(byStudyRes?.analytics || byStudyRes?.data || []);
      setByVendor(byVendorRes?.analytics || byVendorRes?.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load analytics', 'error');
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

  const conversionRate = funnel.total_sessions
    ? ((funnel.completed / funnel.total_sessions) * 100).toFixed(1)
    : '0';

  // Determine filter labels and descriptions
  const filterLabels = {
    all: { label: 'All Traffic', desc: 'Combined verified and unverified' },
    verified: { label: 'Verified', desc: 'Only traffic from valid tracking sessions' },
    unverified: { label: 'Unverified', desc: 'Direct callbacks and invalid sessions' },
  };

  return (
    <DashboardLayout
      user={user ? { email: user.email, name: user.name, role: user.role, vendor_id: user.vendor_id } : undefined}
      onLogout={handleLogout}
      title="Fieldwork Analytics & Funnels"
      subtitle="Comprehensive throughput analysis across studies and vendor panel traffic"
    >
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)]" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-64 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]" />
            <div className="h-64 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]" />
          </div>
        </div>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex border-b border-[var(--border)] mb-6">
            {(['all', 'verified', 'unverified'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setTrafficFilter(opt)}
                className={`flex-1 py-2 text-[12px] font-semibold rounded-t-[7px] transition-all ${
                  trafficFilter === opt
                    ? 'bg-white text-[var(--text-heading)] shadow-sm border-b'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-body)] border-b'
                }`}
              >
                {opt === 'all' ? 'All Traffic' : opt === 'verified' ? '✓ Verified' : '✗ Unverified'}
              </button>
            ))}
          </div>

          {/* Top Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Total Traffic (Sessions)"
              value={formatNumber(funnel.total_sessions)}
              change="Total entry clicks initiated"
              type="accent"
            />
            <StatCard
              label="Completed (Qualified)"
              value={formatNumber(funnel.completed)}
              change="Successful interview completes"
              type="success"
            />
            <StatCard
              label="Global Conversion (IR)"
              value={`${conversionRate}%`}
              change="Overall incidence / qualification rate"
              type="warning"
            />
          </div>

          {trafficFilter === 'unverified' && (
            <StatCard
              label="Unverified Clicks"
              value={formatNumber(funnel.fake_clicks || 0)}
              change="Direct/invalid callbacks"
              type="warning"
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Study Table */}
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-[var(--text-primary)]">Conversion by Study</h3>
                <span className="text-xs text-[var(--text-muted)]">{byStudy.length} Active Studies</span>
              </div>
              <DataTable
                columns={[
                  {
                    key: 'study',
                    header: 'Study Title',
                    render: (row: ByStudy) => (
                      <div className="flex flex-col py-1">
                        <span className="font-semibold text-sm text-[var(--text-primary)]">
                          {row.study_name || 'Direct Study'}
                        </span>
                        {row.study_id && (
                          <span className="font-mono text-[11px] text-[var(--text-muted)] select-all">
                            {row.study_id}
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'sessions_started',
                    header: 'Started',
                    render: (row: ByStudy) => (
                      <span className="font-mono text-sm">{row.sessions_started ?? 0}</span>
                    ),
                  },
                  {
                    key: 'sessions_completed',
                    header: 'Completes',
                    render: (row: ByStudy) => (
                      <span className="font-mono text-sm font-bold text-emerald-400">{row.sessions_completed ?? 0}</span>
                    ),
                  },
                  {
                    key: 'conversion_rate',
                    header: 'IR Rate',
                    render: (row: ByStudy) => {
                      const rate = row.conversion_rate != null ? Number(row.conversion_rate).toFixed(1) : '0.0';
                      return (
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--accent-1)]">
                          {rate}%
                        </span>
                      );
                    },
                  },
                ]}
                data={byStudy}
                keyField="study_id"
              />
            </div>

            {/* By Vendor Table */}
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-[var(--text-primary)]">Performance by Vendor</h3>
                <span className="text-xs text-[var(--text-muted)]">{byVendor.length} Panel Partners</span>
              </div>
              <DataTable
                columns={[
                  {
                    key: 'vendor',
                    header: 'Vendor Name',
                    render: (row: ByVendor) => (
                      <div className="flex flex-col py-1">
                        <span className="font-semibold text-sm text-[var(--text-primary)]">
                          {row.vendor_name || 'Direct Panel'}
                        </span>
                        {row.vendor_id && (
                          <span className="font-mono text-[11px] text-[var(--text-muted)] select-all">
                            {row.vendor_id}
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'sessions_count',
                    header: 'Clicks',
                    render: (row: ByVendor) => (
                      <span className="font-mono text-sm">{row.sessions_count ?? 0}</span>
                    ),
                  },
                  {
                    key: 'completes',
                    header: 'Completes',
                    render: (row: ByVendor) => (
                      <span className="font-mono text-sm font-bold text-emerald-400">{row.completes ?? 0}</span>
                    ),
                  },
                  {
                    key: 'ir',
                    header: 'Yield',
                    render: (row: ByVendor) => {
                      const total = row.sessions_count || 0;
                      const comp = row.completes || 0;
                      const yieldPct = total > 0 ? ((comp / total) * 100).toFixed(1) : '0.0';
                      return (
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-emerald-400">
                          {yieldPct}%
                        </span>
                      );
                    },
                  },
                ]}
                data={byVendor}
                keyField="vendor_id"
              />
            </div>
          </div>

          {/* Financial Performance section (only shown for verified traffic) */}
          {trafficFilter === 'verified' && (
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4">Financial Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--bg-input)] border border-[var(--glass-border)] rounded-[var(--radius-md)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">Revenue</span>
                    <span className="text-[24px] font-bold text-[var(--success)]">${(funnel.total_sessions * 70).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Based on approved completes × client rate</p>
                </div>
                <div className="bg-[var(--bg-input)] border border-[var(--glass-border)] rounded-[var(--radius-md)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">Vendor Cost</span>
                    <span className="text-[24px] font-bold text-[var(--warning)]">${((funnel.total_sessions || 0) * 50).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Based on accepted completes × vendor rate</p>
                </div>
              </div>
            </div>
          )}

          {trafficFilter === 'unverified' && role !== 'vendor' && (
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4">Unverified Activity</h3>
              <DataTable
                columns={[
                  {
                    key: 'source',
                    header: 'Source',
                    render: () => 'Direct Callback',
                  },
                  {
                    key: 'timestamp',
                    header: 'Timestamp',
                    render: () => new Date().toLocaleString(),
                  },
                  {
                    key: 'details',
                    header: 'Details',
                    render: () => {
                      return (
                        <span className="text-xs text-[var(--text-muted)]">
                          Invalid session / no tracking referral
                        </span>
                      );
                    },
                  },
                ]}
                data={[]}
                keyField="timestamp"
                loading={false}
                skeleton={false}
              />
            </div>
          )}

          {trafficFilter === 'verified' && (
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4">Financial Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--bg-input)] border border-[var(--glass-border)] rounded-[var(--radius-md)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">Revenue</span>
                    <span className="text-[24px] font-bold text-[var(--success)]">${(funnel.total_sessions * 70).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Based on approved completes × client rate</p>
                </div>
                <div className="bg-[var(--bg-input)] border border-[var(--glass-border)] rounded-[var(--radius-md)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">Vendor Cost</span>
                    <span className="text-[24px] font-bold text-[var(--warning)]">${((funnel.total_sessions || 0) * 50).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Based on accepted completes × vendor rate</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
