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

interface VendorAssignment { id: string; vendor_id: string; vendor_name: string; vendor_cpi: number; target_completes: number; max_completes: number; status: string; }
interface Link { id: string; link_code: string; link_name: string; url: string; status: string; uid_mode: string; vendor_assignments?: VendorAssignment[]; }
interface Country { id: string; country_code: string; country_name: string; status: string; links?: Link[]; }
interface Vendor { id: string; name: string; }

const sc = (s: string) => ({
  ACTIVE: 'bg-green-500/20 text-green-400 border border-green-500/30',
  PAUSED: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  CLOSED: 'bg-gray-500/10 text-gray-500 border border-gray-500/20',
  DRAFT: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  COMPLETED: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  LIVE: 'bg-green-500/20 text-green-400 border border-green-500/30',
}[s] || 'bg-gray-500/20 text-gray-400');

export default function CountryDetailPage({ params }: { params: { projectId: string; countryId: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthState();
  const { showToast } = useToast();
  const { projectId, countryId } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [activeLinkId, setActiveLinkId] = useState('');
  const [lf, setLF] = useState({ link_code: '', link_name: '', url: '', uid_mode: 'PROVIDED_UID' });
  const [vf, setVF] = useState({ vendor_id: '', vendor_cpi: '0', target_completes: '0', max_completes: '0' });

  useEffect(() => { const u = subscribe(() => {}); checkAuth(); return u; }, []);
  useEffect(() => { if (isAuthenticated) { loadCountry(); loadVendors(); } }, [isAuthenticated]);

  const loadCountry = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/projects/' + projectId);
      const data = (res as any).data || res;
      const c = (data.countries || []).find((x: any) => x.id === countryId);
      setCountry(c || null);
    } catch { showToast('Failed to load country', 'error'); }
    setLoading(false);
  };
  const loadVendors = async () => {
    try { const r = await apiClient.get('/vendors'); setVendors(((r as any).data || (Array.isArray(r) ? r : [])) as Vendor[]); } catch {}
  };

  const addLink = async () => {
    if (!lf.link_code || !lf.link_name || !lf.url) { showToast('All fields required', 'error'); return; }
    try {
      await apiClient.post('/countries/' + countryId + '/links', lf);
      showToast('Link created', 'success');
      setShowLinkModal(false);
      setLF({ link_code: '', link_name: '', url: '', uid_mode: 'PROVIDED_UID' });
      loadCountry();
    } catch (e: any) { showToast(e.message || 'Failed', 'error'); }
  };

  const assignVendor = async () => {
    if (!vf.vendor_id) { showToast('Select a vendor', 'error'); return; }
    try {
      await apiClient.post('/links/' + activeLinkId + '/vendors', {
        vendor_id: vf.vendor_id,
        vendor_cpi: parseFloat(vf.vendor_cpi) || 0,
        target_completes: parseInt(vf.target_completes) || 0,
        max_completes: parseInt(vf.max_completes) || 0,
      });
      showToast('Vendor assigned', 'success');
      setShowVendorModal(false);
      loadCountry();
    } catch (e: any) { showToast(e.message || 'Failed', 'error'); }
  };

  const lh = user ? { email: user.email, name: user.name || user.full_name, role: user.role, vendor_id: user.vendor_id } : undefined;

  if (loading) return <DashboardLayout title="Loading..." user={lh} onLogout={() => { logout(); router.push('/'); }}><div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--accent-1)] border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;
  if (!country) return <DashboardLayout title="Not Found" user={lh} onLogout={() => { logout(); router.push('/'); }}><div className="text-center py-20 text-[var(--text-muted)]">Country not found</div></DashboardLayout>;

  return (
    <DashboardLayout
      title={country.country_name}
      subtitle={country.country_code + " \u2022 Links & Vendor Assignments"}
      user={lh}
      onLogout={() => { logout(); router.push('/'); }}
      breadcrumbs={[{ label: "Projects", href: "/dashboard/projects" }, { label: "Project", href: "/dashboard/projects/" + projectId }, { label: country.country_name }]}
      actions={<div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/projects/" + projectId)}>Back to Project</Button>
        <Button variant="primary" size="sm" onClick={() => setShowLinkModal(true)}>+ Link</Button>
      </div>}>

      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-3">
          <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + sc(country.status)}>{country.status}</span>
          <span className="text-sm text-[var(--text-secondary)]">{(country.links || []).length} survey links</span>
        </div>
      </div>

      {!country.links || country.links.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p className="mb-4">No links yet</p>
          <Button variant="primary" size="sm" onClick={() => setShowLinkModal(true)}>+ Create First Link</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {country.links.map(l => (
            <div key={l.id} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">{l.link_name}</div>
                    <div className="text-xs text-[var(--text-muted)] font-mono">{l.link_code}</div>
                  </div>
                  <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + sc(l.status)}>{l.status}</span>
                  <span className="text-xs text-[var(--text-muted)]">UID: {l.uid_mode}</span>
                </div>
                <button onClick={() => { setActiveLinkId(l.id); setVF({ vendor_id: "", vendor_cpi: "0", target_completes: "0", max_completes: "0" }); setShowVendorModal(true); }}
                  className="text-xs text-[var(--accent-1)] hover:text-[var(--accent-2)]">+ Assign Vendor</button>
              </div>
              <div className="text-xs text-[var(--text-muted)] mb-2 truncate">URL: {l.url}</div>

              {!l.vendor_assignments || l.vendor_assignments.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)] italic py-2">No vendors assigned</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                  {l.vendor_assignments.map(va => (
                    <div key={va.id} className="bg-[var(--bg-secondary)] rounded-lg p-3">
                      <div className="font-medium text-sm text-[var(--text-primary)]">{va.vendor_name}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        CPI: ${va.vendor_cpi.toFixed(2)} | Target: {va.target_completes} | Max: {va.max_completes}
                      </div>
                      <span className={"inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 " + sc(va.status)}>{va.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showLinkModal && (<Modal title="Create Survey Link" onClose={() => setShowLinkModal(false)}><div className="space-y-4">
        <Input label="Link Code" value={lf.link_code} onChange={e => setLF({ ...lf, link_code: e.target.value })} placeholder="LNK_001" required />
        <Input label="Link Name" value={lf.link_name} onChange={e => setLF({ ...lf, link_name: e.target.value })} placeholder="Primary Survey" required />
        <Input label="URL" value={lf.url} onChange={e => setLF({ ...lf, url: e.target.value })} placeholder="https://..." required />
        <Select label="UID Mode" value={lf.uid_mode} onChange={e => setLF({ ...lf, uid_mode: e.target.value })} options={[{ value: "PROVIDED_UID", label: "Provided UID" }, { value: "RANDOM_UID", label: "Random UID" }]} />
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" size="sm" onClick={() => setShowLinkModal(false)}>Cancel</Button><Button variant="primary" size="sm" onClick={addLink}>Create Link</Button></div>
      </div></Modal>)}

      {showVendorModal && (<Modal title="Assign Vendor to Link" onClose={() => setShowVendorModal(false)}><div className="space-y-4">
        <Select label="Vendor" value={vf.vendor_id} onChange={e => setVF({ ...vf, vendor_id: e.target.value })} options={vendors.map(v => ({ value: v.id, label: v.name }))} />
        <Input label="Vendor CPI $" value={vf.vendor_cpi} onChange={e => setVF({ ...vf, vendor_cpi: e.target.value })} type="number" step="0.01" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Target Completes" value={vf.target_completes} onChange={e => setVF({ ...vf, target_completes: e.target.value })} type="number" />
          <Input label="Max Completes" value={vf.max_completes} onChange={e => setVF({ ...vf, max_completes: e.target.value })} type="number" />
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" size="sm" onClick={() => setShowVendorModal(false)}>Cancel</Button><Button variant="primary" size="sm" onClick={assignVendor}>Assign</Button></div>
      </div></Modal>)}

    </DashboardLayout>
  );
}