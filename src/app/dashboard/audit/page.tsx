"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entity_id: string;
  ip?: string;
  before?: any;
  after?: any;
}

function formatDateTime(dateStr: string) {
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

export default function AuditPage() {
  const { user, isAuthenticated, isLoading: authLoading, role, vendor_id } = useAuthState();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(() => {});
    checkAuth();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadLogs();
    }
  }, [isAuthenticated, entityFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '200' };
      if (entityFilter) params.entity = entityFilter;

      const res = await apiClient.get<any>('/audit-logs', params);
      const list = res?.data || (Array.isArray(res) ? res : []);
      setLogs(list);
    } catch (err: any) {
      showToast(err.message || 'Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        l.user?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        l.entity?.toLowerCase().includes(q) ||
        l.entity_id?.toLowerCase().includes(q) ||
        l.ip?.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

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
      title="System Audit Trail"
      subtitle="Immutable chronological ledger of administrative operations and security mutations"
    >
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search by operator email, action, entity, or IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-1)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-1)]"
            aria-label="Filter by entity type"
          >
            <option value="">All Entities</option>
            <option value="study">Studies</option>
            <option value="vendor">Vendors</option>
            <option value="tracking_link">Tracking Links</option>
            <option value="user">Users</option>
            <option value="vault">Credential Vault</option>
          </select>
          {(searchQuery || entityFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setEntityFilter('');
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
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <div className="text-4xl mb-3">🛡️</div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Audit Records Found</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {searchQuery || entityFilter
              ? "No events match the selected criteria."
              : "System and administrative changes will appear here automatically."}
          </p>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'timestamp',
              header: 'Timestamp',
              render: (row: AuditLog) => (
                <span className="text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap">
                  {formatDateTime(row.timestamp)}
                </span>
              ),
            },
            {
              key: 'user',
              header: 'Operator',
              render: (row: AuditLog) => (
                <span className="font-semibold text-xs text-[var(--text-primary)]">
                  {row.user || 'system'}
                </span>
              ),
            },
            {
              key: 'action',
              header: 'Action',
              render: (row: AuditLog) => (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--accent-1)]">
                  {row.action}
                </span>
              ),
            },
            {
              key: 'entity',
              header: 'Target Entity',
              render: (row: AuditLog) => (
                <div className="flex flex-col py-1">
                  <span className="text-xs font-semibold text-[var(--text-primary)] uppercase">
                    {row.entity}
                  </span>
                  {row.entity_id && (
                    <span className="font-mono text-[11px] text-[var(--text-muted)] select-all" title={row.entity_id}>
                      {row.entity_id}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'ip',
              header: 'IP Address',
              render: (row: AuditLog) => (
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {row.ip || '127.0.0.1'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row: AuditLog) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLog(row)}
                >
                  View Diff
                </Button>
              ),
            },
          ]}
          data={filteredLogs}
          keyField="id"
        />
      )}

      {/* Modal: View Audit Diff */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event: ${selectedLog.action}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--glass-border)]">
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">Operator:</span>
                <span className="font-semibold text-[var(--text-primary)]">{selectedLog.user}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">IP Address:</span>
                <span className="font-mono text-[var(--text-primary)]">{selectedLog.ip || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">Entity Type:</span>
                <span className="font-semibold text-[var(--text-primary)] uppercase">{selectedLog.entity}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">Timestamp:</span>
                <span className="font-mono text-[var(--text-primary)]">{formatDateTime(selectedLog.timestamp)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[var(--text-muted)] block mb-0.5">Entity ID:</span>
                <span className="font-mono text-[var(--text-secondary)] select-all">{selectedLog.entity_id}</span>
              </div>
            </div>

            {selectedLog.before && (
              <div>
                <span className="font-semibold text-red-400 block mb-1">State Before:</span>
                <pre className="p-3 rounded bg-[var(--bg-primary)] border border-red-500/20 font-mono text-[11px] overflow-x-auto text-[var(--text-secondary)]">
                  {JSON.stringify(selectedLog.before, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.after && (
              <div>
                <span className="font-semibold text-emerald-400 block mb-1">State After:</span>
                <pre className="p-3 rounded bg-[var(--bg-primary)] border border-emerald-500/20 font-mono text-[11px] overflow-x-auto text-[var(--text-secondary)]">
                  {JSON.stringify(selectedLog.after, null, 2)}
                </pre>
              </div>
            )}
          </div>
          <Modal.Footer>
            <Button variant="primary" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </DashboardLayout>
  );
}
