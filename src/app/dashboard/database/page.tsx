"use client";

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { apiClient, getAuthToken } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

interface DatabaseStats {
  dbSizePretty: string;
  dbSizeBytes: number;
  storageLimitPretty: string;
  storageLimitBytes: number;
  usagePercent: number;
  counts: {
    projects: number;
    sessions: number;
    responses: number;
    completes: number;
    fakeClicks: number;
    auditLogs: number;
    users: number;
  };
  tableSizes: Array<{
    tableName: string;
    sizePretty: string;
    bytes: number;
  }>;
}

export default function DatabasePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const { showToast } = useToast();

  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'FIELDWORK_ONLY' | 'FULL_RESET'>('FIELDWORK_ONLY');
  const [confirmInput, setConfirmInput] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribe(() => {});
    checkAuth();
    return unsubscribe;
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/database/stats');
      if (res && res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load database storage metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  // 1-Click Excel Export handler
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      showToast('Generating master Excel workbook...', 'info');

      const token = getAuthToken();
      const url = `/api/database/export${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `OpinionInsights-Database-Backup-${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showToast('Master Excel sheet exported and downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('Export error:', err);
      showToast(err?.message || 'Database export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  // 1-Click Database Reset handler
  const handleExecuteReset = async () => {
    if (confirmInput.trim() !== 'RESET-CONFIRM') {
      showToast('Please type RESET-CONFIRM exactly to proceed', 'error');
      return;
    }

    try {
      setResetting(true);
      const res = await apiClient.post<any>('/database/reset', {
        confirmation: 'RESET-CONFIRM',
        mode: resetMode,
      });

      showToast(res.data?.message || 'Database reset successfully completed', 'success');
      setResetModalOpen(false);
      setConfirmInput('');
      fetchStats();
    } catch (err: any) {
      showToast(err?.message || 'Failed to reset database', 'error');
    } finally {
      setResetting(false);
    }
  };

  if (authLoading || (loading && !stats)) {
    return (
      <DashboardLayout title="Database & Storage" user={user || undefined}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00BFA5]"></div>
        </div>
      </DashboardLayout>
    );
  }

  const usagePct = stats?.usagePercent || 0;
  const isStorageWarning = usagePct >= 75;
  const isStorageCritical = usagePct >= 90;

  return (
    <DashboardLayout title="Database & Storage" user={user || undefined}>
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <svg className="w-7 h-7 text-[#00BFA5]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
              Database & Storage Center
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              500 MB Storage Quota Monitor, 1-Click Master Excel Export, and Secure Fieldwork Reset.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={fetchStats}
              disabled={loading}
              className="text-slate-600 hover:text-slate-900 border-slate-300"
            >
              <svg className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={exporting}
              className="bg-[#00BFA5] hover:bg-[#009E8A] text-white shadow-sm font-medium"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Exporting Excel...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export All Data (Excel)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Storage Quota Card */}
        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-slate-700 shadow-xl overflow-hidden relative">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-[#00BFA5]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 p-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-[#00BFA5] bg-[#00BFA5]/10 px-2.5 py-1 rounded-full border border-[#00BFA5]/30">
                  Supabase PostgreSQL Storage Quota
                </span>
                <h3 className="text-xl font-bold text-white mt-2">
                  {stats?.dbSizePretty} <span className="text-slate-400 text-base font-normal">used of 500 MB limit</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  isStorageCritical
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : isStorageWarning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    isStorageCritical ? 'bg-rose-400 animate-pulse' : isStorageWarning ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}></span>
                  {isStorageCritical ? 'CRITICAL STORAGE' : isStorageWarning ? 'WARNING: HIGH STORAGE' : 'HEALTHY STORAGE'}
                </span>
                <span className="text-sm font-semibold text-slate-300">
                  {usagePct}%
                </span>
              </div>
            </div>

            {/* Gauge Progress Bar */}
            <div className="w-full bg-slate-700/80 rounded-full h-3.5 p-0.5 overflow-hidden border border-slate-600">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isStorageCritical
                    ? 'bg-gradient-to-r from-rose-500 to-red-600'
                    : isStorageWarning
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-[#00BFA5] to-emerald-400'
                }`}
                style={{ width: `${Math.min(Math.max(usagePct, 1), 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
              <span>0 MB</span>
              <span>Available: {Math.max(0, 500 - (stats?.dbSizeBytes ? stats.dbSizeBytes / (1024 * 1024) : 0)).toFixed(1)} MB remaining</span>
              <span>500 MB (Max Limit)</span>
            </div>
          </div>
        </Card>

        {/* Overview Stat Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card padding="sm" className="bg-white border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Projects</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.counts.projects ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active & archived</div>
          </Card>
          <Card padding="sm" className="bg-white border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Survey Sessions</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.counts.sessions ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Tracked entries</div>
          </Card>
          <Card padding="sm" className="bg-white border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Responses</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.counts.responses ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Terminal hits</div>
          </Card>
          <Card padding="sm" className="bg-white border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Completes</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats?.counts.completes ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Verified finishes</div>
          </Card>
          <Card padding="sm" className="bg-white border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Fake / Direct Hits</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{stats?.counts.fakeClicks ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Prevented fraud</div>
          </Card>
          <Card padding="sm" className="bg-white border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Audit Logs</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.counts.auditLogs ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">System events</div>
          </Card>
        </div>

        {/* 2 Master Action Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: 1-Click Excel Backup */}
          <Card className="border-teal-200 bg-teal-50/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#00BFA5]/20 flex items-center justify-center text-[#00BFA5]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">1-Click Full Project Export</h3>
                  <p className="text-xs text-slate-500">Download formatted multi-sheet Excel spreadsheet</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Exports your entire database in a clean, beautifully styled Excel workbook (<code className="text-teal-700 bg-teal-100/60 px-1 py-0.5 rounded text-xs">.xlsx</code>). 
                Formatted with brand color themes, alternating rows, auto-fit columns, and multi-sheet categorization:
              </p>

              <ul className="space-y-1.5 text-xs text-slate-600 mb-6">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00BFA5]"></span>
                  <strong>Sheet 1: System Overview</strong> — Storage quota, metrics & table size audit.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00BFA5]"></span>
                  <strong>Sheet 2: Projects</strong> — Codes, client pricing, target completes, live links.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00BFA5]"></span>
                  <strong>Sheet 3: Responses</strong> — Color-coded completes, terminates, quotas & LOI.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00BFA5]"></span>
                  <strong>Sheet 4: Sessions</strong> — Tokens, respondent UIDs, IPs, timestamps.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00BFA5]"></span>
                  <strong>Sheet 5: Security Clicks</strong> — Fraud attempts, blocked IPs & user agents.
                </li>
              </ul>
            </div>

            <Button
              onClick={handleExportExcel}
              disabled={exporting}
              className="w-full bg-[#00BFA5] hover:bg-[#009E8A] text-white py-2.5 font-medium shadow"
            >
              {exporting ? 'Generating Excel Workbook...' : '📥 Export Everything to Excel (.xlsx)'}
            </Button>
          </Card>

          {/* Card 2: 1-Click Dashboard Reset */}
          <Card className="border-rose-200 bg-rose-50/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">1-Click Database Reset</h3>
                  <p className="text-xs text-rose-600 font-medium">Free up 500MB storage immediately</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                When your 500MB storage fills up, this feature wipes transactional fieldwork data to immediately recover space. 
                Your administrator accounts, vendor credentials, and client configurations are <strong>always preserved safely</strong>.
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-6 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Recommended Workflow:
                </p>
                <p>1. Always click <strong>Export Everything to Excel</strong> first to save a local backup.</p>
                <p>2. Then execute Reset to clear disk storage back to ~1-2 MB.</p>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                setResetModalOpen(true);
                setConfirmInput('');
              }}
              className="w-full border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 py-2.5 font-medium"
            >
              ⚠️ Open Reset Center...
            </Button>
          </Card>
        </div>

        {/* Database Table Storage Breakdown */}
        <Card className="border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Table Storage Distribution</h3>
              <p className="text-xs text-slate-500">Live disk space consumption per PostgreSQL table</p>
            </div>
            <span className="text-xs text-slate-400">{stats?.tableSizes?.length || 0} tables indexed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3">Table Name</th>
                  <th className="px-4 py-3">Role / Category</th>
                  <th className="px-4 py-3 text-right">Disk Size</th>
                  <th className="px-4 py-3 text-right">Raw Bytes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {stats?.tableSizes?.map((tbl) => {
                  const isHeavy = tbl.bytes > 500 * 1024;
                  const isProtected = ['users', 'clients', 'vendors', 'credential_vault', '_migrations'].includes(tbl.tableName);

                  return (
                    <tr key={tbl.tableName} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-mono text-slate-900 font-medium">
                        {tbl.tableName}
                        {isProtected && (
                          <span className="ml-2 text-[10px] font-sans px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200">
                            Protected Config
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {tbl.tableName.includes('click') || tbl.tableName.includes('fake') ? 'Fraud & Threat Logs' :
                         tbl.tableName.includes('response') || tbl.tableName.includes('session') ? 'Transactional Fieldwork' :
                         tbl.tableName.includes('project') || tbl.tableName.includes('stud') ? 'Survey Inventory' :
                         tbl.tableName.includes('user') ? 'Authentication' : 'Operational Metadata'}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${isHeavy ? 'text-rose-600' : 'text-slate-700'}`}>
                        {tbl.sizePretty}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                        {tbl.bytes.toLocaleString()} B
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <Modal
          title="⚠️ Database Reset Safeguard"
          onClose={() => setResetModalOpen(false)}
          size="lg"
        >
          <div className="space-y-4 text-slate-700">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 space-y-2">
              <p className="font-bold text-rose-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Warning: Irreversible Data Deletion
              </p>
              <p>
                Resetting your database will immediately wipe records and return your storage utilization back to zero. 
                Make sure you have downloaded the Excel backup first!
              </p>
            </div>

            {/* Select Reset Mode */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Choose Reset Scope:</label>
              
              <div
                onClick={() => setResetMode('FIELDWORK_ONLY')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  resetMode === 'FIELDWORK_ONLY'
                    ? 'border-[#00BFA5] bg-teal-50/40 ring-1 ring-[#00BFA5]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-sm">Option 1: Reset Fieldwork Only (Recommended)</span>
                  <input
                    type="radio"
                    name="resetMode"
                    checked={resetMode === 'FIELDWORK_ONLY'}
                    onChange={() => setResetMode('FIELDWORK_ONLY')}
                    className="text-[#00BFA5]"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Wipes all responses, sessions, fake clicks, and audit logs. <strong>Preserves your created Projects, Tracking Links, Clients, and Users.</strong>
                </p>
              </div>

              <div
                onClick={() => setResetMode('FULL_RESET')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  resetMode === 'FULL_RESET'
                    ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-sm">Option 2: Full Dashboard Reset (Fresh Start)</span>
                  <input
                    type="radio"
                    name="resetMode"
                    checked={resetMode === 'FULL_RESET'}
                    onChange={() => setResetMode('FULL_RESET')}
                    className="text-rose-600"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Wipes all projects, links, sessions, and responses. <strong>Preserves your Admin accounts, Clients, and Vendor partners so you can start fresh.</strong>
                </p>
              </div>
            </div>

            {/* Typed Confirmation */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                To confirm deletion, type <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">RESET-CONFIRM</span> below:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="RESET-CONFIRM"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="ghost"
                onClick={() => setResetModalOpen(false)}
                disabled={resetting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteReset}
                disabled={confirmInput.trim() !== 'RESET-CONFIRM' || resetting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetting ? 'Resetting Database...' : 'Confirm & Wipe Selected Data'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
