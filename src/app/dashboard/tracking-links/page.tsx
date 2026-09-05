"use client";

import React, { useEffect, useState, useMemo } from 'react';
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

interface Study {
  id: string;
  study_code?: string;
  title: string;
  survey_url?: string;
}

interface Vendor {
  id: string;
  vendor_code?: string;
  name: string;
}

interface TrackingLink {
  id: string;
  link_code: string;
  study_id: string;
  vendor_id?: string;
  destination_url?: string;
  base_url?: string;
  uid_mode?: string;
  status: string;
  click_count?: number;
  created_at: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function TrackingLinksPage() {
  const { user, isAuthenticated, isLoading: authLoading, role, vendor_id } = useAuthState();
  const { showToast } = useToast();
  
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [studyFilter, setStudyFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    study_id: '',
    vendor_id: '',
    link_code: '',
    destination_url: '',
    uid_mode: 'AUTO',
  });

  useEffect(() => {
    const unsubscribe = subscribe(() => {});
    checkAuth();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, studyFilter, vendorFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (studyFilter) params.study_id = studyFilter;
      if (role === 'VENDOR' && vendor_id) {
        params.vendor_id = vendor_id;
      } else if (vendorFilter) {
        params.vendor_id = vendorFilter;
      }

      const [linksRes, studiesRes, vendorsRes] = await Promise.all([
        apiClient.get<any>('/tracking-links', Object.keys(params).length ? params : undefined),
        apiClient.get<any>('/studies'),
        role !== 'VENDOR' ? apiClient.get<any>('/vendors') : Promise.resolve({ data: [] }),
      ]);

      const rawLinks = linksRes?.data || linksRes?.links || (Array.isArray(linksRes) ? linksRes : []);
      const rawStudies = studiesRes?.data || studiesRes?.studies || (Array.isArray(studiesRes) ? studiesRes : []);
      const rawVendors = vendorsRes?.data || vendorsRes?.vendors || (Array.isArray(vendorsRes) ? vendorsRes : []);

      setLinks(rawLinks);
      setStudies(rawStudies);
      setVendors(rawVendors);
    } catch (err: any) {
      showToast(err.message || 'Failed to load tracking links', 'error');
    } finally {
      setLoading(false);
    }
  };

  const studyMap = useMemo(() => {
    const map: Record<string, { title: string; code: string; url?: string }> = {};
    studies.forEach((s) => {
      map[s.id] = { title: s.title, code: s.study_code || '', url: s.survey_url };
    });
    return map;
  }, [studies]);

