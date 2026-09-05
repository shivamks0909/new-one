"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

interface Link { id: string; link_code: string; link_name: string; url: string; status: string; uid_mode: string; vendor_assignments?: any[]; }
interface Country { id: string; country_code: string; country_name: string; status: string; links?: Link[]; }
interface Project { id: string; project_code: string; name: string; description?: string; status: string; client_name?: string; countries?: Country[]; }
interface Vendor { id: string; name: string; }

const sc = (s: string) => ({
  LIVE: 'bg-green-500/20 text-green-400 border border-green-500/30',
  ACTIVE: 'bg-green-500/20 text-green-400 border border-green-500/30',
  PAUSED: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  CLOSED: 'bg-gray-500/10 text-gray-500 border border-gray-500/20',
  DRAFT: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  CONFIGURING: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  VALIDATING: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  ARCHIVED: 'bg-gray-500/10 text-gray-500 border border-gray-500/20',
  COMPLETED: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
}[s] || 'bg-gray-500/20 text-gray-400');

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthState();
  const { showToast } = useToast();
  const pid = params.projectId;
  const [project, setProject] = useState<Project | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showCM, setShowCM] = useState(false);
  const [showLM, setShowLM] = useState(false);
  const [showVM, setShowVM] = useState(false);
  const [activeCID, setActiveCID] = useState('');
  const [activeLID, setActiveLID] = useState('');
  const [cf, setCF] = useState({ country_code: '', country_name: '' });
  const [lf, setLF] = useState({ link_code: '', link_name: '', url: '', uid_mode: 'PROVIDED_UID' });
  const [vf, setVF] = useState({ vendor_id: '', vendor_cpi: '0', target_completes: '0', max_completes: '0' });

  useEffect(() => { const u = subscribe(() => {}); checkAuth(); return u; }, []);
  useEffect(() => { if (isAuthenticated) { loadP(); loadV(); } }, [isAuthenticated]);

  const loadP = async () => { setLoading(true); try { const r = await apiClient.get('/projects/' + pid); setProject((r as any).data || r); } catch { showToast('Failed', 'error'); } setLoading(false); };
  const loadV = async () => { try { const r = await apiClient.get('/vendors'); setVendors(((r as any).data || (Array.isArray(r) ? r : [])) as Vendor[]); } catch {} };
  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const addCountry = async () => {
    if (!cf.country_code || !cf.country_name) { showToast('Code and name required', 'error'); return; }
    try { await apiClient.post('/projects/' + pid + '/countries', cf); showToast('Country added', 'success'); setShowCM(false); setCF({ country_code: '', country_name: '' }); loadP(); } catch (e: any) { showToast(e.message || 'Failed', 'error'); }
  };

  const addLink = async () => {
    if (!lf.link_code || !lf.link_name || !lf.url) { showToast('All fields required', 'error'); return; }
    try { await apiClient.post('/countries/' + activeCID + '/links', lf); showToast('Link created', 'success'); setShowLM(false); loadP(); } catch (e: any) { showToast(e.message || 'Failed', 'error'); }
  };

  const assignVendor = async () => {
    if (!vf.vendor_id) { showToast('Select a vendor', 'error'); return; }
    try { await apiClient.post('/links/' + activeLID + '/vendors', { vendor_id: vf.vendor_id, vendor_cpi: parseFloat(vf.vendor_cpi) || 0, target_completes: parseInt(vf.target_completes) || 0, max_completes: parseInt(vf.max_completes) || 0 }); showToast('Vendor assigned', 'success'); setShowVM(false); loadP(); } catch (e: any) { showToast(e.message || 'Failed', 'error'); }
  };

  const lh = user ? { email: user.email, name: user.name || user.full_name, role: user.role, vendor_id: user.vendor_id } : undefined;

  if (loading) return <DashboardLayout title="Loading..." user={lh} onLogout={() => { logout(); router.push('/'); }}><div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--accent-1)] border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;
  if (!project) return <DashboardLayout title="Not Found" user={lh} onLogout={() => { logout(); router.push('/'); }}><div className="text-center py-20 text-[var(--text-muted)]">Project not found</div></DashboardLayout>;

  return (
    <DashboardLayout
      title={project.name}
      subtitle={project.project_code + " \u2022 " + (project.client_name || "No client")}
      user={lh}
      onLogout={() => { logout(); router.push('/'); }}
      breadcrumbs={[{ label: "Projects", href: "/dashboard/projects" }, { label: project.name }]}
      actions={<div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/projects')}>Back</Button>
        {['DRAFT', 'CONFIGURING', 'VALIDATING'].includes(project.status) && (
          <Button variant="primary" size="sm" onClick={async () => {
            try {
              await apiClient.post('/projects/' + pid + '/launch', {});
              showToast('Project launched!', 'success');
              loadP();
            } catch (err: any) { showToast(err.message || 'Launch failed', 'error'); }
          }}>Launch Project</Button>
        )}
        <Button variant="primary" size="sm" onClick={() => setShowCM(true)}>+ Country</Button>
      </div>}>

      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-3">
          <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + sc(project.status)}>{project.status}</span>
          {project.description && <p className="text-sm text-[var(--text-secondary)]">{project.description}</p>}
        </div>
      </div>

      {(!project.countries || project.countries.length === 0) ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p className="mb-4">No countries added yet</p>
          <Button variant="primary" size="sm" onClick={() => setShowCM(true)}>+ Add First Country</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {project.countries.map(c => (
            <div key={c.id} className="glass-card overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors" onClick={() => toggle(c.id)}>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[var(--text-primary)]">{c.country_name}</span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">{c.country_code}</span>
                  <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + sc(c.status)}>{c.status}</span>
                  <span className="text-xs text-[var(--text-muted)]">{(c.links || []).length} links</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setActiveCID(c.id); setShowLM(true); }} className="text-xs text-[var(--accent-1)] hover:text-[var(--accent-2)]">+ Link</button>
                  <svg className={"w-4 h-4 text-[var(--text-muted)] transition-transform " + (expanded[c.id] ? "rotate-180" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {expanded[c.id] && (
                <div className="border-t border-[var(--border-primary)]">
                  {!c.links || c.links.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[var(--text-muted)]">No links yet</div>
                  ) : c.links.map(l => (
                    <div key={l.id} className="border-b border-[var(--border-primary)] last:border-b-0">
                      <div className="flex items-center justify-between p-4 pl-10">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-[var(--text-primary)] truncate">{l.link_name}</div>
                            <div className="text-xs text-[var(--text-muted)] font-mono">{l.link_code}</div>
                          </div>
                          <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + sc(l.status)}>{l.status}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setActiveLID(l.id); setShowVM(true); }} className="text-xs text-[var(--accent-1)] hover:text-[var(--accent-2)]">+ Vendor</button>
                          <span className="text-xs text-[var(--text-muted)]">{(l.vendor_assignments || []).length} vendors</span>
                        </div>
                      </div>
                      {l.vendor_assignments && l.vendor_assignments.length > 0 && (
                        <div className="pl-16 pb-3 pr-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {l.vendor_assignments.map((va: any) => (
                            <div key={va.id} className="bg-[var(--bg-secondary)] rounded-lg p-3 text-xs">
                              <div className="font-medium text-[var(--text-primary)] mb-1">{va.vendor_name || "Unknown"}</div>
                              <div className="text-[var(--text-muted)]">CPI: ${(va.vendor_cpi || 0).toFixed(2)} | Target: ${va.target_completes || 0} | Max: ${va.max_completes || 0}</div>
                            </div>
                          ))}
                        </div></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCM && (<Modal title="Add Country" onClose={() => setShowCM(false)}><div className="space-y-4">
        <Input label="Country Code" value={cf.country_code} onChange={e => setCF({ ...cf, country_code: e.target.value.toUpperCase() })} placeholder="US, IN, GB..." required />
        <Input label="Country Name" value={cf.country_name} onChange={e => setCF({ ...cf, country_name: e.target.value })} placeholder="United States" required />
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" size="sm" onClick={() => setShowCM(false)}>Cancel</Button><Button variant="primary" size="sm" onClick={addCountry}>Add Country</Button></div>
      </div></Modal>)}

      {showLM && (<Modal title="Create Survey Link" onClose={() => setShowLM(false)}><div className="space-y-4">
        <Input label="Link Code" value={lf.link_code} onChange={e => setLF({ ...lf, link_code: e.target.value })} placeholder="LNK_001" required />
        <Input label="Link Name" value={lf.link_name} onChange={e => setLF({ ...lf, link_name: e.target.value })} placeholder="Primary Survey" required />
        <Input label="URL" value={lf.url} onChange={e => setLF({ ...lf, url: e.target.value })} placeholder="https://..." required />
        <Select label="UID Mode" value={lf.uid_mode} onChange={e => setLF({ ...lf, uid_mode: e.target.value })} options={[{ value: "PROVIDED_UID", label: "Provided UID" }, { value: "RANDOM_UID", label: "Random UID" }]} />
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" size="sm" onClick={() => setShowLM(false)}>Cancel</Button><Button variant="primary" size="sm" onClick={addLink}>Create Link</Button></div>
      </div></Modal>)}

      {showVM && (<Modal title="Assign Vendor to Link" onClose={() => setShowVM(false)}><div className="space-y-4">
        <Select label="Vendor" value={vf.vendor_id} onChange={e => setVF({ ...vf, vendor_id: e.target.value })} options={vendors.map(v => ({ value: v.id, label: v.name }))} />
        <Input label="Vendor CPI $" value={vf.vendor_cpi} onChange={e => setVF({ ...vf, vendor_cpi: e.target.value })} type="number" step="0.01" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Target Completes" value={vf.target_completes} onChange={e => setVF({ ...vf, target_completes: e.target.value })} type="number" />
          <Input label="Max Completes" value={vf.max_completes} onChange={e => setVF({ ...vf, max_completes: e.target.value })} type="number" />
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" size="sm" onClick={() => setShowVM(false)}>Cancel</Button><Button variant="primary" size="sm" onClick={assignVendor}>Assign</Button></div>
      </div></Modal>)}

    </DashboardLayout>
  );
}