import * as crypto from 'crypto';
import { config } from '../config';

// ponytail: Uses native Node.js crypto — zero new dependencies.

export function encryptCredential(plaintext: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key = Buffer.from(config.vaultEncryptionKey, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { encrypted, iv: iv.toString('hex'), authTag };
}

export function decryptCredential(
  encrypted: string,
  iv: string,
  authTag: string,
): string {
  const key = Buffer.from(config.vaultEncryptionKey, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function maskValue(plaintext: string, visibleChars = 4): string {
  if (!plaintext) return '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
  if (plaintext.length <= visibleChars) return '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
  const visible = plaintext.slice(-visibleChars);
  const masked = '\u2022'.repeat(8);
  return masked + visible;
}

export function maskCredential(cred: any): any {
  if (!cred) return cred;
  const masked = { ...cred };
  delete masked.encrypted_password;
  delete masked.iv;
  delete masked.auth_tag;
  delete masked.encrypted_extra;
  masked.password_masked = maskValue(cred.username || 'password');
  return masked;
}