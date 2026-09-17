"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import {
  ShieldAlert,
  ArrowLeft,
  Settings,
  Download,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertOctagon,
  Fingerprint,
  RotateCcw,
} from 'lucide-react';

export default function ProjectBlockedAttemptsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuthState();
  const projectId = params?.projectId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total_blocked: 0, last_24h: 0, unique_ips: 0 });
  const [project, setProject] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fraud Config Modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [fraudConfig, setFraudConfig] = useState({
    block_duplicate_ip: true,
    block_duplicate_uid: true,
    soft_duplicate_mode: false,
    block_tone: 'RUDE',
    allow_nat_ip: false,
    custom_ip_message: '',
    custom_uid_message: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const qParams: Record<string, any> = { page, limit: 25 };
      if (typeFilter) qParams.type = typeFilter;
      if (search.trim()) qParams.search = search.trim();

      const [blockedRes, projRes, configRes] = await Promise.all([
        apiClient.get<any>(`/projects/${projectId}/blocked`, qParams),
        apiClient.get<any>(`/projects/${projectId}`),
        apiClient.get<any>(`/projects/${projectId}/fraud-config`),
      ]);

      if (blockedRes?.data) {
        setData(blockedRes.data);
        setSummary(blockedRes.summary || { total_blocked: 0, last_24h: 0, unique_ips: 0 });
        setTotalPages(blockedRes.meta?.pages || 1);
      }
      if (projRes?.data) setProject(projRes.data);
      if (configRes?.data) {
        setFraudConfig({
          block_duplicate_ip: configRes.data.block_duplicate_ip ?? true,
          block_duplicate_uid: configRes.data.block_duplicate_uid ?? true,
          soft_duplicate_mode: configRes.data.soft_duplicate_mode ?? false,
          block_tone: configRes.data.block_tone || 'RUDE',
          allow_nat_ip: configRes.data.allow_nat_ip ?? false,
          custom_ip_message: configRes.data.custom_ip_message || '',
          custom_uid_message: configRes.data.custom_uid_message || '',
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load blocked attempts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId, typeFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleUnblock = async (attemptId: string) => {
    try {
      await apiClient.post(`/projects/${projectId}/blocked/${attemptId}/unblock`, {});
      showToast('Entry unblocked successfully', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to unblock entry', 'error');
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await apiClient.put(`/projects/${projectId}/fraud-config`, fraudConfig);
      showToast('Fraud protection config updated successfully', 'success');
      setShowConfigModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update fraud config', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const exportCsv = () => {
    if (data.length === 0) {
      showToast('No data to export', 'error');
      return;
    }
    const headers = ['Time', 'Type', 'Value', 'Reason', 'Reference ID', 'Tone', 'Status'];
    const rows = data.map((r) => [
      `"${r.attempted_at}"`,
      `"${r.block_type}"`,
      `"${r.raw_value || r.ip_address || ''}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      `"${r.reference_id}"`,
      `"${r.tone}"`,
      `"${r.is_unblocked ? 'UNBLOCKED' : 'BLOCKED'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `blocked_attempts_${project?.project_code || projectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/dashboard/projects/${projectId}`)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Back to Project"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Blocked Entry Attempts</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono font-bold">
                  {project?.project_code || 'PROJECT'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit log of all duplicate IP (after COMPLETE) and duplicate UID attempts intercepted by the platform.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-200 hover:bg-slate-800 gap-1.5 text-xs font-semibold"
              onClick={() => setShowConfigModal(true)}
            >
              <Settings className="h-3.5 w-3.5 text-slate-400" />
              <span>Fraud Rules & Tone</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-200 hover:bg-slate-800 gap-1.5 text-xs font-semibold"
              onClick={exportCsv}
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
              onClick={loadData}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 3-KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Total Blocked Attempts</div>
            <div className="text-3xl font-black text-red-400 mt-2">{summary.total_blocked}</div>
            <div className="text-[11px] text-slate-500 mt-1">Intercepted before session creation</div>
          </div>

          <div className="bg-slate-900 border border-orange-500/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Blocked (Last 24h)</div>
            <div className="text-3xl font-black text-orange-400 mt-2">{summary.last_24h}</div>
            <div className="text-[11px] text-slate-500 mt-1">Live rolling 24-hour window</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
            <div className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Unique Intercepted IPs</div>
            <div className="text-3xl font-black text-white mt-2">{summary.unique_ips}</div>
            <div className="text-[11px] text-slate-500 mt-1">Discrete offending IP addresses</div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full sm:max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by UID, IP, reason or reference ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-700 font-mono"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value="">All Types (IP & UID)</option>
              <option value="IP">IP Duplicate Only</option>
              <option value="UID">UID Collision Only</option>
            </select>
          </div>
        </div>

        {/* Blocked Attempts Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Value / Identifier</th>
                  <th className="py-3.5 px-4 font-semibold">Reference ID</th>
                  <th className="py-3.5 px-4 font-semibold">Tone</th>
                  <th className="py-3.5 px-4 font-semibold">Violation Reason</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                      Loading blocked attempt records...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                      No blocked attempts recorded for this project.
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(row.attempted_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                            row.block_type === 'IP'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {row.block_type === 'IP' ? '🛑 IP COMPLETE' : '🔁 DUP UID'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {row.raw_value || row.ip_address || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 text-[11px] font-bold">
                          {row.reference_id}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        <span className="text-[11px] text-slate-400">{row.tone || 'RUDE'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate font-sans text-xs" title={row.reason}>
                        {row.reason}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {row.is_unblocked ? (
                          <span className="text-[11px] text-emerald-400 font-sans flex items-center justify-end gap-1">
                            <CheckCircle className="h-3 w-3" /> Unblocked
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUnblock(row.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans font-medium transition-colors"
                          >
                            Unblock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400 font-sans">
              <span>Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border-slate-800 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="border-slate-800 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── MODAL: Fraud Rules & Tone Config ──────────────────────────────── */}
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title="Configure Fraud Protection & Tone"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-semibold text-white">Block Duplicate IP after COMPLETE</div>
                  <div className="text-slate-400 text-[11px]">
                    Prevents respondent from completing this project multiple times on same IP
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={fraudConfig.block_duplicate_ip}
                  onChange={(e) => setFraudConfig({ ...fraudConfig, block_duplicate_ip: e.target.checked })}
                  className="h-4 w-4 rounded accent-red-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer border-t border-slate-800 pt-3">
                <div>
                  <div className="font-semibold text-white">Block Duplicate UID in Any Status</div>
                  <div className="text-slate-400 text-[11px]">
                    Disallows re-entry if this UID was already recorded under this project
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={fraudConfig.block_duplicate_uid}
                  onChange={(e) => setFraudConfig({ ...fraudConfig, block_duplicate_uid: e.target.checked })}
                  className="h-4 w-4 rounded accent-red-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer border-t border-slate-800 pt-3">
                <div>
                  <div className="font-semibold text-white">Soft Mode (Warn but allow entry)</div>
                  <div className="text-slate-400 text-[11px]">
                    If enabled, logs violation in audit table without halting survey redirect
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={fraudConfig.soft_duplicate_mode}
                  onChange={(e) => setFraudConfig({ ...fraudConfig, soft_duplicate_mode: e.target.checked })}
                  className="h-4 w-4 rounded accent-amber-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer border-t border-slate-800 pt-3">
                <div>
                  <div className="font-semibold text-white">Allow NAT-shared IPs (Office/School)</div>
                  <div className="text-slate-400 text-[11px]">
                    Bypasses IP duplicate check; only enforces strict UID uniqueness
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={fraudConfig.allow_nat_ip}
                  onChange={(e) => setFraudConfig({ ...fraudConfig, allow_nat_ip: e.target.checked })}
                  className="h-4 w-4 rounded accent-sky-500"
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Block Page Tone</label>
              <select
                value={fraudConfig.block_tone}
                onChange={(e) => setFraudConfig({ ...fraudConfig, block_tone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="RUDE">Rude (Default - "Fir gaand kyu marwa rahe ho?")</option>
                <option value="POLITE">Polite (Respectful Hindi explanation)</option>
                <option value="NEUTRAL">Neutral (Formal scientific language)</option>
                <option value="CUSTOM">Custom (Admin written below)</option>
              </select>
            </div>

            {fraudConfig.block_tone === 'CUSTOM' && (
              <div className="space-y-3 border-t border-slate-800 pt-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Custom Duplicate IP Message</label>
                  <textarea
                    rows={2}
                    value={fraudConfig.custom_ip_message}
                    onChange={(e) => setFraudConfig({ ...fraudConfig, custom_ip_message: e.target.value })}
                    placeholder="Enter custom copy shown when an IP already completed..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Custom Duplicate UID Message</label>
                  <textarea
                    rows={2}
                    value={fraudConfig.custom_uid_message}
                    onChange={(e) => setFraudConfig({ ...fraudConfig, custom_uid_message: e.target.value })}
                    placeholder="Enter custom copy shown when a UID has already been used..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setShowConfigModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                onClick={handleSaveConfig}
                disabled={savingConfig}
              >
                {savingConfig ? 'Saving...' : 'Save Fraud Settings'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
