"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

interface VendorLink {
  id: string;
  country_id: string;
  link_code: string;
  link_name: string;
  url: string;
  uid_mode?: string;
  uid_param?: string;
  vendor_id?: string;
  vendor_name?: string;
  vendor_code?: string;
  vendor_cpi?: number;
  vendor_quota?: number;
  target_completes?: number;
  completes_count?: number;
  status: string;
  full_url?: string;
  created_at: string;
}

interface CountryDetail {
  id: string;
  project_id: string;
  country_code: string;
  country_name: string;
  currency: string;
  client_rate: number;
  vendor_rate: number;
  target_completes: number;
  survey_url?: string;
  est_loi?: number;
  fieldwork_days?: number;
  uid_param?: string;
  status: string;
  total_completes?: number;
  unverified_hits?: number;
  margin_pct?: number;
  links: VendorLink[];
}

interface ProjectDetail {
  id: string;
  project_code: string;
  name: string;
  description?: string;
  client_id: string;
  client_name?: string;
  status: string;
  base_survey_url?: string;
  survey_url?: string;
  callback_url_base?: string;
  uid_param?: string;
  created_by?: string;
  created_at: string;
  countries: CountryDetail[];
}

interface VendorOption {
  id: string;
  name: string;
  vendor_code?: string;
  status: string;
}

const getFlag = (code: string) => {
  if (!code || code.length !== 2) return '🌐';
  const offset = 127397;
  try {
    return String.fromCodePoint(...code.toUpperCase().split('').map(c => c.charCodeAt(0) + offset));
  } catch {
    return '🌐';
  }
};

