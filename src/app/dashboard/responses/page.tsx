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
  study_id: string;
  study_title?: string;
  study_code?: string;
  vendor_id: string;
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
  
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
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
  }, [isAuthenticated, page, statusFilter]);

  const loadResponses = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 30,
      };

      if (statusFilter) params.status = statusFilter;
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
      setTotalCount(meta.total ?? rows.length);
    } catch (err: any) {
      showToast(err.message || 'Failed to load responses', 'error');
    } finally {
      setLoading(false);
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
                return (
                  <div className="flex items-center gap-2 py-1">
                    <span
                      className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--accent-1)] select-all"
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
              header: 'Survey / Study',
              render: (row: ResponseItem) => (
                <div className="flex flex-col py-0.5 min-w-[140px]">
                  <span className="font-semibold text-sm text-[var(--text-primary)] leading-tight">
                    {row.study_title || 'Direct Survey'}
                  </span>
                  {row.study_code && (
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {row.study_code}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'vendor',
              header: 'Sample Vendor',
              render: (row: ResponseItem) => (
                <div className="flex flex-col py-0.5">
                  <span className="font-medium text-sm text-[var(--text-primary)]">
                    {row.vendor_name || 'Direct Panel'}
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
              render: (row: ResponseItem) => (
                <StatusBadge status={row.final_status || 'UNKNOWN'} />
              ),
            },
            {
              key: 'ip_country',
              header: 'IP & Origin',
              render: (row: ResponseItem) => (
                <div className="flex flex-col py-0.5 text-xs">
                  <span className="font-mono text-[var(--text-primary)]">
                    {row.ip_address || '—'}
                  </span>
                  {row.country_detected && (
                    <span className="text-[var(--text-muted)]">
                      {row.country_detected}
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
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedResponse(row)}
                >
                  Inspect
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

      {/* Modal: Detailed Response Inspection */}
      {selectedResponse && (
        <Modal
          isOpen={!!selectedResponse}
          onClose={() => setSelectedResponse(null)}
          title="Response Inspection Audit"
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--glass-border)]">
              <div>
                <span className="text-xs text-[var(--text-muted)] block">Final Disposition</span>
                <StatusBadge status={selectedResponse.final_status} />
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--text-muted)] block">Terminal Event</span>
                <span className="text-xs font-mono text-[var(--text-primary)]">
                  {formatDateTime(selectedResponse.terminal_at || selectedResponse.created_at)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--glass-border)]">
              <div className="col-span-2">
                <span className="text-xs text-[var(--text-muted)] block mb-0.5">Participant UID</span>
                <span className="font-mono text-xs font-bold text-[var(--accent-1)] bg-[var(--bg-tertiary)] px-2 py-1 rounded select-all block break-all">
                  {selectedResponse.normalized_uid || selectedResponse.uid}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-0.5">Study</span>
                <span className="text-xs font-medium text-[var(--text-primary)] block">
                  {selectedResponse.study_title || 'Direct'}
                </span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  {selectedResponse.study_code || selectedResponse.study_id}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-0.5">Sample Vendor</span>
                <span className="text-xs font-medium text-[var(--text-primary)] block">
                  {selectedResponse.vendor_name || 'Direct'}
                </span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  {selectedResponse.vendor_code || selectedResponse.vendor_id}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-0.5">IP Address</span>
                <span className="font-mono text-xs text-[var(--text-primary)]">
                  {selectedResponse.ip_address || '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-0.5">Detected Country</span>
                <span className="text-xs text-[var(--text-primary)]">
                  {selectedResponse.country_detected || 'Global / Unknown'}
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