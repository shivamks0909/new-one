"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { apiClient, getAuthToken } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

interface ResponseItem {
  id: string;
  session_id?: string;
  study_id?: string;
  study_title?: string;
  study_code?: string;
  project_code?: string;
  project_name?: string;
  vendor_id?: string;
  vendor_name?: string;
  vendor_code?: string;
  uid: string;
  normalized_uid?: string;
  final_status: string;
  created_at: string;
  updated_at?: string;
  terminal_at?: string;
  ip_address?: string;
  user_agent?: string;
  landing_url?: string;
  country_detected?: string;
  country?: string;
  is_unverified?: boolean;
  rejection_reason?: string;
  is_reviewed?: boolean;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function ResponsesPage() {
  const { user, isAuthenticated, isLoading: authLoading, role, vendor_id } = useAuthState();
  const { showToast } = useToast();
  
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [unverifiedCount, setUnverifiedCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'unverified'>('all');
  
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribe(() => {});
    checkAuth();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadResponses();
    }
  }, [isAuthenticated, page, statusFilter, activeTab]);

  const loadResponses = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 30,
      };

      if (activeTab === 'unverified') {
        params.type = 'unverified';
      } else if (activeTab === 'verified') {
        params.type = 'verified';
      }

      if (statusFilter && activeTab !== 'unverified') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      
      // Strict role isolation: VENDOR users are restricted to their assigned vendor_id
      if (role === 'VENDOR' && vendor_id) {
        params.vendor_id = vendor_id;
      }

      const res = await apiClient.get<any>('/responses', params);
      
      const rows = res?.data || res?.responses || (Array.isArray(res) ? res : []);
      const meta = res?.meta || {};

      setResponses(rows);
      setTotalPages(meta.pages || Math.max(1, Math.ceil((meta.total || rows.length) / 30)));
      setTotalCount(meta.allTotal !== undefined ? meta.allTotal : ((meta.verifiedTotal ?? 0) + (meta.unverifiedTotal ?? 0)));
      if (meta.verifiedTotal !== undefined) setVerifiedCount(meta.verifiedTotal);
      if (meta.unverifiedTotal !== undefined) setUnverifiedCount(meta.unverifiedTotal);
    } catch (err: any) {
      showToast(err.message || 'Failed to load responses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReviewed = async (hitId: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/unverified/${hitId}/mark-reviewed`, { notes: 'Marked reviewed by operator' });
      showToast('Hit marked as reviewed', 'success');
      loadResponses();
      if (selectedResponse?.id === hitId) {
        setSelectedResponse(prev => prev ? { ...prev, is_reviewed: true } : null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to mark reviewed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWhitelistIp = async (hitId: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/unverified/${hitId}/whitelist-ip`, { reason: 'Operator verified clean traffic' });
      showToast('IP whitelisted successfully', 'success');
      loadResponses();
    } catch (err: any) {
      showToast(err.message || 'Failed to whitelist IP', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockIp = async (hitId: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/unverified/${hitId}/block-ip`, { reason: 'Operator blacklisted fraudulent IP' });
      showToast('IP blocked permanently', 'success');
      loadResponses();
    } catch (err: any) {
      showToast(err.message || 'Failed to block IP', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadResponses();
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    showToast('Participant UID copied!', 'success');
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const token = getAuthToken();
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const url = new URL(`${origin}/api/responses/export`);
      
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (searchQuery) url.searchParams.set('search', searchQuery);
      if (activeTab !== 'all') url.searchParams.set('type', activeTab);
      if (role === 'VENDOR' && vendor_id) url.searchParams.set('vendor_id', vendor_id);

      const response = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `responses_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showToast('Responses exported to Excel successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
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
      title="Fieldwork Responses"
      subtitle={`Comprehensive real-time participant transaction records (${totalCount.toLocaleString()} total)`}
      actions={
        <Button
          variant="ghost"
          onClick={handleExportExcel}
          disabled={exporting}
          className="inline-flex items-center gap-2 border border-[var(--glass-border)]"
        >
          {exporting ? '⏳ Exporting...' : '📥 Export to Excel'}
        </Button>
      }
    >
      {/* ── Top Tabs Strip ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 border-b border-[var(--glass-border)] pb-3">
        <button
          id="tab-responses-all"
          onClick={() => { setActiveTab('all'); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[var(--accent-1)] text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          All ({totalCount.toLocaleString()})
        </button>

        <button
          id="tab-responses-verified"
          onClick={() => { setActiveTab('verified'); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'verified'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-emerald-400 hover:bg-emerald-500/10'
          }`}
        >
          <span>✓ Verified</span>
          {verifiedCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-700/60 font-mono">({verifiedCount})</span>}
        </button>

        <button
          id="tab-responses-unverified"
          onClick={() => { setActiveTab('unverified'); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'unverified'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-rose-400 hover:bg-rose-500/10'
          }`}
        >
          <span>🚫 Unverified Fake Clicks</span>
          {unverifiedCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-700/60 font-mono">({unverifiedCount})</span>}
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-6 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] flex gap-2">
          <input
            type="text"
            placeholder="Search by participant UID, Study Code, or IP address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3.5 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-1)]"
          />
          <Button type="submit" variant="primary" size="sm">Search</Button>
        </form>

        <div className="flex flex-wrap gap-2.5 items-center">
          {activeTab !== 'unverified' && (
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-1)]"
              aria-label="Filter by disposition status"
            >
              <option value="">All Dispositions</option>
              <option value="COMPLETE">Complete (Qualified)</option>
              <option value="TERMINATE">Terminated (Screened Out)</option>
              <option value="QUOTA_FULL">Quota Full</option>
              <option value="SECURITY_REJECT">Security Reject (Quality Term)</option>
              <option value="EXPIRED">Survey Closed / Expired</option>
            </select>
          )}

          {(statusFilter || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('');
                setSearchQuery('');
                setPage(1);
                loadResponses();
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-64 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]" />
        </div>
      ) : responses.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Response Records Found</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {statusFilter || searchQuery
              ? "No responses match the active filter criteria."
              : activeTab === 'unverified'
              ? "No unverified fake clicks logged! All traffic is genuine and token-authenticated."
              : "Responses will appear in real-time as panel participants complete survey sessions."}
          </p>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'uid',
              header: 'Participant UID',
              render: (row: ResponseItem) => {
                const uidVal = row.normalized_uid || row.uid || '—';
                const isUnv = row.is_unverified || row.final_status === 'UNVERIFIED';
                return (
                  <div className={`flex items-center gap-2 py-1 ${isUnv ? 'text-rose-400' : ''}`}>
                    <span
                      className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border select-all ${
                        isUnv
                          ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                          : 'bg-[var(--bg-tertiary)] border-[var(--glass-border)] text-[var(--accent-1)]'
                      }`}
                      title={uidVal}
                    >
                      {uidVal}
                    </span>
                    <button
                      onClick={() => handleCopyUid(uidVal)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-1)] transition-colors"
                      title="Copy UID"
                    >
                      {copiedUid === uidVal ? '✓' : '📋'}
                    </button>
                  </div>
                );
              },
            },
            {
              key: 'study',
              header: 'Project Code / Study',
              render: (row: ResponseItem) => (
                <div className="flex flex-col py-0.5 min-w-[140px]">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--text-primary)] w-fit">
                    {row.project_code || row.study_code || '—'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] truncate max-w-[180px] mt-0.5">
                    {row.project_name || row.study_title || 'Direct Survey'}
                  </span>
                </div>
              ),
            },
            {
              key: 'vendor',
              header: 'Sample Vendor',
              render: (row: ResponseItem) => (
                <div className="flex flex-col py-0.5">
                  <span className="font-medium text-sm text-[var(--text-primary)]">
                    {row.vendor_name || 'Direct / External'}
                  </span>
                  {row.vendor_code && (
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {row.vendor_code}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Disposition',
              render: (row: ResponseItem) => {
                if (row.is_unverified || row.final_status === 'UNVERIFIED') {
                  return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <span>🚫</span>
                      <span>UNVERIFIED</span>
                    </div>
                  );
                }
                return <StatusBadge status={row.final_status || 'UNKNOWN'} />;
              },
            },
            {
              key: 'ip_country',
              header: 'IP & Origin',
              render: (row: ResponseItem) => (
                <div className="flex flex-col py-0.5 text-xs">
                  <span className="font-mono text-[var(--text-primary)]">
                    {row.ip_address || '—'}
                  </span>
                  {(row.country_detected || row.country) && (
                    <span className="text-[var(--text-muted)]">
                      {row.country_detected || row.country}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'timestamp',
              header: 'Timestamp',
              render: (row: ResponseItem) => (
                <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                  {formatDateTime(row.terminal_at || row.created_at)}
                </span>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row: ResponseItem) => (
                <Button
                  variant={row.is_unverified || row.final_status === 'UNVERIFIED' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedResponse(row)}
                  className={row.is_unverified || row.final_status === 'UNVERIFIED' ? 'bg-rose-600 hover:bg-rose-500 text-white' : ''}
                >
                  {row.is_unverified || row.final_status === 'UNVERIFIED' ? 'Triage 🛡️' : 'Inspect'}
                </Button>
              ),
            },
          ]}
          data={responses}
          keyField="id"
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      )}

      {/* Modal: Detailed Response & Triage Slide-over */}
      {selectedResponse && (
        <Modal
          isOpen={!!selectedResponse}
          onClose={() => setSelectedResponse(null)}
          title={selectedResponse.is_unverified || selectedResponse.final_status === 'UNVERIFIED' ? "🚫 Unverified Fake Click Triage Audit" : "Response Inspection Audit"}
        >
          <div className="space-y-4 text-sm">
            <div className={`flex items-center justify-between p-3 rounded-lg border ${
              selectedResponse.is_unverified || selectedResponse.final_status === 'UNVERIFIED'
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                : 'bg-[var(--bg-tertiary)] border-[var(--glass-border)]'
            }`}>
              <div>
                <span className="text-xs text-[var(--text-muted)] block">Disposition Status</span>
                {selectedResponse.is_unverified || selectedResponse.final_status === 'UNVERIFIED' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    <span>🚫</span>
                    <span>UNVERIFIED FAKE CLICK</span>
                  </span>
                ) : (
                  <StatusBadge status={selectedResponse.final_status} />
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--text-muted)] block">Detected Time</span>
                <span className="text-xs font-mono text-[var(--text-primary)]">
                  {formatDateTime(selectedResponse.terminal_at || selectedResponse.created_at)}
                </span>
              </div>
            </div>

            {selectedResponse.rejection_reason && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                <strong className="block font-semibold mb-0.5">Fraud Rejection Detail:</strong>
                <span>{selectedResponse.rejection_reason}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--glass-border)]">
              <div className="col-span-2">
                <span className="text-xs text-[var(--text-muted)] block mb-0.5">Participant UID</span>
                <span className="font-mono text-xs font-bold text-[var(--accent-1)] bg-[var(--bg-tertiary)] px-2 py-1 rounded select-all block break-all">
                  {selectedResponse.normalized_uid || selectedResponse.uid}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-0.5">Project Code</span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--accent-1)] block w-fit">
                  {selectedResponse.project_code || selectedResponse.study_code || '—'}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                  {selectedResponse.project_name || selectedResponse.study_title || selectedResponse.study_id}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-0.5">Sample Vendor</span>
                <span className="text-xs font-medium text-[var(--text-primary)] block">
                  {selectedResponse.vendor_name || 'Direct / External'}
                </span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  {selectedResponse.vendor_code || selectedResponse.vendor_id || '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-0.5">IP Address</span>
                <span className="font-mono text-xs text-[var(--text-primary)] font-semibold">
                  {selectedResponse.ip_address || '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-0.5">Detected Country</span>
                <span className="text-xs text-[var(--text-primary)]">
                  {selectedResponse.country_detected || selectedResponse.country || 'Global / Unknown'}
                </span>
              </div>
              {selectedResponse.session_id && (
                <div className="col-span-2">
                  <span className="text-xs text-[var(--text-muted)] block mb-0.5">Session ID</span>
                  <span className="font-mono text-[11px] text-[var(--text-secondary)] select-all block break-all">
                    {selectedResponse.session_id}
                  </span>
                </div>
              )}
              {selectedResponse.user_agent && (
                <div className="col-span-2">
                  <span className="text-xs text-[var(--text-muted)] block mb-0.5">User Agent</span>
                  <span className="font-mono text-[11px] text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-2 rounded block break-all">
                    {selectedResponse.user_agent}
                  </span>
                </div>
              )}
            </div>

            {/* Operator Actions for Unverified Hits */}
            {(selectedResponse.is_unverified || selectedResponse.final_status === 'UNVERIFIED') && (
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                  Operator Triage Actions
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading || selectedResponse.is_reviewed}
                    onClick={() => handleMarkReviewed(selectedResponse.id)}
                    className="text-xs"
                  >
                    {selectedResponse.is_reviewed ? '✓ Reviewed' : 'Mark Reviewed'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleWhitelistIp(selectedResponse.id)}
                    className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    Whitelist IP ({selectedResponse.ip_address})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleBlockIp(selectedResponse.id)}
                    className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    Block IP Permanently
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Modal.Footer>
            <Button variant="primary" onClick={() => setSelectedResponse(null)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </DashboardLayout>
  );
}