const statusBadge = (s: string) => {
  switch (s?.toUpperCase()) {
    case 'ACTIVE':
    case 'LIVE':
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    case 'PAUSED':
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    case 'ARCHIVED':
    case 'CLOSED':
      return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
    case 'DRAFT':
    case 'CONFIGURING':
      return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
    default:
      return 'bg-gray-500/15 text-gray-400 border border-gray-500/30';
  }
};

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthState();
  const { showToast } = useToast();
  const pid = params.projectId;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [allVendors, setAllVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});

  // Modals state
  const [showEditProject, setShowEditProject] = useState(false);
  const [showEditCountry, setShowEditCountry] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showEditQuota, setShowEditQuota] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<'PAUSE' | 'RESUME' | 'ARCHIVE' | null>(null);
  const [showDeleteCountryModal, setShowDeleteCountryModal] = useState(false);
  const [showDeleteVendorModal, setShowDeleteVendorModal] = useState(false);

  // Active targets for modals
  const [activeCountry, setActiveCountry] = useState<CountryDetail | null>(null);
  const [activeLink, setActiveLink] = useState<VendorLink | null>(null);

  // Form states
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    base_survey_url: '',
    callback_url_base: '',
    uid_param: 'uid',
  });

  const [countryForm, setCountryForm] = useState({
    survey_url: '',
    currency: 'USD',
    client_rate: '0',
    vendor_rate: '0',
    target_completes: '0',
    est_loi: '10',
    fieldwork_days: '7',
  });

  const [vendorForm, setVendorForm] = useState({
    vendor_id: '',
    quota: '',
    vendor_cpi: '',
  });

  const [editQuotaValue, setEditQuotaValue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedLinkMap, setCopiedLinkMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = subscribe(() => {});
    checkAuth();
    return unsub;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadProject();
      loadVendors();
    }
  }, [isAuthenticated, pid]);

  const loadProject = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get(`/projects/${pid}`);
      const data: ProjectDetail = res.data || res;
      setProject(data);

      // Auto-expand if only 1 country, collapse if multiple
      const initialExp: Record<string, boolean> = {};
      if (data.countries && data.countries.length === 1) {
        initialExp[data.countries[0].id] = true;
      } else if (data.countries) {
        data.countries.forEach(c => {
          initialExp[c.id] = false;
        });
      }
      setExpandedCountries(initialExp);
    } catch (err: any) {
      showToast(err.message || 'Failed to load project details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const res: any = await apiClient.get('/vendors');
      const list = Array.isArray(res) ? res : res.data || [];
      setAllVendors(list.filter((v: any) => v.status === 'ACTIVE' || !v.status));
    } catch (err) {
      console.error('Failed to load vendors:', err);
    }
  };

  const toggleCountry = (id: string) => {
    setExpandedCountries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedLinkMap(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedLinkMap(prev => ({ ...prev, [key]: false }));
      }, 2000);
    }
    showToast('Tracking link copied to clipboard!', 'success');
  };

  const copyAllLinksAsCsv = () => {
    if (!project || !project.countries) return;
    const rows: string[] = ['country_code,vendor_name,link_code,full_url'];
    let count = 0;

    project.countries.forEach(c => {
      (c.links || []).forEach(l => {
        const url = l.full_url || '';
        const vName = `"${(l.vendor_name || 'Direct').replace(/"/g, '""')}"`;
        rows.push(`${c.country_code},${vName},${l.link_code},${url}`);
        count++;
      });
    });

    if (count === 0) {
      showToast('No active vendor links to copy', 'error');
      return;
    }

    navigator.clipboard.writeText(rows.join('\n'));
    showToast(`Copied ${count} links as CSV to clipboard!`, 'success');
  };

  // ── Open Edit Project Modal ──────────────────────────────────────────────
  const openEditProject = () => {
    if (!project) return;
    setProjectForm({
      name: project.name || '',
      description: project.description || '',
      base_survey_url: project.base_survey_url || project.survey_url || '',
      callback_url_base: project.callback_url_base || '',
      uid_param: project.uid_param || 'uid',
    });
    setShowEditProject(true);
  };

  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) {
      showToast('Project name is required', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient.put(`/projects/${pid}`, projectForm);
      showToast('Project updated successfully', 'success');
      setShowEditProject(false);
      loadProject();
    } catch (err: any) {
      showToast(err.message || 'Failed to update project', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Open Edit Country Modal ──────────────────────────────────────────────
  const openEditCountry = (c: CountryDetail) => {
    setActiveCountry(c);
    setCountryForm({
      survey_url: c.survey_url || project?.base_survey_url || '',
      currency: c.currency || 'USD',
      client_rate: String(c.client_rate || 0),
      vendor_rate: String(c.vendor_rate || 0),
      target_completes: String(c.target_completes || 0),
      est_loi: String(c.est_loi || 10),
      fieldwork_days: String(c.fieldwork_days || 7),
    });
    setShowEditCountry(true);
  };

  const handleSaveCountry = async () => {
    if (!activeCountry) return;
    setActionLoading(true);
    try {
      const payload: any = {
        survey_url: countryForm.survey_url.trim(),
      };
      // If 0 completes, allow updating rates and quotas
      if ((activeCountry.total_completes || 0) === 0) {
        payload.currency = countryForm.currency;
        payload.client_rate = parseFloat(countryForm.client_rate) || 0;
        payload.vendor_rate = parseFloat(countryForm.vendor_rate) || 0;
        payload.target_completes = parseInt(countryForm.target_completes, 10) || 0;
        payload.est_loi = parseInt(countryForm.est_loi, 10) || 10;
        payload.fieldwork_days = parseInt(countryForm.fieldwork_days, 10) || 7;
      }
      await apiClient.put(`/countries/${activeCountry.id}`, payload);
      showToast('Country updated successfully', 'success');
      setShowEditCountry(false);
      loadProject();
    } catch (err: any) {
      showToast(err.message || 'Failed to update country', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Add Vendor to Country ────────────────────────────────────────────────
  const openAddVendor = (c: CountryDetail) => {
    setActiveCountry(c);
    const assignedIds = new Set((c.links || []).map(l => l.vendor_id).filter(Boolean));
    const available = allVendors.filter(v => !assignedIds.has(v.id));

    const totalAssignedQuota = (c.links || []).reduce((sum, l) => sum + (l.vendor_quota || l.target_completes || 0), 0);
    const remaining = Math.max(0, (c.target_completes || 0) - totalAssignedQuota);

    setVendorForm({
      vendor_id: available[0]?.id || '',
      quota: String(remaining > 0 ? remaining : 50),
      vendor_cpi: String(c.vendor_rate || 0),
    });
    setShowAddVendor(true);
  };

  const handleAddVendor = async () => {
    if (!activeCountry) return;
    if (!vendorForm.vendor_id) {
      showToast('Please select a vendor', 'error');
      return;
    }
    const quotaNum = parseInt(vendorForm.quota, 10);
    if (!quotaNum || quotaNum <= 0) {
      showToast('Quota must be greater than 0', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient.post(`/countries/${activeCountry.id}/vendors`, {
        vendor_id: vendorForm.vendor_id,
        quota: quotaNum,
        vendor_cpi: parseFloat(vendorForm.vendor_cpi) || undefined,
      });
      showToast('Vendor assigned and tracking link generated!', 'success');
      setShowAddVendor(false);
      loadProject();
    } catch (err: any) {
      showToast(err.message || 'Failed to assign vendor', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Edit Vendor Quota ────────────────────────────────────────────────────
  const openEditQuota = (c: CountryDetail, l: VendorLink) => {
    setActiveCountry(c);
    setActiveLink(l);
    setEditQuotaValue(String(l.vendor_quota || l.target_completes || 0));
    setShowEditQuota(true);
  };

  const handleSaveQuota = async () => {
    if (!activeLink || !activeLink.vendor_id) return;
    const qNum = parseInt(editQuotaValue, 10);
    if (!qNum || qNum <= 0) {
      showToast('Valid quota required', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient.put(`/links/${activeLink.id}/vendors/${activeLink.vendor_id}`, {
        quota: qNum,
      });
      showToast('Quota updated successfully', 'success');
      setShowEditQuota(false);
      loadProject();
    } catch (err: any) {
      showToast(err.message || 'Failed to update quota', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Regenerate Link ──────────────────────────────────────────────────────
  const openRegenerateModal = (l: VendorLink) => {
    if ((l.completes_count || 0) > 0) {
      showToast('Cannot regenerate link: completes have already been recorded', 'error');
      return;
    }
    setActiveLink(l);
    setShowRegenerateModal(true);
  };

  const handleRegenerateLink = async () => {
    if (!activeLink) return;
    setActionLoading(true);
    try {
      const res: any = await apiClient.post(`/links/${activeLink.id}/regenerate`, {});
      showToast('New link code generated! Old link code deactivated.', 'success');
      setShowRegenerateModal(false);
      loadProject();
    } catch (err: any) {
      showToast(err.message || 'Failed to regenerate link', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Remove Vendor ────────────────────────────────────────────────────────
  const openDeleteVendor = (c: CountryDetail, l: VendorLink) => {
    if ((l.completes_count || 0) > 0) {
      showToast('Cannot remove vendor: completes have already been recorded', 'error');
      return;
    }
    setActiveCountry(c);
    setActiveLink(l);
    setShowDeleteVendorModal(true);
  };

  const handleDeleteVendor = async () => {
    if (!activeLink || !activeLink.vendor_id) return;
    setActionLoading(true);
    try {
      await apiClient.delete(`/links/${activeLink.id}/vendors/${activeLink.vendor_id}`);
      showToast('Vendor removed successfully', 'success');
      setShowDeleteVendorModal(false);
      loadProject();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove vendor', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Remove Country ───────────────────────────────────────────────────────
  const openDeleteCountry = (c: CountryDetail) => {
    if ((c.total_completes || 0) > 0) {
      showToast('Cannot remove country: completes have already been recorded', 'error');
      return;
    }
    setActiveCountry(c);
    setShowDeleteCountryModal(true);
  };

  const handleDeleteCountry = async () => {
    if (!activeCountry) return;
    setActionLoading(true);
    try {
      await apiClient.delete(`/countries/${activeCountry.id}`);
      showToast('Country removed successfully', 'success');
      setShowDeleteCountryModal(false);
      loadProject();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete country', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Pause / Resume / Archive ─────────────────────────────────────────────
  const handleStatusChange = async (targetStatus: 'PAUSE' | 'RESUME' | 'ARCHIVE') => {
    setActionLoading(true);
    try {
      if (targetStatus === 'PAUSE') {
        await apiClient.post(`/projects/${pid}/pause`, {});
        showToast('Project paused successfully', 'success');
      } else if (targetStatus === 'RESUME') {
        await apiClient.post(`/projects/${pid}/resume`, {});
        showToast('Project resumed successfully', 'success');
      } else if (targetStatus === 'ARCHIVE') {
        await apiClient.post(`/projects/${pid}/archive`, {});
        showToast('Project archived successfully', 'success');
      }
      setShowStatusModal(null);
      loadProject();
    } catch (err: any) {
      showToast(err.message || 'Status change failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Summary Metrics calculations
  const stats = useMemo(() => {
    if (!project || !project.countries) return { countries: 0, quota: 0, links: 0, vendors: 0 };
    const countries = project.countries.length;
    const quota = project.countries.reduce((sum, c) => sum + (Number(c.target_completes) || 0), 0);
    let totalLinks = 0;
    const vendorSet = new Set<string>();

    project.countries.forEach(c => {
      (c.links || []).forEach(l => {
        totalLinks++;
        if (l.vendor_id) vendorSet.add(l.vendor_id);
      });
    });

    return {
      countries,
      quota,
      links: totalLinks,
      vendors: vendorSet.size,
    };
  }, [project]);

  const lh = user
    ? { email: user.email, name: user.name || user.full_name, role: user.role, vendor_id: user.vendor_id }
    : undefined;

  if (loading) {
    return (
      <DashboardLayout title="Loading..." user={lh} onLogout={() => { logout(); router.push('/'); }}>
        <div className="flex flex-col items-center justify-center py-28 gap-3">
          <div className="w-10 h-10 border-3 border-[var(--accent-1)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)] font-medium">Loading project details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout title="Not Found" user={lh} onLogout={() => { logout(); router.push('/'); }}>
        <div className="glass-card p-12 text-center max-w-md mx-auto my-12">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Project Not Found</h2>
          <p className="text-xs text-[var(--text-muted)] mb-6">The requested project does not exist or has been deleted.</p>
          <Button variant="primary" size="sm" onClick={() => router.push('/dashboard/projects')}>
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={project.name}
      subtitle={`${project.project_code} • ${project.client_name || 'No Client'} • Created ${new Date(project.created_at).toLocaleDateString()}`}
      user={lh}
      onLogout={() => { logout(); router.push('/'); }}
      breadcrumbs={[{ label: 'Projects', href: '/dashboard/projects' }, { label: project.name }]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/projects')}>
            ← Back
          </Button>
          <Button variant="outline" size="sm" onClick={copyAllLinksAsCsv}>
            📋 Copy All Links (CSV)
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/projects/${project.id}/blocked`)} className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 flex items-center gap-1.5">
            🛡️ Fraud & Blocked
          </Button>
          <Button variant="outline" size="sm" onClick={openEditProject}>
            ✏️ Edit Project
          </Button>
          {project.status === 'ACTIVE' || project.status === 'LIVE' ? (
            <Button variant="outline" size="sm" className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10" onClick={() => setShowStatusModal('PAUSE')}>
              ⏸ Pause
            </Button>
          ) : project.status === 'PAUSED' ? (
            <Button variant="primary" size="sm" onClick={() => setShowStatusModal('RESUME')}>
              ▶ Resume
            </Button>
          ) : null}
          {project.status !== 'ARCHIVED' && (
            <Button variant="ghost" size="sm" className="text-rose-400 hover:bg-rose-500/10" onClick={() => setShowStatusModal('ARCHIVE')}>
              🗄 Archive
            </Button>
          )}
        </div>
      }
    >
      {/* ── Summary KPI Strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4 rounded-xl border border-[var(--border-primary)]/60">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Countries</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>{stats.countries}</span>
            <span className="text-xs font-normal text-[var(--text-muted)]">deployed</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-[var(--border-primary)]/60">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Target Quota</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>{stats.quota.toLocaleString()}</span>
            <span className="text-xs font-normal text-[var(--text-muted)]">completes</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-[var(--border-primary)]/60">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Tracking Links</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>{stats.links}</span>
            <span className="text-xs font-normal text-[var(--text-muted)]">live links</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-[var(--border-primary)]/60">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Vendors Engaged</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>{stats.vendors}</span>
            <span className="text-xs font-normal text-[var(--text-muted)]">suppliers</span>
          </div>
        </div>
      </div>

      {/* ── Project Header Details Card ────────────────────────────────────── */}
      <div className="glass-card p-5 mb-6 rounded-xl border border-[var(--border-primary)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusBadge(project.status)}`}>
                {project.status}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded">
                Code: {project.project_code}
              </span>
              {project.client_name && (
                <span className="text-xs text-[var(--text-secondary)]">
                  Client: <strong className="text-[var(--text-primary)]">{project.client_name}</strong>
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-[var(--text-secondary)] pt-1">{project.description}</p>
            )}
          </div>

          <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)]/70 p-3 rounded-lg border border-[var(--border-primary)]/40 max-w-md">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-[var(--text-secondary)]">Base Survey Destination:</span>
              <span className="font-mono text-[10px] text-emerald-400">UID Param: {project.uid_param || 'uid'}</span>
            </div>
            <div className="font-mono text-[11px] text-[var(--text-primary)] truncate" title={project.base_survey_url || project.survey_url}>
              {project.base_survey_url || project.survey_url || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Country Cards Section ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span>Countries & Vendor Tracking Links</span>
            <span className="text-xs font-normal text-[var(--text-muted)]">({project.countries?.length || 0})</span>
          </h2>
          <div className="text-xs text-[var(--text-muted)]">
            Click country header to expand/collapse
          </div>
        </div>

        {(!project.countries || project.countries.length === 0) ? (
          <div className="glass-card p-12 text-center rounded-xl border border-[var(--border-primary)]">
            <div className="text-3xl mb-2">🌐</div>
            <p className="text-sm text-[var(--text-secondary)] mb-1">No countries configured for this project.</p>
            <p className="text-xs text-[var(--text-muted)]">Add countries through the project wizard or settings.</p>
          </div>
        ) : (
          project.countries.map(c => {
            const isExp = expandedCountries[c.id] ?? (project.countries.length === 1);
            const totalVendorQuota = (c.links || []).reduce((s, l) => s + (l.vendor_quota || l.target_completes || 0), 0);
            const hasCompletes = (c.total_completes || 0) > 0;

            return (
              <div key={c.id} className="glass-card rounded-xl border border-[var(--border-primary)] overflow-hidden transition-all shadow-sm">
                {/* ── Country Header Accordion ── */}
                <div
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg-secondary)]/50 transition-colors gap-3 select-none"
                  onClick={() => toggleCountry(c.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{getFlag(c.country_code)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base text-[var(--text-primary)]">{c.country_name}</span>
                        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)]/50">
                          {c.country_code}
                        </span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>
                          {c.status}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          {c.total_completes || 0} / {c.target_completes} completes
                        </span>
                        {(c.unverified_hits || 0) > 0 ? (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                            <span>🚫</span>
                            <span>{c.unverified_hits} unverified hits</span>
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            0 unverified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1 flex-wrap">
                        <span>Rate: <strong className="text-[var(--text-primary)]">{c.currency} {c.client_rate}</strong> (Client)</span>
                        <span>•</span>
                        <span>Payout: <strong className="text-[var(--text-primary)]">{c.currency} {c.vendor_rate}</strong> (Vendor)</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">{c.margin_pct ?? 0}% Margin</span>
                        <span>•</span>
                        <span>{(c.links || []).length} vendor link{(c.links || []).length === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 self-end md:self-auto" onClick={e => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => openEditCountry(c)}>
                      ✏️ Edit
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => openAddVendor(c)}>
                      + Add Vendor
                    </Button>
                    <button
                      onClick={() => openDeleteCountry(c)}
                      disabled={hasCompletes}
                      title={hasCompletes ? `${c.total_completes} completes recorded — cannot delete` : 'Remove country'}
                      className={`p-1.5 rounded text-xs transition-colors ${
                        hasCompletes
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                      }`}
                    >
                      {hasCompletes ? '🔒' : '🗑'}
                    </button>
                    <div className="pl-1 text-[var(--text-muted)]">
                      <svg className={`w-5 h-5 transition-transform ${isExp ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* ── Expanded Content (Vendor Links) ── */}
                {isExp && (
                  <div className="border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]/20 p-4">
                    {/* Destination URL strip */}
                    <div className="mb-4 p-2.5 rounded-lg bg-[var(--bg-secondary)]/60 border border-[var(--border-primary)]/40 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-[var(--text-muted)] font-semibold shrink-0">Survey URL:</span>
                        <span className="font-mono text-[var(--text-secondary)] truncate">
                          {c.survey_url || project.base_survey_url || 'Using project default base survey URL'}
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-mono">
                        <span>Target: {c.target_completes}</span>
                        <span>•</span>
                        <span>Assigned: {totalVendorQuota}</span>
                      </div>
                    </div>

                    {/* Links list */}
                    {(!c.links || c.links.length === 0) ? (
                      <div className="p-8 text-center border border-dashed border-[var(--border-primary)] rounded-xl bg-[var(--bg-secondary)]/30">
                        <div className="text-2xl mb-1">🔗</div>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No Vendors Assigned</h4>
                        <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mb-4">
                          There are no vendors assigned to {c.country_name}. Assign a supplier to generate secure tracking links.
                        </p>
                        <Button variant="primary" size="sm" onClick={() => openAddVendor(c)}>
                          + Add First Vendor
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {c.links.map(l => {
                          const linkHasCompletes = (l.completes_count || 0) > 0;
                          const quotaLimit = l.vendor_quota || l.target_completes || 0;
                          const isCopied = copiedLinkMap[l.id];

                          return (
                            <div
                              key={l.id}
                              className="glass-card p-4 rounded-xl border border-[var(--border-primary)]/70 hover:border-[var(--accent-1)]/50 transition-colors bg-[var(--bg-secondary)]/40"
                            >
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                {/* Vendor & Quota Info */}
                                <div className="space-y-1.5 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                                      {l.vendor_name || 'Vendor Assignment'}
                                    </span>
                                    {l.vendor_code && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-primary)]">
                                        {l.vendor_code}
                                      </span>
                                    )}
                                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      {l.link_code}
                                    </span>
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                                      Quota: <strong className="text-[var(--text-primary)]">{l.completes_count || 0} / {quotaLimit}</strong>
                                    </span>
                                    {l.vendor_cpi !== undefined && (
                                      <span className="text-xs text-[var(--text-muted)]">
                                        CPI: <strong className="text-[var(--text-secondary)]">{c.currency} {l.vendor_cpi}</strong>
                                      </span>
                                    )}
                                  </div>

                                  {/* Full Tracking URL */}
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-[var(--text-secondary)] truncate max-w-2xl bg-[var(--bg-primary)] px-2.5 py-1 rounded border border-[var(--border-primary)]/50 select-all">
                                      {l.full_url || `https://opi.opinioninsights.in/track?code=${project.project_code}&country=${c.country_code}&vendor=${l.vendor_code || l.vendor_id}&uid={UID}`}
                                    </span>
                                  </div>
                                </div>

                                {/* Link Actions */}
                                <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={isCopied ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : ''}
                                    onClick={() => copyToClipboard(l.full_url || '', l.id)}
                                  >
                                    {isCopied ? '✓ Copied' : '📋 Copy Link'}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(l.full_url || '', '_blank')}
                                  >
                                    ↗ Preview
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={linkHasCompletes}
                                    title={linkHasCompletes ? `${l.completes_count} completes recorded — cannot regenerate` : 'Regenerate link code'}
                                    className={linkHasCompletes ? 'opacity-40 cursor-not-allowed' : 'text-amber-400 hover:bg-amber-500/10'}
                                    onClick={() => openRegenerateModal(l)}
                                  >
                                    {linkHasCompletes ? '🔒 Locked' : '🔄 Regenerate'}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditQuota(c, l)}
                                  >
                                    Quota
                                  </Button>
                                  <button
                                    onClick={() => openDeleteVendor(c, l)}
                                    disabled={linkHasCompletes}
                                    title={linkHasCompletes ? `${l.completes_count} completes recorded — cannot remove` : 'Remove vendor'}
                                    className={`p-1.5 rounded text-xs transition-colors ${
                                      linkHasCompletes
                                        ? 'text-gray-600 cursor-not-allowed'
                                        : 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                                    }`}
                                  >
                                    {linkHasCompletes ? '🔒' : '🗑'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL: Edit Project ─────────────────────────────────────────────── */}
      {showEditProject && (
        <Modal title="Edit Project Details" onClose={() => setShowEditProject(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--bg-secondary)]/50 rounded-lg text-xs border border-[var(--border-primary)]/40">
              <div>
                <span className="text-[var(--text-muted)]">Project Code (Immutable):</span>
                <div className="font-mono font-semibold text-[var(--text-primary)]">{project.project_code}</div>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Client (Immutable):</span>
                <div className="font-semibold text-[var(--text-primary)]">{project.client_name || '—'}</div>
              </div>
            </div>

            <Input
              label="Project Name"
              value={projectForm.name}
              onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
              required
            />
            <Textarea
              label="Description"
              value={projectForm.description}
              onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
              placeholder="Internal project notes and scope..."
              rows={2}
            />
            <Input
              label="Default Base Survey URL (HTTPS)"
              value={projectForm.base_survey_url}
              onChange={e => setProjectForm({ ...projectForm, base_survey_url: e.target.value })}
              placeholder="https://client-survey.com/s/123"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="UID Parameter Name"
                value={projectForm.uid_param}
                onChange={e => setProjectForm({ ...projectForm, uid_param: e.target.value })}
                placeholder="uid"
                required
              />
              <Input
                label="Callback URL Base"
                value={projectForm.callback_url_base}
                onChange={e => setProjectForm({ ...projectForm, callback_url_base: e.target.value })}
                placeholder="https://opi.opinioninsights.in/api/callback"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-primary)]">
              <Button variant="ghost" size="sm" onClick={() => setShowEditProject(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={actionLoading} onClick={handleSaveProject}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Edit Country ─────────────────────────────────────────────── */}
      {showEditCountry && activeCountry && (
        <Modal title={`Edit Country — ${activeCountry.country_name}`} onClose={() => setShowEditCountry(false)}>
          <div className="space-y-4">
            {(activeCountry.total_completes || 0) > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                <span>🔒</span>
                <span>
                  <strong>{activeCountry.total_completes} completes recorded.</strong> Rates and target quota are locked to preserve billing integrity.
                </span>
              </div>
            )}

            <Input
              label="Destination Survey URL Override (Editable anytime)"
              value={countryForm.survey_url}
              onChange={e => setCountryForm({ ...countryForm, survey_url: e.target.value })}
              placeholder={project.base_survey_url || 'https://...'}
            />

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Currency"
                value={countryForm.currency}
                disabled={(activeCountry.total_completes || 0) > 0}
                onChange={e => setCountryForm({ ...countryForm, currency: e.target.value.toUpperCase() })}
              />
              <Input
                label="Client Rate"
                type="number"
                step="0.01"
                value={countryForm.client_rate}
                disabled={(activeCountry.total_completes || 0) > 0}
                onChange={e => setCountryForm({ ...countryForm, client_rate: e.target.value })}
              />
              <Input
                label="Vendor Rate"
                type="number"
                step="0.01"
                value={countryForm.vendor_rate}
                disabled={(activeCountry.total_completes || 0) > 0}
                onChange={e => setCountryForm({ ...countryForm, vendor_rate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Target Quota"
                type="number"
                value={countryForm.target_completes}
                disabled={(activeCountry.total_completes || 0) > 0}
                onChange={e => setCountryForm({ ...countryForm, target_completes: e.target.value })}
              />
              <Input
                label="Est. LOI (min)"
                type="number"
                value={countryForm.est_loi}
                disabled={(activeCountry.total_completes || 0) > 0}
                onChange={e => setCountryForm({ ...countryForm, est_loi: e.target.value })}
              />
              <Input
                label="Fieldwork (days)"
                type="number"
                value={countryForm.fieldwork_days}
                disabled={(activeCountry.total_completes || 0) > 0}
                onChange={e => setCountryForm({ ...countryForm, fieldwork_days: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-primary)]">
              <Button variant="ghost" size="sm" onClick={() => setShowEditCountry(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={actionLoading} onClick={handleSaveCountry}>
                Save Country
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Add Vendor ───────────────────────────────────────────────── */}
      {showAddVendor && activeCountry && (
        <Modal title={`Add Vendor to ${activeCountry.country_name}`} onClose={() => setShowAddVendor(false)}>
          <div className="space-y-4">
            {(() => {
              const assignedIds = new Set((activeCountry.links || []).map(l => l.vendor_id).filter(Boolean));
              const available = allVendors.filter(v => !assignedIds.has(v.id));
              const totalAssigned = (activeCountry.links || []).reduce((s, l) => s + (l.vendor_quota || l.target_completes || 0), 0);
              const remaining = Math.max(0, (activeCountry.target_completes || 0) - totalAssigned);

              if (available.length === 0) {
                return (
                  <div className="p-6 text-center text-sm text-[var(--text-muted)]">
                    All available vendors have already been assigned to this country.
                  </div>
                );
              }

              return (
                <>
                  <div className="p-3 bg-[var(--bg-secondary)]/50 rounded-lg text-xs space-y-1 border border-[var(--border-primary)]/40">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Country Target Quota:</span>
                      <strong className="text-[var(--text-primary)]">{activeCountry.target_completes}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Remaining Unallocated Quota:</span>
                      <strong className="text-emerald-400">{remaining}</strong>
                    </div>
                  </div>

                  <Select
                    label="Select Vendor"
                    value={vendorForm.vendor_id}
                    onChange={e => setVendorForm({ ...vendorForm, vendor_id: e.target.value })}
                    options={available.map(v => ({ value: v.id, label: `${v.name} (${v.vendor_code || 'No Code'})` }))}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Allocated Quota"
                      type="number"
                      value={vendorForm.quota}
                      onChange={e => setVendorForm({ ...vendorForm, quota: e.target.value })}
                      required
                    />
                    <Input
                      label={`Vendor CPI (${activeCountry.currency})`}
                      type="number"
                      step="0.01"
                      value={vendorForm.vendor_cpi}
                      onChange={e => setVendorForm({ ...vendorForm, vendor_cpi: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-primary)]">
                    <Button variant="ghost" size="sm" onClick={() => setShowAddVendor(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" loading={actionLoading} onClick={handleAddVendor}>
                      Assign Vendor & Generate Link
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* ── MODAL: Edit Vendor Quota ────────────────────────────────────────── */}
      {showEditQuota && activeLink && activeCountry && (
        <Modal title={`Edit Quota for ${activeLink.vendor_name || 'Vendor'}`} onClose={() => setShowEditQuota(false)}>
          <div className="space-y-4">
            {(() => {
              const otherQuota = (activeCountry.links || [])
                .filter(l => l.id !== activeLink.id)
                .reduce((s, l) => s + (l.vendor_quota || l.target_completes || 0), 0);
              const maxAvailable = Math.max(0, (activeCountry.target_completes || 0) - otherQuota);

              return (
                <>
                  <div className="p-3 bg-[var(--bg-secondary)]/50 rounded-lg text-xs space-y-1 border border-[var(--border-primary)]/40">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Country Target:</span>
                      <span className="text-[var(--text-primary)] font-semibold">{activeCountry.target_completes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Max Allowed For This Vendor:</span>
                      <span className="text-emerald-400 font-semibold">{maxAvailable}</span>
                    </div>
                  </div>

                  <Input
                    label="Vendor Quota"
                    type="number"
                    value={editQuotaValue}
                    onChange={e => setEditQuotaValue(e.target.value)}
                    required
                  />

                  <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-primary)]">
                    <Button variant="ghost" size="sm" onClick={() => setShowEditQuota(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" loading={actionLoading} onClick={handleSaveQuota}>
                      Update Quota
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* ── MODAL: Regenerate Link Warning ──────────────────────────────────── */}
      {showRegenerateModal && activeLink && (
        <Modal title="Regenerate Tracking Link" onClose={() => setShowRegenerateModal(false)}>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              <p className="font-semibold mb-1">⚠️ Warning: Irreversible Action</p>
              <p>
                The old link code (<code className="font-mono text-white">{activeLink.link_code}</code>) will immediately stop working. Any respondent using the old link will receive an HTTP 404 error.
              </p>
            </div>

            <p className="text-sm text-[var(--text-secondary)]">
              A new link code strictly formatted as <code className="font-mono text-emerald-400">lnk_xxxxxxxxxxxx</code> will be generated and assigned.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-primary)]">
              <Button variant="ghost" size="sm" onClick={() => setShowRegenerateModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={actionLoading} onClick={handleRegenerateLink}>
                Yes, Regenerate Link
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Remove Vendor Confirmation ───────────────────────────────── */}
      {showDeleteVendorModal && activeLink && (
        <Modal title="Remove Vendor Assignment" onClose={() => setShowDeleteVendorModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to remove <strong>{activeLink.vendor_name || 'this vendor'}</strong> and delete its tracking link?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-primary)]">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteVendorModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" loading={actionLoading} onClick={handleDeleteVendor}>
                Remove Vendor
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Remove Country Confirmation ──────────────────────────────── */}
      {showDeleteCountryModal && activeCountry && (
        <Modal title={`Remove ${activeCountry.country_name}`} onClose={() => setShowDeleteCountryModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to remove <strong>{activeCountry.country_name}</strong> and all its associated tracking links?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-primary)]">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteCountryModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" loading={actionLoading} onClick={handleDeleteCountry}>
                Remove Country
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Pause / Resume / Archive ─────────────────────────────────── */}
      {showStatusModal && (
        <Modal
          title={
            showStatusModal === 'PAUSE'
              ? 'Pause Project'
              : showStatusModal === 'RESUME'
              ? 'Resume Project'
              : 'Archive Project'
          }
          onClose={() => setShowStatusModal(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              {showStatusModal === 'PAUSE' &&
                'Pausing this project will immediately block new survey starts across all tracking links. Active in-flight sessions will still be accepted.'}
              {showStatusModal === 'RESUME' &&
                'Resuming this project will re-activate all tracking links and allow respondents to enter the survey.'}
              {showStatusModal === 'ARCHIVE' &&
                'Archiving this project will make it read-only and close all tracking links permanently. Only Super Admins can unarchive.'}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-primary)]">
              <Button variant="ghost" size="sm" onClick={() => setShowStatusModal(null)}>
                Cancel
              </Button>
              <Button
                variant={showStatusModal === 'ARCHIVE' ? 'danger' : 'primary'}
                size="sm"
                loading={actionLoading}
                onClick={() => handleStatusChange(showStatusModal)}
              >
                Confirm {showStatusModal}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}