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
  target_completes?: number;
}

interface Quota {
  id: string;
  name: string;
  study_id: string;
  target: number;
  achieved: number;
  status?: string;
  created_at?: string;
}

export default function QuotasPage() {
  const { user, isAuthenticated, isLoading: authLoading, role, vendor_id } = useAuthState();
  const { showToast } = useToast();
  
  const [studies, setStudies] = useState<Study[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string>('');
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [quotaForm, setQuotaForm] = useState({
    name: '',
    target: '100',
  });

  useEffect(() => {
    const unsub = subscribe(() => {});
    checkAuth();
    return unsub;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadStudies();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedStudyId) {
      loadQuotas(selectedStudyId);
    } else {
      setQuotas([]);
    }
  }, [selectedStudyId]);

  const loadStudies = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>('/studies');
      const list: Study[] = res?.data || res?.studies || (Array.isArray(res) ? res : []);
      setStudies(list);
      if (list.length > 0) {
        setSelectedStudyId(list[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load studies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadQuotas = async (studyId: string) => {
    try {
      const res = await apiClient.get<any>('/quotas', { study_id: studyId });
      const list = res?.data || res?.quotas || (Array.isArray(res) ? res : []);
      setQuotas(list);
    } catch (err: any) {
      setQuotas([]);
    }
  };

  const handleCreateQuota = async () => {
    if (!selectedStudyId) {
      showToast('Please select a study first', 'error');
      return;
    }
    if (!quotaForm.name.trim()) {
      showToast('Quota name is required', 'error');
      return;
    }
    const targetNum = parseInt(quotaForm.target, 10);
    if (isNaN(targetNum) || targetNum <= 0) {
      showToast('Target must be a positive integer', 'error');
      return;
    }

    try {
      await apiClient.post('/quotas', {
        study_id: selectedStudyId,
        name: quotaForm.name.trim(),
        target: targetNum,
      });
      showToast('Quota created successfully', 'success');
      setShowCreateModal(false);
      setQuotaForm({ name: '', target: '100' });
      loadQuotas(selectedStudyId);
    } catch (err: any) {
      showToast(err.message || 'Failed to create quota', 'error');
    }
  };

  const activeStudy = useMemo(() => {
    return studies.find(s => s.id === selectedStudyId);
  }, [studies, selectedStudyId]);

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
      title="Quota Management"
      subtitle="Define demographic cells, age/gender quotas, and complete allocation targets"
      actions={
        role !== 'VENDOR' && selectedStudyId ? (
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Add Quota Cell
          </Button>
        ) : undefined
      }
    >
      {/* Study Selector Card */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Select Study:</span>
          <select
            value={selectedStudyId}
            onChange={(e) => setSelectedStudyId(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-1)] min-w-[280px]"
            aria-label="Select study for quotas"
          >
            {studies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.study_code ? `[${s.study_code}] ` : ''}{s.title}
              </option>
            ))}
          </select>
        </div>

        {activeStudy && (
          <div className="flex items-center gap-4 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--text-secondary)]">
              Overall Study Target: <strong className="text-[var(--text-primary)]">{activeStudy.target_completes ?? '—'}</strong>
            </span>
          </div>
        )}
      </div>

      {quotas.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Quota Cells Defined</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {selectedStudyId
              ? "This study currently collects all qualified completes without cell limits."
              : "Select a study to manage its quota allocations."}
          </p>
          {role !== 'VENDOR' && selectedStudyId && (
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              Define First Quota Cell
            </Button>
          )}
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'name',
              header: 'Quota Name / Condition',
              render: (row: Quota) => (
                <span className="font-semibold text-sm text-[var(--text-primary)]">
                  {row.name}
                </span>
              ),
            },
            {
              key: 'target',
              header: 'Target Completes',
              render: (row: Quota) => (
                <span className="font-mono text-sm font-bold text-[var(--accent-1)]">
                  {row.target}
                </span>
              ),
            },
            {
              key: 'achieved',
              header: 'Achieved',
              render: (row: Quota) => (
                <span className="font-mono text-sm text-[var(--text-primary)]">
                  {row.achieved ?? 0}
                </span>
              ),
            },
            {
              key: 'progress',
              header: 'Fulfillment Progress',
              render: (row: Quota) => {
                const pct = Math.min(100, Math.round(((row.achieved || 0) / (row.target || 1)) * 100));
                const isFull = pct >= 100;
                return (
                  <div className="w-full max-w-xs flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-amber-500' : 'bg-[var(--accent-1)]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-medium text-[var(--text-secondary)] w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                );
              },
            },
            {
              key: 'status',
              header: 'Status',
              render: (row: Quota) => {
                const isFull = (row.achieved || 0) >= row.target;
                return <StatusBadge status={isFull ? 'QUOTA_FULL' : 'ACTIVE'} />;
              },
            },
          ]}
          data={quotas}
          keyField="id"
        />
      )}

      {/* Modal: Create Quota */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Quota Cell">
        <div className="space-y-4">
          <Input
            label="Quota Cell Name / Label *"
            placeholder="e.g. Males 18-34, California Tech Workers"
            value={quotaForm.name}
            onChange={(e) => setQuotaForm({ ...quotaForm, name: e.target.value })}
            required
          />
          <Input
            label="Target Completes *"
            type="number"
            min={1}
            placeholder="150"
            value={quotaForm.target}
            onChange={(e) => setQuotaForm({ ...quotaForm, target: e.target.value })}
            required
          />
        </div>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateQuota}>Create Quota</Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  );
}
