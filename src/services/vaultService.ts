import { db } from '../db';
import { encryptCredential, decryptCredential, maskCredential } from './encryptionService';

// ponytail: No retry/cache logic. Add when rate-limited external APIs require it.

export async function createCredential(data: {
  created_by: string;
  study_id?: string;
  vendor_id?: string;
  label: string;
  credential_type?: string;
  username: string;
  password: string;
  notes?: string;
}): Promise<any> {
  const { encrypted, iv, authTag } = encryptCredential(data.password);
  const entry = await db.createCredentialVault({
    created_by: data.created_by,
    study_id: data.study_id || null,
    vendor_id: data.vendor_id || null,
    label: data.label,
    credential_type: data.credential_type || 'LOGIN_PASSWORD',
    username: data.username,
    encrypted_password: encrypted,
    iv,
    auth_tag: authTag,
    notes: data.notes || null,
  });
  await db.logVaultAccess(entry.id, 'CREATE', data.created_by, null, null);
  return maskCredential(entry);
}

export async function getCredential(id: string, userId: string, ip?: string, ua?: string): Promise<any> {
  const entry = await db.getCredentialVaultById(id);
  if (!entry) return null;
  await db.logVaultAccess(id, 'READ', userId, ip || null, ua || null);
  return maskCredential(entry);
}

export async function retrieveCredential(id: string, userId: string, ip?: string, ua?: string): Promise<any> {
  const entry = await db.getCredentialVaultById(id);
  if (!entry) return null;
  const plaintext = decryptCredential(entry.encrypted_password, entry.iv, entry.auth_tag);
  await db.logVaultAccess(id, 'RETRIEVE', userId, ip || null, ua || null);
  await db.updateCredentialVault(id, { last_accessed_at: new Date(), last_accessed_by: userId });
  return { id: entry.id, label: entry.label, credential_type: entry.credential_type, username: entry.username, password: plaintext };
}

export async function updateCredential(id: string, data: {
  label?: string;
  username?: string;
  password?: string;
  notes?: string;
  status?: string;
  updated_by: string;
}, ip?: string, ua?: string): Promise<any> {
  const updates: any = {};
  if (data.label !== undefined) updates.label = data.label;
  if (data.username !== undefined) updates.username = data.username;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.status !== undefined) updates.status = data.status;
  if (data.password !== undefined) {
    const { encrypted, iv, authTag } = encryptCredential(data.password);
    updates.encrypted_password = encrypted;
    updates.iv = iv;
    updates.auth_tag = authTag;
  }
  const updated = await db.updateCredentialVault(id, updates);
  await db.logVaultAccess(id, 'UPDATE', data.updated_by, ip || null, ua || null);
  return maskCredential(updated);
}

export async function deleteCredential(id: string, userId: string, ip?: string, ua?: string): Promise<boolean> {
  const entry = await db.getCredentialVaultById(id);
  if (!entry) return false;
  await db.logVaultAccess(id, 'DELETE', userId, ip || null, ua || null);
  await db.deleteCredentialVault(id);
  return true;
}

export async function listCredentials(filters?: {
  study_id?: string;
  vendor_id?: string;
  created_by?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: any[]; total: number }> {
  const result = await db.getCredentialVaults(filters);
  return { rows: result.rows.map(maskCredential), total: result.total };
}

export async function getAuditLog(vaultId: string, limit = 50): Promise<any[]> {
  return db.getVaultAuditLog(vaultId, limit);
}