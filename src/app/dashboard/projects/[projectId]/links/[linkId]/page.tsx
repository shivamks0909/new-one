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
interface Vendor { id: string; name: string; }

const sc = (s: string) => ({
  ACTIVE: 'bg-green-500/20 text-green-400 border border-green-500/30',
  PAUSED: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  CLOSED: 'bg-gray-500/10 text-gray-500 border border-gray-500/20',
  DRAFT: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  LIVE: 'bg-green-500/20 text-green-400 border border-green-500/30',
}[s] || 'bg-gray-500/20 text-gray-400');

export default function LinkDetailPage({ params }: { params: { projectId: string; linkId: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthState();
  const { showToast } = useToast();
  const { projectId, linkId } = params;
  const [link, setLink] = useState<Link | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vf, setVF] = useState({ vendor_id: '', vendor_cpi: '0', target_completes: '0', max_completes: '0' });

  useEffect(() => { const u = subscribe(() => {}); checkAuth(); return u; }, []);
  useEffect(() => { if (isAuthenticated) { loadLink(); loadVendors(); } }, [isAuthenticated]);

  const loadLink = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/projects/' + projectId);
      const data = (res as any).data || res;
      let found: Link | null = null;
      for (const c of (data.countries || [])) {
        const l = (c.links || []).find((x: any) => x.id === linkId);
        if (l) { found = l; break; }
      }
      setLink(found);
    } catch { showToast('Failed to load link', 'error'); }
    setLoading(false);
  };
  const loadVendors = async () => {
    try { const r = await apiClient.get('/vendors'); setVendors(((r as any).data || (Array.isArray(r) ? r : [])) as Vendor[]); } catch {}
  };

  const assignVendor = async () => {
    if (!vf.vendor_id) { showToast('Select a vendor', 'error'); return; }
    try {
      await apiClient.post('/links/' + linkId + '/vendors', {
        vendor_id: vf.vendor_id,
        vendor_cpi: parseFloat(vf.vendor_cpi) || 0,
        target_completes: parseInt(vf.target_completes) || 0,
        max_completes: parseInt(vf.max_completes) || 0,
      });
      showToast('Vendor assigned', 'success');
      setShowVendorModal(false);
      loadLink();
    } catch (e: any) { showToast(e.message || 'Failed', 'error'); }
  };

  const lh = user ? { email: user.email, name: user.name || user.full_name, role: user.role, vendor_id: user.vendor_id } : undefined;

  if (loading) return <DashboardLayout title="Loading..." user={lh} onLogout={() => { logout(); router.push('/'); }}><div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--accent-1)] border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;
  if (!link) return <DashboardLayout title="Not Found" user={lh} onLogout={() => { logout(); router.push('/'); }}><div className="text-center py-20 text-[var(--text-muted)]">Link not found</div></DashboardLayout>;

  return (
    <DashboardLayout
      title={link.link_name}
      subtitle={link.link_code + " \u2022 Tracking Link Details"}
      user={lh}
      onLogout={() => { logout(); router.push('/'); }}
      breadcrumbs={[{ label: "Projects", href: "/dashboard/projects" }, { label: "Project", href: "/dashboard/projects/" + projectId }, { label: link.link_name }]}
      actions={<div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/projects/" + projectId)}>Back to Project</Button>
        <Button variant="primary" size="sm" onClick={() => setShowVendorModal(true)}>+ Assign Vendor</Button>
      </div>}>

      {/* Link Info */}
      <div className="glass-card p-6 mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-xs text-[var(--text-muted)] mb-1">Status</div><span className={"text-xs font-medium px-2 py-0.5 rounded-full " + sc(link.status)}>{link.status}</span></div>
          <div><div className="text-xs text-[var(--text-muted)] mb-1">UID Mode</div><span className="text-sm text-[var(--text-primary)]">{link.uid_mode}</span></div>
          <div><div className="text-xs text-[var(--text-muted)] mb-1">Link Code</div><span className="text-sm text-[var(--text-primary)] font-mono">{link.link_code}</span></div>
          <div><div className="text-xs text-[var(--text-muted)] mb-1">Assigned Vendors</div><span className="text-sm text-[var(--text-primary)]">{(link.vendor_assignments || []).length}</span></div>
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--border-primary)]">
          <div className="text-xs text-[var(--text-muted)] mb-1">Survey URL</div>
          <div className="text-sm text-[var(--accent-1)] font-mono break-all">{link.url}</div>
        </div>
      </div>

      {/* Vendor Assignments */}
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Vendor Assignments</h3>
      {!link.vendor_assignments || link.vendor_assignments.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p className="mb-4">No vendors assigned to this link</p>
          <Button variant="primary" size="sm" onClick={() => setShowVendorModal(true)}>+ Assign First Vendor</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {link.vendor_assignments.map(va => (
            <div key={va.id} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-[var(--text-primary)]">{va.vendor_name}</h4>
                <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + sc(va.status)}>{va.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-1">CPI</div>
                  <div className="text-lg font-bold text-[var(--accent-1)]">${va.vendor_cpi.toFixed(2)}</div>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Target</div>
                  <div className="text-lg font-bold text-[var(--text-primary)]">{va.target_completes}</div>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Max</div>
                  <div className="text-lg font-bold text-[var(--text-primary)]">{va.max_completes}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showVendorModal && (<Modal title="Assign Vendor" onClose={() => setShowVendorModal(false)}><div className="space-y-4">
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