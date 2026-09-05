"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, FormRow, Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

interface Vendor {
  id: string;
  vendor_code: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  status: string;
  notes?: string;
  created_at: string;
  active_studies_count?: number;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function VendorsPage() {
  const { user, isAuthenticated, isLoading: authLoading, role, vendor_id } = useAuthState();
  const { showToast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const [vendorForm, setVendorForm] = useState({
    vendor_code: '',
    name: '',
    contact_name: '',
    contact_email: '',
    status: 'ACTIVE',
    notes: '',
  });

  useEffect(() => {
    const unsubscribe = subscribe(() => {});
    checkAuth();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadVendors();
    }
  }, [isAuthenticated]);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>('/vendors');
      const list = res?.data || res?.vendors || (Array.isArray(res) ? res : []);
      setVendors(list);
    } catch (err: any) {
      showToast(err.message || 'Failed to load vendors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async () => {
    if (!vendorForm.name.trim() || !vendorForm.vendor_code.trim()) {
      showToast('Vendor Name and Code are required', 'error');
      return;
    }

    try {
      await apiClient.post('/vendors', {
        vendor_code: vendorForm.vendor_code.trim().toUpperCase(),
        name: vendorForm.name.trim(),
        contact_name: vendorForm.contact_name.trim() || undefined,
        contact_email: vendorForm.contact_email.trim() || undefined,
        status: vendorForm.status,
        notes: vendorForm.notes.trim() || undefined,
      });

      showToast('Vendor registered successfully', 'success');
      setShowCreateVendor(false);
      resetForm();
      loadVendors();
    } catch (err: any) {
      showToast(err.message || 'Failed to create vendor', 'error');
    }
  };

  const resetForm = () => {
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setVendorForm({
      vendor_code: `VND-${rand}`,
      name: '',
      contact_name: '',
      contact_email: '',
      status: 'ACTIVE',
      notes: '',
    });
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch =
        !searchQuery.trim() ||
        v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.vendor_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = !statusFilter || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchQuery, statusFilter]);

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
      title="Vendor Network"
      subtitle="Sample suppliers, panel partners, and field agency integrations"
      actions={
        role !== 'VENDOR' ? (
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setShowCreateVendor(true);
            }}
          >
            + Register Vendor
          </Button>
        ) : undefined
      }
    >
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <div className="flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="Search vendors by name, code, email, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-1)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-1)]"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          {(searchQuery || statusFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
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
      ) : filteredVendors.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <div className="text-4xl mb-3">🏢</div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Vendors Found</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {searchQuery || statusFilter
              ? "No vendors match your search criteria."
              : "Register sample providers and panel partners to start assigning traffic."}
          </p>
          {role !== 'VENDOR' && (
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setShowCreateVendor(true);
              }}
            >
              Register First Vendor
            </Button>
          )}
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'vendor_code',
              header: 'Vendor Code',
              render: (row: Vendor) => (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--accent-1)]">
                  {row.vendor_code || '—'}
                </span>
              ),
            },
            {
              key: 'name',
              header: 'Company / Partner Name',
              render: (row: Vendor) => (
                <div className="flex flex-col py-0.5">
                  <span className="font-semibold text-sm text-[var(--text-primary)]">{row.name}</span>
                  {row.notes && (
                    <span className="text-xs text-[var(--text-muted)] truncate max-w-xs">{row.notes}</span>
                  )}
                </div>
              ),
            },
            {
              key: 'contact',
              header: 'Contact Details',
              render: (row: Vendor) => (
                <div className="flex flex-col py-0.5 text-xs">
                  <span className="text-[var(--text-primary)] font-medium">{row.contact_name || '—'}</span>
                  {row.contact_email && (
                    <span className="text-[var(--text-muted)] hover:underline cursor-pointer">
                      {row.contact_email}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row: Vendor) => <StatusBadge status={row.status || 'ACTIVE'} />,
            },
            {
              key: 'created_at',
              header: 'Registered',
              render: (row: Vendor) => (
                <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                  {formatDate(row.created_at)}
                </span>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row: Vendor) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVendor(row)}
                >
                  View Details
                </Button>
              ),
            },
          ]}
          data={filteredVendors}
          keyField="id"
        />
      )}

      {/* Modal: Register Vendor */}
      <Modal isOpen={showCreateVendor} onClose={() => setShowCreateVendor(false)} title="Register Panel Partner / Vendor">
        <div className="space-y-4">
          <FormRow>
            <Input
              label="Vendor Code *"
              placeholder="VND-DYN"
              value={vendorForm.vendor_code}
              onChange={(e) => setVendorForm({ ...vendorForm, vendor_code: e.target.value.toUpperCase() })}
              required
            />
            <Select
              label="Status"
              options={[
                { value: 'ACTIVE', label: 'Active (Accepting Traffic)' },
                { value: 'INACTIVE', label: 'Inactive / Suspended' },
              ]}
              value={vendorForm.status}
              onChange={(e) => setVendorForm({ ...vendorForm, status: e.target.value })}
            />
          </FormRow>

          <Input
            label="Vendor / Agency Name *"
            placeholder="Dynata Global Panels"
            value={vendorForm.name}
            onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
            required
          />

          <FormRow>
            <Input
              label="Contact Person"
              placeholder="John Doe"
              value={vendorForm.contact_name}
              onChange={(e) => setVendorForm({ ...vendorForm, contact_name: e.target.value })}
            />
            <Input
              label="Contact Email"
              type="email"
              placeholder="pm@vendor.com"
              value={vendorForm.contact_email}
              onChange={(e) => setVendorForm({ ...vendorForm, contact_email: e.target.value })}
            />
          </FormRow>

          <Input
            label="Internal Notes / Spec"
            placeholder="Special routing parameters, security guidelines..."
            value={vendorForm.notes}
            onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
          />
        </div>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setShowCreateVendor(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateVendor}>Register Vendor</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal: Vendor Details */}
      {selectedVendor && (
        <Modal isOpen={!!selectedVendor} onClose={() => setSelectedVendor(null)} title={`Vendor Profile: ${selectedVendor.name}`}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--glass-border)]">
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-1">Vendor Code</span>
                <span className="font-mono font-bold text-sm text-[var(--accent-1)]">{selectedVendor.vendor_code}</span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-1">Status</span>
                <StatusBadge status={selectedVendor.status} />
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-1">Contact Person</span>
                <span className="text-[var(--text-primary)]">{selectedVendor.contact_name || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)] block mb-1">Contact Email</span>
                <span className="text-[var(--text-primary)]">{selectedVendor.contact_email || 'Not provided'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-[var(--text-muted)] block mb-1">System UUID</span>
                <span className="font-mono text-xs text-[var(--text-secondary)] select-all">{selectedVendor.id}</span>
              </div>
              {selectedVendor.notes && (
                <div className="col-span-2">
                  <span className="text-xs text-[var(--text-muted)] block mb-1">Notes</span>
                  <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2.5 rounded border border-[var(--glass-border)]">
                    {selectedVendor.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
          <Modal.Footer>
            <Button variant="primary" onClick={() => setSelectedVendor(null)}>Close</Button>
          </Modal.Footer>
        </Modal>
      )}
    </DashboardLayout>
  );
}