  const vendorMap = useMemo(() => {
    const map: Record<string, { name: string; code: string }> = {};
    vendors.forEach((v) => {
      map[v.id] = { name: v.name, code: v.vendor_code || '' };
    });
    return map;
  }, [vendors]);

  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return links;
    const q = searchQuery.toLowerCase();
    return links.filter((l) => {
      const studyInfo = studyMap[l.study_id];
      const vendorInfo = l.vendor_id ? vendorMap[l.vendor_id] : null;
      return (
        l.link_code?.toLowerCase().includes(q) ||
        studyInfo?.title?.toLowerCase().includes(q) ||
        studyInfo?.code?.toLowerCase().includes(q) ||
        vendorInfo?.name?.toLowerCase().includes(q) ||
        vendorInfo?.code?.toLowerCase().includes(q)
      );
    });
  }, [links, searchQuery, studyMap, vendorMap]);

  const handleCreate = async () => {
    if (!form.study_id) {
      showToast('Please select a study', 'error');
      return;
    }
    if (!form.link_code.trim()) {
      showToast('Please provide a link code', 'error');
      return;
    }

    try {
      await apiClient.post('/tracking-links', {
        study_id: form.study_id,
        vendor_id: form.vendor_id || undefined,
        link_code: form.link_code.trim().toUpperCase(),
        destination_url: form.destination_url || undefined,
        uid_mode: form.uid_mode,
      });
      showToast('Tracking link created successfully', 'success');
      setShowCreate(false);
      setForm({ study_id: '', vendor_id: '', link_code: '', destination_url: '', uid_mode: 'AUTO' });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create tracking link', 'error');
    }
  };

  const handleCopyLink = (code: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const fullUrl = `${origin}/api/start/${code}?uid=PANEL_USER_ID`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    showToast('Tracking link copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const generateRandomCode = () => {
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    setForm((prev) => ({ ...prev, link_code: `TL-${rand}` }));
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
      title="Tracking Links"
      subtitle="Enterprise entry point links with dynamic vendor tracking & security verification"
      actions={
        role !== 'VENDOR' ? (
          <Button variant="primary" onClick={() => { generateRandomCode(); setShowCreate(true); }}>
            + Create Link
          </Button>
        ) : undefined
      }
    >
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-6 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search by link code, study, or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-1)]"
          />
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <select
            value={studyFilter}
            onChange={(e) => setStudyFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-1)]"
            aria-label="Filter by study"
          >
            <option value="">All Studies</option>
            {studies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.study_code ? `[${s.study_code}] ` : ''}{s.title}
              </option>
            ))}
          </select>

          {role !== 'VENDOR' && (
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-1)]"
              aria-label="Filter by vendor"
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vendor_code ? `[${v.vendor_code}] ` : ''}{v.name}
                </option>
              ))}
            </select>
          )}

          {(studyFilter || vendorFilter || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStudyFilter('');
                setVendorFilter('');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-64 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]" />
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <div className="text-4xl mb-3">🔗</div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Tracking Links Found</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {searchQuery || studyFilter || vendorFilter
              ? "No links match the selected filter criteria."
              : "Generate tracking links to route panel participants to active fieldwork surveys."}
          </p>
          {role !== 'VENDOR' && (
            <Button variant="primary" onClick={() => { generateRandomCode(); setShowCreate(true); }}>
              Create Your First Link
            </Button>
          )}
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'link_code',
              header: 'Link Code & Test URL',
              render: (row: TrackingLink) => (
                <div className="flex flex-col gap-1 py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--accent-1)] select-all">
                      {row.link_code}
                    </span>
                    <button
                      onClick={() => handleCopyLink(row.link_code, row.id)}
                      title="Copy survey entry URL to clipboard"
                      className="text-xs px-2 py-0.5 rounded bg-[var(--glass-bg)] hover:bg-[var(--accent-1)] hover:text-white border border-[var(--glass-border)] transition-colors inline-flex items-center gap-1 font-medium"
                    >
                      {copiedId === row.id ? '✓ Copied' : '📋 Copy URL'}
                    </button>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] truncate max-w-xs" title={`/api/start/${row.link_code}?uid=...`}>
                    /api/start/{row.link_code}?uid=...
                  </span>
                </div>
              ),
            },
            {
              key: 'study_id',
              header: 'Study / Project',
              render: (row: TrackingLink) => {
                const s = studyMap[row.study_id];
                return (
                  <div className="flex flex-col min-w-[160px] py-1">
                    <span className="font-semibold text-sm text-[var(--text-primary)] leading-snug">
                      {s?.title || 'Unknown Study'}
                    </span>
                    {s?.code && (
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        Code: {s.code}
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'vendor_id',
              header: 'Assigned Vendor',
              render: (row: TrackingLink) => {
                if (!row.vendor_id) {
                  return (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                      Internal / Direct
                    </span>
                  );
                }
                const v = vendorMap[row.vendor_id];
                return (
                  <div className="flex flex-col py-1">
                    <span className="font-medium text-sm text-[var(--text-primary)]">
                      {v?.name || row.vendor_id}
                    </span>
                    {v?.code && (
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        {v.code}
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'uid_mode',
              header: 'UID Mode',
              render: (row: TrackingLink) => (
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--text-secondary)]">
                  {row.uid_mode || 'AUTO'}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row: TrackingLink) => <StatusBadge status={row.status || 'ACTIVE'} />,
            },
            {
              key: 'created_at',
              header: 'Created',
              render: (row: TrackingLink) => (
                <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                  {formatDate(row.created_at)}
                </span>
              ),
            },
          ]}
          data={filteredLinks}
          keyField="id"
        />
      )}

      {/* Modal: Create Tracking Link */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Tracking Link">
        <div className="space-y-4">
          <Select
            label="Target Study *"
            options={[
              { value: '', label: '-- Select a study --' },
              ...studies.map((s) => ({
                value: s.id,
                label: `${s.study_code ? `[${s.study_code}] ` : ''}${s.title}`,
              })),
            ]}
            value={form.study_id}
            onChange={(e) => {
              const selectedStudy = studies.find(s => s.id === e.target.value);
              setForm({
                ...form,
                study_id: e.target.value,
                destination_url: selectedStudy?.survey_url || form.destination_url,
              });
            }}
            required
          />

          <Select
            label="Assigned Vendor (Optional)"
            options={[
              { value: '', label: 'Internal / Direct (No specific vendor)' },
              ...vendors.map((v) => ({
                value: v.id,
                label: `${v.vendor_code ? `[${v.vendor_code}] ` : ''}${v.name}`,
              })),
            ]}
            value={form.vendor_id}
            onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
          />

          <FormRow>
            <Input
              label="Unique Link Code *"
              placeholder="TL-XYZ123"
              value={form.link_code}
              onChange={(e) => setForm({ ...form, link_code: e.target.value.toUpperCase() })}
              required
            />
            <Select
              label="UID Capture Mode"
              options={[
                { value: 'AUTO', label: 'Auto (Generated UUID)' },
                { value: 'MANUAL', label: 'Manual' },
                { value: 'QUERY', label: 'Query Parameter (?uid=...)' },
              ]}
              value={form.uid_mode}
              onChange={(e) => setForm({ ...form, uid_mode: e.target.value })}
            />
          </FormRow>

          <Input
            label="Custom Destination URL (Overrides study URL if provided)"
            placeholder="https://client-survey.com/survey?id=123"
            value={form.destination_url}
            onChange={(e) => setForm({ ...form, destination_url: e.target.value })}
          />
        </div>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate}>Create Link</Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  );
}