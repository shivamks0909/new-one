"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea, FormRow } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';
import { Plus, Trash2, ArrowRight, ArrowLeft, Check, Play, Settings, Globe, Link as LinkIcon, Users, BarChart3 } from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface Project {
  id: string;
  project_code: string;
  name: string;
  description?: string;
  client_id?: string;
  client_name?: string;
  status: string;
  created_at: string;
  countries_count?: number;
  links_count?: number;
}

interface ProjectCountry {
  id?: string;
  country_code: string;
  country_name: string;
  links?: ProjectLink[];
}

interface ProjectLink {
  id?: string;
  country_id?: string;
  link_code: string;
  link_name: string;
  url: string;
  uid_mode?: string;
  vendor_assignments?: LinkVendor[];
}

interface LinkVendor {
  id?: string;
  link_id?: string;
  vendor_id: string;
  vendor_name?: string;
  vendor_cpi?: number;
  target_completes?: number;
}

interface Vendor {
  id: string;
  vendor_code: string;
  name: string;
  status: string;
}

interface Client {
  id: string;
  client_code: string;
  name: string;
  status: string;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_TABS = ['All', 'Live', 'Draft', 'Paused', 'Closed'] as const;
const STATUS_MAP: Record<string, string | null> = {
  All: null, Live: 'LIVE', Draft: 'DRAFT', Paused: 'PAUSED', Closed: 'CLOSED',
};

const WIZARD_STEPS = [
  { label: 'Project Info', icon: Settings },
  { label: 'Countries', icon: Globe },
  { label: 'Survey Links', icon: LinkIcon },
  { label: 'Vendors', icon: Users },
  { label: 'Quotas', icon: BarChart3 },
  { label: 'Review & Launch', icon: Play },
];

const COUNTRIES_LIST = [
  { code: 'IN', name: 'India' }, { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' }, { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' }, { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australia' }, { code: 'CA', name: 'Canada' },
  { code: 'AE', name: 'UAE' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'ID', name: 'Indonesia' }, { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' }, { code: 'TH', name: 'Thailand' },
  { code: 'PL', name: 'Poland' }, { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' }, { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' }, { code: 'EG', name: 'Egypt' },
  { code: 'PK', name: 'Pakistan' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'TR', name: 'Turkey' }, { code: 'KR', name: 'South Korea' },
];

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function ProjectsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardSaving, setWizardSaving] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // Step 1: Project info
  const [projectForm, setProjectForm] = useState({
    project_code: `PRJ-${Date.now().toString().slice(-4)}`,
    name: '', client_id: '', description: '',
  });

  // Step 2: Countries
  const [countries, setCountries] = useState<ProjectCountry[]>([]);

  // Step 3: Links (keyed by country code)
  const [linksMap, setLinksMap] = useState<Record<string, ProjectLink[]>>({});

  // Step 4: Vendor assignments (keyed by "countryCode-linkCode")
  const [vendorsMap, setVendorsMap] = useState<Record<string, LinkVendor[]>>({});

  // Reference data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  /* ── Data loading ──────────────────────────────────────────────────────── */
  useEffect(() => { const u = subscribe(() => {}); checkAuth(); return u; }, []);
  useEffect(() => { if (isAuthenticated) loadProjects(); }, [isAuthenticated]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ data: Project[] }>('/projects');
      setProjects(data.data || []);
    } catch { showToast('Failed to load projects', 'error'); }
    finally { setLoading(false); }
  };

  const loadReferenceData = async () => {
    try {
      const [vRes, cRes] = await Promise.all([
        apiClient.get<{ data: Vendor[] }>('/vendors').catch(() => ({ data: [] })),
        apiClient.get<{ data: Client[] }>('/clients').catch(() => ({ data: [] })),
      ]);
      setVendors(vRes.data || []);
      setClients(cRes.data || []);
    } catch { /* optional */ }
  };

  /* ── Filtered projects ─────────────────────────────────────────────────── */
  const filteredProjects = useMemo(() => {
    const status = STATUS_MAP[statusFilter];
    if (!status) return projects;
    return projects.filter(p => p.status === status);
  }, [projects, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: projects.length };
    projects.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return counts;
  }, [projects]);

  /* ── Wizard actions ────────────────────────────────────────────────────── */
  const openWizard = () => {
    setWizardStep(0);
    setCreatedProjectId(null);
    setProjectForm({
      project_code: `PRJ-${Date.now().toString().slice(-4)}`,
      name: '', client_id: '', description: '',
    });
    setCountries([]);
    setLinksMap({});
    setVendorsMap({});
    loadReferenceData();
    setWizardOpen(true);
  };

  const continueSetup = (project: Project) => {
    setCreatedProjectId(project.id);
    setProjectForm({
      project_code: project.project_code,
      name: project.name,
      client_id: project.client_id || '',
      description: project.description || '',
    });
    setCountries([]);
    setLinksMap({});
    setVendorsMap({});
    loadReferenceData();
    setWizardStep(1); // Skip step 1 since project already created
    setWizardOpen(true);
  };

  const wizardNext = async () => {
    if (wizardStep === 0) {
      // Create project
      if (!projectForm.project_code || !projectForm.name) {
        showToast('Project Code and Name are required', 'error');
        return;
      }
      try {
        const res = await apiClient.post<{ data: Project }>('/projects', {
          project_code: projectForm.project_code,
          name: projectForm.name,
          client_id: projectForm.client_id || undefined,
          description: projectForm.description,
        });
        setCreatedProjectId(res.data.id);
        showToast('Project created (Draft)', 'success');
        setWizardStep(1);
      } catch (err: any) {
        showToast(err.message || 'Failed to create project', 'error');
      }
    } else if (wizardStep === 1) {
      // Save countries
      if (countries.length === 0) {
        showToast('Add at least one country', 'error');
        return;
      }
      if (createdProjectId) {
        try {
          for (const c of countries) {
            if (!c.id) {
              const res = await apiClient.post<{ data: ProjectCountry }>(
                `/projects/${createdProjectId}/countries`,
                { country_code: c.country_code, country_name: c.country_name }
              );
              c.id = res.data.id;
            }
          }
          await apiClient.put(`/projects/${createdProjectId}`, { status: 'CONFIGURING' });
          setWizardStep(2);
        } catch (err: any) {
          showToast(err.message || 'Failed to save countries', 'error');
        }
      }
    } else if (wizardStep === 2) {
      // Save links
      if (createdProjectId) {
        try {
          for (const ci of countries) {
            const links = linksMap[ci.country_code] || [];
            for (const l of links) {
              if (!l.id && ci.id) {
                const res = await apiClient.post<{ data: ProjectLink }>(
                  `/countries/${ci.id}/links`,
                  { link_code: l.link_code, link_name: l.link_name, url: l.url, uid_mode: l.uid_mode || 'PROVIDED_UID' }
                );
                l.id = res.data.id;
                l.country_id = ci.id;
              }
            }
          }
          setWizardStep(3);
        } catch (err: any) {
          showToast(err.message || 'Failed to save links', 'error');
        }
      }
    } else if (wizardStep === 3) {
      // Save vendor assignments
      if (createdProjectId) {
        try {
          for (const ci of countries) {
            const links = linksMap[ci.country_code] || [];
            for (const l of links) {
              if (!l.id) continue;
              const assigned = vendorsMap[`${ci.country_code}-${l.link_code}`] || [];
              for (const v of assigned) {
                if (!v.id) {
                  await apiClient.post(`/links/${l.id}/vendors`, {
                    vendor_id: v.vendor_id,
                    vendor_cpi: v.vendor_cpi || 0,
                    target_completes: v.target_completes || 0,
                  });
                }
              }
            }
          }
          await apiClient.put(`/projects/${createdProjectId}`, { status: 'VALIDATING' });
          setWizardStep(4);
        } catch (err: any) {
          showToast(err.message || 'Failed to save vendor assignments', 'error');
        }
      }
    } else if (wizardStep === 4) {
      // Quotas are optional, move to review
      setWizardStep(5);
    } else if (wizardStep === 5) {
      // Launch
      if (createdProjectId) {
        setWizardSaving(true);
        try {
          await apiClient.post(`/projects/${createdProjectId}/launch`, {});
          showToast('Project launched!', 'success');
          setWizardOpen(false);
          loadProjects();
        } catch (err: any) {
          showToast(err.message || 'Launch failed — check all steps are complete', 'error');
        } finally {
          setWizardSaving(false);
        }
      }
    }
  };

  const wizardBack = () => {
    if (wizardStep > 0) setWizardStep(wizardStep - 1);
  };

  /* ── Country helpers ────────────────────────────────────────────────────── */
  const addCountry = (code: string, name: string) => {
    if (countries.find(c => c.country_code === code)) return;
    setCountries([...countries, { country_code: code, country_name: name }]);
  };

  const removeCountry = (code: string) => {
    setCountries(countries.filter(c => c.country_code !== code));
    // Also remove links for this country
    const newLinksMap = { ...linksMap };
    delete newLinksMap[code];
    setLinksMap(newLinksMap);
  };

  /* ── Link helpers ───────────────────────────────────────────────────────── */
  const addLink = (countryCode: string) => {
    const links = linksMap[countryCode] || [];
    setLinksMap({
      ...linksMap,
      [countryCode]: [...links, { link_code: '', link_name: '', url: '', uid_mode: 'PROVIDED_UID' }],
    });
  };

  const updateLink = (countryCode: string, idx: number, field: string, value: string) => {
    const links = [...(linksMap[countryCode] || [])];
    links[idx] = { ...links[idx], [field]: value };
    setLinksMap({ ...linksMap, [countryCode]: links });
  };

  const removeLink = (countryCode: string, idx: number) => {
    const links = (linksMap[countryCode] || []).filter((_, i) => i !== idx);
    setLinksMap({ ...linksMap, [countryCode]: links });
  };

  /* ── Vendor assignment helpers ──────────────────────────────────────────── */
  const addVendorAssignment = (key: string) => {
    const assigned = vendorsMap[key] || [];
    setVendorsMap({ ...vendorsMap, [key]: [...assigned, { vendor_id: '' }] });
  };

  const updateVendorAssignment = (key: string, idx: number, field: string, value: string | number) => {
    const assigned = [...(vendorsMap[key] || [])];
    assigned[idx] = { ...assigned[idx], [field]: value };
    setVendorsMap({ ...vendorsMap, [key]: assigned });
  };

  const removeVendorAssignment = (key: string, idx: number) => {
    const assigned = (vendorsMap[key] || []).filter((_, i) => i !== idx);
    setVendorsMap({ ...vendorsMap, [key]: assigned });
  };

  /* ── Review summary ─────────────────────────────────────────────────────── */
  const reviewSummary = useMemo(() => {
    let totalLinks = 0;
    let totalVendors = 0;
    countries.forEach(ci => {
      const links = linksMap[ci.country_code] || [];
      totalLinks += links.length;
      links.forEach(l => {
        const key = `${ci.country_code}-${l.link_code}`;
        totalVendors += (vendorsMap[key] || []).length;
      });
    });
    return { countries: countries.length, links: totalLinks, vendors: totalVendors };
  }, [countries, linksMap, vendorsMap]);

  const canLaunch = reviewSummary.countries > 0 && reviewSummary.links > 0 && reviewSummary.vendors > 0;

  /* ── Logout ─────────────────────────────────────────────────────────────── */
  const handleLogout = () => { logout(); router.push('/'); };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <div className="w-10 h-10 rounded-full border-[3px] border-[var(--border)] border-t-[var(--blue)] animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  /* ── Table columns ──────────────────────────────────────────────────────── */
  const columns = [
    {
      key: 'project_code', header: 'Code',
      render: (row: Project) => (
        <span className="font-mono text-[11px] font-semibold text-[var(--blue)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded border border-[var(--border)]">
          {row.project_code || '—'}
        </span>
      ),
    },
    { key: 'name', header: 'Project Name', render: (row: Project) => <span className="font-medium text-[var(--text-heading)]">{row.name}</span> },
    { key: 'client_name', header: 'Client', render: (row: Project) => <span className="text-[var(--text-muted)]">{row.client_name || '—'}</span> },
    { key: 'status', header: 'Status', render: (row: Project) => <StatusBadge status={row.status} /> },
    { key: 'created_at', header: 'Created', render: (row: Project) => <span className="text-[12px] text-[var(--text-muted)] tabular-nums">{formatDate(row.created_at)}</span> },
    {
      key: 'actions', header: '',
      render: (row: Project) => (
        <div className="flex items-center justify-end gap-2">
          {['DRAFT', 'CONFIGURING', 'VALIDATING'].includes(row.status) ? (
            <Button variant="primary" size="sm" onClick={(e) => { e?.stopPropagation(); continueSetup(row); }}>
              <Settings className="w-3 h-3 mr-1" /> Continue Setup
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={(e) => { e?.stopPropagation(); router.push(`/dashboard/projects/${row.id}`); }}>
              View
            </Button>
          )}
        </div>
      ),
    },
  ];

  /* ── Wizard step content ────────────────────────────────────────────────── */
  const renderWizardStep = () => {
    switch (wizardStep) {
      case 0: // Project Info
        return (
          <div className="space-y-4">
            <FormRow>
              <Input label="Project Code" placeholder="PRJ-2026-US" value={projectForm.project_code}
                onChange={e => setProjectForm({ ...projectForm, project_code: e.target.value })} required />
              <Input label="Client ID" placeholder="Optional" value={projectForm.client_id}
                onChange={e => setProjectForm({ ...projectForm, client_id: e.target.value })} />
            </FormRow>
            <Input label="Project Name" placeholder="Consumer Electronics Q1 Tracker" value={projectForm.name}
              onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} required />
            <Textarea label="Description" placeholder="Short project description" value={projectForm.description}
              onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} rows={3} />
          </div>
        );

      case 1: // Countries
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Select label="" value="" onChange={e => {
                const c = COUNTRIES_LIST.find(x => x.code === e.target.value);
                if (c) addCountry(c.code, c.name);
              }}
                className="flex-1"
                options={[{ value: '', label: 'Add a country...' }, ...COUNTRIES_LIST.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))]} />
            </div>
            {countries.length === 0 ? (
              <p className="text-[13px] text-[var(--text-muted)] text-center py-4">No countries added yet</p>
            ) : (
              <div className="space-y-2">
                {countries.map(c => (
                  <div key={c.country_code} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]">
                    <span className="text-[13px] font-medium text-[var(--text-heading)]">{c.country_name} <span className="text-[var(--text-muted)]">({c.country_code})</span></span>
                    <button onClick={() => removeCountry(c.country_code)} className="text-[var(--danger)] hover:opacity-80">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 2: // Survey Links
        return (
          <div className="space-y-5 max-h-[400px] overflow-y-auto pr-1">
            {countries.length === 0 ? (
              <p className="text-[13px] text-[var(--text-muted)] text-center py-4">Go back and add countries first</p>
            ) : countries.map(ci => {
              const links = linksMap[ci.country_code] || [];
              return (
                <div key={ci.country_code} className="border border-[var(--border)] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[13px] font-semibold text-[var(--text-heading)]">{ci.country_name}</h4>
                    <Button variant="ghost" size="sm" onClick={() => addLink(ci.country_code)}>
                      <Plus className="w-3 h-3 mr-1" /> Add Link
                    </Button>
                  </div>
                  {links.length === 0 ? (
                    <p className="text-[12px] text-[var(--text-muted)] text-center py-2">No links added</p>
                  ) : links.map((l, li) => (
                    <div key={li} className="grid grid-cols-12 gap-2 items-end mb-2">
                      <Input label="" placeholder="Link Code" value={l.link_code}
                        onChange={e => updateLink(ci.country_code, li, 'link_code', e.target.value)}
                        className="col-span-3 text-[12px]" />
                      <Input label="" placeholder="Link Name" value={l.link_name}
                        onChange={e => updateLink(ci.country_code, li, 'link_name', e.target.value)}
                        className="col-span-3 text-[12px]" />
                      <Input label="" placeholder="Survey URL" value={l.url}
                        onChange={e => updateLink(ci.country_code, li, 'url', e.target.value)}
                        className="col-span-4 text-[12px]" />
                      <div className="col-span-1" />
                      <button onClick={() => removeLink(ci.country_code, li)}
                        className="col-span-1 text-[var(--danger)] hover:opacity-80 justify-self-center">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );

      case 3: // Vendor Assignments
        return (
          <div className="space-y-5 max-h-[400px] overflow-y-auto pr-1">
            {countries.length === 0 ? (
              <p className="text-[13px] text-[var(--text-muted)] text-center py-4">Complete previous steps first</p>
            ) : countries.map(ci => {
              const links = linksMap[ci.country_code] || [];
              return links.map((l, li) => {
                if (!l.link_code) return null;
                const key = `${ci.country_code}-${l.link_code}`;
                const assigned = vendorsMap[key] || [];
                return (
                  <div key={key} className="border border-[var(--border)] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[12px] font-semibold text-[var(--text-heading)]">
                        {ci.country_code} — {l.link_code || `Link ${li + 1}`}
                      </h4>
                      <Button variant="ghost" size="sm" onClick={() => addVendorAssignment(key)}>
                        <Plus className="w-3 h-3 mr-1" /> Add Vendor
                      </Button>
                    </div>
                    {assigned.length === 0 ? (
                      <p className="text-[12px] text-[var(--text-muted)] text-center py-2">No vendors assigned</p>
                    ) : assigned.map((v, vi) => (
                      <div key={vi} className="grid grid-cols-12 gap-2 items-end mb-2">
                        <div className="col-span-5">
                          <Select label="" value={v.vendor_id}
                            onChange={e => updateVendorAssignment(key, vi, 'vendor_id', e.target.value)}
                            options={[{ value: '', label: 'Select vendor...' }, ...vendors.filter(v => v.status === 'ACTIVE').map(v => ({ value: v.id, label: v.name }))]} />
                        </div>
                        <Input label="" type="number" placeholder="CPI" value={String(v.vendor_cpi || '')}
                          onChange={e => updateVendorAssignment(key, vi, 'vendor_cpi', Number(e.target.value))}
                          className="col-span-3 text-[12px]" />
                        <Input label="" type="number" placeholder="Target" value={String(v.target_completes || '')}
                          onChange={e => updateVendorAssignment(key, vi, 'target_completes', Number(e.target.value))}
                          className="col-span-3 text-[12px]" />
                        <button onClick={() => removeVendorAssignment(key, vi)}
                          className="col-span-1 text-[var(--danger)] hover:opacity-80 justify-self-center">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              });
            })}
          </div>
        );

      case 4: // Quotas (optional)
        return (
          <div className="space-y-4 text-center py-6">
            <BarChart3 className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
            <p className="text-[13px] text-[var(--text-muted)]">
              Quotas can be configured after launch from the project detail page.
            </p>
            <p className="text-[12px] text-[var(--text-muted)]">This step is optional.</p>
          </div>
        );

      case 5: // Review & Launch
        return (
          <div className="space-y-4">
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border)]">
              <h4 className="text-[13px] font-bold text-[var(--text-heading)] mb-2">Project Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div><span className="text-[var(--text-muted)]">Code:</span> <span className="font-mono font-semibold">{projectForm.project_code}</span></div>
                <div><span className="text-[var(--text-muted)]">Name:</span> <span className="font-semibold">{projectForm.name}</span></div>
                <div><span className="text-[var(--text-muted)]">Countries:</span> <span className="font-semibold">{reviewSummary.countries}</span></div>
                <div><span className="text-[var(--text-muted)]">Links:</span> <span className="font-semibold">{reviewSummary.links}</span></div>
                <div><span className="text-[var(--text-muted)]">Vendor Assignments:</span> <span className="font-semibold">{reviewSummary.vendors}</span></div>
              </div>
            </div>
            {!canLaunch && (
              <p className="text-[12px] text-[var(--danger)]">
                Cannot launch: need at least 1 country, 1 link per country, and 1 vendor per link.
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const wizardNextLabel = () => {
    if (wizardStep === 0) return 'Create Project';
    if (wizardStep === 5) return 'Launch Project';
    return 'Next';
  };

  return (
    <DashboardLayout
      user={user ? { email: user.email, name: user.name || user.full_name, role: user.role, vendor_id: user.vendor_id } : undefined}
      onLogout={handleLogout}
      title="Projects"
      subtitle="Manage multi-country fieldwork projects"
      actions={
        <Button variant="primary" onClick={openWizard}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Project
        </Button>
      }
    >
      {/* Status Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-1 w-fit">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
              statusFilter === tab
                ? 'bg-[var(--blue)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {tab}
            {statusCounts[STATUS_MAP[tab] || ''] !== undefined && STATUS_MAP[tab] && (
              <span className="ml-1.5 text-[10px] opacity-70">{statusCounts[STATUS_MAP[tab]!] || 0}</span>
            )}
          </button>
        ))}
      </div>

      {/* Projects Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-4">
            <Settings className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-[14px] font-medium text-[var(--text-heading)] mb-1">
            {statusFilter === 'All' ? 'No projects yet' : `No ${statusFilter.toLowerCase()} projects`}
          </p>
          <p className="text-[12px] text-[var(--text-muted)] mb-4">Create your first project to get started</p>
          <Button variant="primary" onClick={openWizard}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Project
          </Button>
        </div>
      ) : (
        <DataTable
          bare
          columns={columns}
          data={filteredProjects}
          keyField="id"
          onRowClick={(row) => router.push(`/dashboard/projects/${row.id}`)}
        />
      )}

      {/* ── 6-Step Wizard Modal ────────────────────────────────────────── */}
      <Modal isOpen={wizardOpen} onClose={() => setWizardOpen(false)} title={`Create Project — Step ${wizardStep + 1} of 6`}>
        {/* Progress Bar */}
        <div className="flex items-center gap-1 mb-5">
          {WIZARD_STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = i === wizardStep;
            const isDone = i < wizardStep;
            return (
              <React.Fragment key={i}>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  isActive ? 'bg-[var(--blue)] text-white' : isDone ? 'bg-[var(--success)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                }`}>
                  {isDone ? <Check className="w-3 h-3" /> : <StepIcon className="w-3 h-3" />}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {i < WIZARD_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${isDone ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[200px]">
          <h3 className="text-[14px] font-bold text-[var(--text-heading)] mb-3">{WIZARD_STEPS[wizardStep].label}</h3>
          {renderWizardStep()}
        </div>

        {/* Navigation */}
        <Modal.Footer>
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" onClick={wizardBack} disabled={wizardStep === 0}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setWizardOpen(false)}>Cancel</Button>
              <Button
                variant={wizardStep === 5 ? 'primary' : 'primary'}
                onClick={wizardNext}
                disabled={wizardSaving || (wizardStep === 5 && !canLaunch)}
              >
                {wizardSaving ? 'Launching...' : wizardNextLabel()}
                {wizardStep < 5 && <ArrowRight className="w-4 h-4 ml-1" />}
                {wizardStep === 5 && <Play className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  );
}
