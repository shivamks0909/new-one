"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';

interface Study {
  id: string;
  title: string;
  study_code: string;
  status: string;
  created_at: string;
}

interface Response {
  id: string;
  uid: string;
  status: string;
  study_id: string;
  study_title: string;
  created_at: string;
}

interface TrackingLink {
  id: string;
  link_code: string;
  study_id: string;
  study_title: string;
  public_token: string;
  status: string;
  clicks: number;
}

interface AnalyticsSummary {
  total_sessions: number;
  completed: number;
  conversion_rate: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumber(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

export default function VendorWorkspacePage() {
  const { user, isAuthenticated, isLoading: authLoading, role, vendor_id } = useAuthState();
  const { showToast } = useToast();
  const [studies, setStudies] = useState<Study[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({ total_sessions: 0, completed: 0, conversion_rate: '0.00' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'studies' | 'responses' | 'links'>('overview');

  useEffect(() => {
    if (isAuthenticated) {
      loadVendorData();
    }
  }, [isAuthenticated]);

  const loadVendorData = async () => {
    setLoading(true);
    try {
      const [studiesRes, responsesRes, linksRes, analyticsRes] = await Promise.all([
        apiClient.get<{ studies: Study[] }>('/vendor/studies'),
        apiClient.get<{ responses: Response[] }>('/vendor/responses?limit=100'),
        apiClient.get<{ links: TrackingLink[] }>('/vendor/tracking-links'),
        apiClient.get<AnalyticsSummary>('/vendor/analytics/summary'),
      ]);
      setStudies((studiesRes as any)?.studies || (studiesRes as any)?.data || []);
      setResponses((responsesRes as any)?.responses || (responsesRes as any)?.data || []);
      setTrackingLinks((linksRes as any)?.links || (linksRes as any)?.data || []);
      setAnalytics(analyticsRes);
    } catch (err) {
      showToast('Failed to load vendor data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--glass-border)] border-t-[var(--accent-1)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const userRole = role || 'UNKNOWN';
  const vendorId = vendor_id || 'N/A';

  const tabConfig = [
    { key: 'overview', label: 'Overview', icon: <HomeIcon /> },
    { key: 'studies', label: 'My Studies', icon: <StudyIcon /> },
    { key: 'responses', label: 'Responses', icon: <ResponseIcon /> },
    { key: 'links', label: 'Tracking Links', icon: <LinkIcon /> },
  ];

  function HomeIcon() {
    return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
  }
  function StudyIcon() {
    return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
  }
  function ResponseIcon() {
    return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
  }
  function LinkIcon() {
    return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
  }

  return (
    <DashboardLayout
      user={user ? { email: user.email || '', name: user.name, role: userRole, vendor_id: vendorId } : undefined}
      title="Vendor Workspace"
      subtitle={`Vendor: ${vendorId}`}
    >
      <div className="mb-6 flex items-center gap-2 border-b border-[var(--glass-border)] pb-4">
        {tabConfig.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] text-white shadow-[0_0_18px_rgba(99,102,241,0.35)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            <span className="flex-shrink-0 w-5 text-center">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)]" />
            ))}
          </div>
          <div className="h-64 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]" />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Sessions" value={formatNumber(analytics.total_sessions)} type="accent" />
                <StatCard label="Completed" value={formatNumber(analytics.completed)} type="success" />
                <StatCard label="Conversion Rate" value={`${analytics.conversion_rate}%`} type="warning" />
                <StatCard label="Assigned Studies" value={studies.length} type="accent" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="glass-card overflow-hidden animate-slide-up">
                  <div className="p-4 px-6 border-b border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)]">
                    <h3 className="font-bold text-[var(--text-primary)] text-base">Recent Studies</h3>
                  </div>
                  {studies.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">No studies assigned yet</div>
                  ) : (
                    <DataTable
                      columns={[
                        { key: 'study_code', header: 'Study Code' },
                        { key: 'title', header: 'Title' },
                        { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                        { key: 'created_at', header: 'Created', render: (row) => formatDate(row.created_at) },
                      ]}
                      data={studies.slice(0, 10)}
                      keyField="id"
                    />
                  )}
                </div>

                <div className="glass-card overflow-hidden animate-slide-up">
                  <div className="p-4 px-6 border-b border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)]">
                    <h3 className="font-bold text-[var(--text-primary)] text-base">Recent Responses</h3>
                  </div>
                  {responses.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">No responses yet</div>
                  ) : (
                    <DataTable
                      columns={[
                        { key: 'uid', header: 'UID' },
                        { key: 'study_title', header: 'Study' },
                        { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                        { key: 'created_at', header: 'Submitted', render: (row) => formatDate(row.created_at) },
                      ]}
                      data={responses.slice(0, 10)}
                      keyField="id"
                    />
                  )}
                </div>
              </div>

              <div className="glass-card overflow-hidden animate-slide-up">
                <div className="p-4 px-6 border-b border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)]">
                  <h3 className="font-bold text-[var(--text-primary)] text-base">Tracking Links</h3>
                </div>
                {trackingLinks.length === 0 ? (
                  <div className="p-8 text-center text-[var(--text-muted)]">No tracking links yet</div>
                ) : (
                  <DataTable
                    columns={[
                      { key: 'link_code', header: 'Link Code' },
                      { key: 'study_title', header: 'Study' },
                      { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                      { key: 'clicks', header: 'Clicks', className: 'tabular-nums font-medium' },
                    ]}
                    data={trackingLinks.slice(0, 10)}
                    keyField="id"
                  />
                )}
              </div>
            </>
          )}

          {activeTab === 'studies' && (
            <div className="glass-card overflow-hidden animate-slide-up">
              <div className="p-4 px-6 border-b border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)]">
                <h3 className="font-bold text-[var(--text-primary)] text-base">Assigned Studies</h3>
              </div>
              {studies.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-muted)]">No studies assigned yet</div>
              ) : (
                <DataTable
                  columns={[
                    { key: 'study_code', header: 'Study Code' },
                    { key: 'title', header: 'Title' },
                    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                    { key: 'created_at', header: 'Created', render: (row) => formatDate(row.created_at) },
                  ]}
                  data={studies}
                  keyField="id"
                />
              )}
            </div>
          )}

          {activeTab === 'responses' && (
            <div className="glass-card overflow-hidden animate-slide-up">
              <div className="p-4 px-6 border-b border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)]">
                <h3 className="font-bold text-[var(--text-primary)] text-base">Responses</h3>
              </div>
              {responses.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-muted)]">No responses yet</div>
              ) : (
                <DataTable
                  columns={[
                    { key: 'uid', header: 'UID' },
                    { key: 'study_title', header: 'Study' },
                    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                    { key: 'created_at', header: 'Submitted', render: (row) => formatDate(row.created_at) },
                  ]}
                  data={responses}
                  keyField="id"
                />
              )}
            </div>
          )}

          {activeTab === 'links' && (
            <div className="glass-card overflow-hidden animate-slide-up">
              <div className="p-4 px-6 border-b border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)]">
                <h3 className="font-bold text-[var(--text-primary)] text-base">Tracking Links</h3>
              </div>
              {trackingLinks.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-muted)]">No tracking links yet</div>
              ) : (
                <DataTable
                  columns={[
                    { key: 'link_code', header: 'Link Code' },
                    { key: 'study_title', header: 'Study' },
                    { key: 'public_token', header: 'Public Token' },
                    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                    { key: 'clicks', header: 'Clicks', className: 'tabular-nums font-medium' },
                  ]}
                  data={trackingLinks}
                  keyField="id"
                />
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}