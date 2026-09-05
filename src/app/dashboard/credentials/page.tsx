"use client";

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

interface Credential {
  id: string;
  label: string;
  credential_type?: string;
  username: string;
  password?: string;
  notes?: string;
  updated_at?: string;
  created_at?: string;
}

export default function CredentialsPage() {
  const { user, isAuthenticated, isLoading: authLoading, role, vendor_id } = useAuthState();
  const { showToast } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  // New Credential Form State
  const [label, setLabel] = useState('');
  const [type, setType] = useState('EXTERNAL_PROVIDER');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribe(() => {});
    checkAuth();
    return unsub;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCredentials();
    }
  }, [isAuthenticated]);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>('/vault');
      const list = res?.data || (Array.isArray(res) ? res : []);
      setCredentials(list);
    } catch (err: any) {
      showToast(err.message || 'Failed to load credential vault', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !username.trim() || !password.trim()) {
      showToast('Label, Username, and Secret Key are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/vault', {
        label: label.trim(),
        credential_type: type,
        username: username.trim(),
        password: password.trim(),
        notes: notes.trim() || undefined,
      });

      showToast('Credential encrypted and added to Vault', 'success');
      setShowCreateModal(false);
      setLabel('');
      setUsername('');
      setPassword('');
      setNotes('');
      fetchCredentials();
    } catch (err: any) {
      showToast(err.message || 'Failed to store credential', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReveal = async (id: string) => {
    if (revealedIds[id]) {
      const updated = { ...revealedIds };
      delete updated[id];
      setRevealedIds(updated);
      return;
    }

    setRevealingId(id);
    try {
      const res = await apiClient.get<any>(`/vault/${id}`);
      if (res?.data?.password) {
        setRevealedIds((prev) => ({ ...prev, [id]: res.data.password }));
        showToast('Secret key decrypted and revealed (Access logged)', 'info');
      } else {
        showToast('Unable to decrypt credential', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error fetching credential secret', 'error');
    } finally {
      setRevealingId(null);
    }
  };

  const copyToClipboard = (text: string, labelText: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${labelText} copied to clipboard`, 'success');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vault credential?')) return;
    try {
      await apiClient.del(`/vault/${id}`);
      showToast('Credential purged from vault', 'success');
      fetchCredentials();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete credential', 'error');
    }
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

  const filteredCredentials = credentials.filter(
    (c) =>
      c.label?.toLowerCase().includes(search.toLowerCase()) ||
      c.username?.toLowerCase().includes(search.toLowerCase()) ||
      c.credential_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout
      user={user ? { email: user.email, name: user.name, role: user.role, vendor_id: user.vendor_id } : undefined}
      onLogout={handleLogout}
      title="Secure Credential Vault"
      subtitle="Hardware-isolated AES-256 encrypted storage for panel partner API keys & external survey authentications"
      actions={
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          + Store Credential
        </Button>
      }
    >
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search vault by provider label, account username, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-1)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            🛡️ AES-256 Encrypted
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {filteredCredentials.length} Credentials
          </span>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-64 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]" />
        </div>
      ) : filteredCredentials.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <div className="text-4xl mb-3">🔐</div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Vault Records Found</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {search
              ? "No vault secrets match your query."
              : "Store survey platform API keys, panel partner secrets, and external webhooks securely."}
          </p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            Add First Credential
          </Button>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'label',
              header: 'Provider / Service',
              render: (row: Credential) => (
                <div className="flex flex-col py-1">
                  <span className="font-semibold text-sm text-[var(--text-primary)]">{row.label}</span>
                  {row.notes && (
                    <span className="text-xs text-[var(--text-muted)] truncate max-w-xs">{row.notes}</span>
                  )}
                </div>
              ),
            },
            {
              key: 'type',
              header: 'Credential Type',
              render: (row: Credential) => (
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--glass-border)] text-[var(--text-secondary)]">
                  {row.credential_type || 'EXTERNAL_PROVIDER'}
                </span>
              ),
            },
            {
              key: 'username',
              header: 'Username / Key ID',
              render: (row: Credential) => (
                <div className="flex items-center gap-2 py-1">
                  <span className="font-mono text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded select-all">
                    {row.username}
                  </span>
                  <button
                    onClick={() => copyToClipboard(row.username, 'Username')}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-1)] transition-colors"
                    title="Copy identifier"
                  >
                    📋
                  </button>
                </div>
              ),
            },
            {
              key: 'secret',
              header: 'Secret Value',
              render: (row: Credential) => {
                const isRevealed = Boolean(revealedIds[row.id]);
                const secret = revealedIds[row.id];
                return (
                  <div className="flex items-center gap-2 py-1">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] select-all">
                      {isRevealed ? secret : '••••••••••••••••'}
                    </span>
                    <button
                      onClick={() => toggleReveal(row.id)}
                      disabled={revealingId === row.id}
                      className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--glass-bg)] hover:bg-[var(--accent-1)] hover:text-white border border-[var(--glass-border)] transition-colors"
                    >
                      {revealingId === row.id ? '...' : isRevealed ? 'Hide' : 'Reveal'}
                    </button>
                    {isRevealed && (
                      <button
                        onClick={() => copyToClipboard(secret, 'Secret key')}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-1)] transition-colors"
                        title="Copy decrypted secret"
                      >
                        📋
                      </button>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'actions',
              header: '',
              render: (row: Credential) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(row.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Delete
                </Button>
              ),
            },
          ]}
          data={filteredCredentials}
          keyField="id"
        />
      )}

      {/* Modal: Store New Credential */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Store Secure Credential">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Service / Provider Name *"
            placeholder="e.g. Lucid Marketplace, LimeSurvey Server, Cint API"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Credential Type"
              options={[
                { value: 'EXTERNAL_PROVIDER', label: 'External Survey Provider' },
                { value: 'PANEL_PARTNER', label: 'Panel Partner Secret' },
                { value: 'API_KEY', label: 'API Key / Bearer Token' },
                { value: 'DATABASE', label: 'Database Credentials' },
              ]}
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
            <Input
              label="Account / Username / ID *"
              placeholder="e.g. user_api_key"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <Input
            label="Secret Key / Password *"
            type="password"
            placeholder="••••••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            label="Usage Notes (Optional)"
            placeholder="Notes regarding IP whitelisting or endpoint scopes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Modal.Footer>
            <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={submitting}>Encrypt & Save</Button>
          </Modal.Footer>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
