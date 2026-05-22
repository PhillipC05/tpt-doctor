// ============================================================================
// TPT Doctor — Encryption Service (AES-256-GCM Envelope Encryption)
// HIPAA-compliant column-level encryption for PHI
// ============================================================================

import { config } from '@tpt-doctor/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derive an encryption key from the master key using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt sensitive PHI data using AES-256-GCM
 */
export function encrypt(plaintext: string): string {
  const masterKey = config.encryption.masterKey;
  if (!masterKey) {
    throw new Error('Encryption master key is not configured');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // Format: salt:iv:tag:ciphertext (all hex-encoded)
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt data that was encrypted with encrypt()
 */
export function decrypt(encryptedData: string): string {
  const masterKey = config.encryption.masterKey;
  if (!masterKey) {
    throw new Error('Encryption master key is not configured');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const salt = Buffer.from(parts[0]!, 'hex');
  const iv = Buffer.from(parts[1]!, 'hex');
  const tag = Buffer.from(parts[2]!, 'hex');
  const ciphertext = parts[3]!;

  const key = deriveKey(masterKey, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Hash PHI for indexing (allows search without exposing plaintext)
 * Uses SHA-256 with a pepper derived from the master key.
 * Throws if master key is not configured to prevent weak hashing.
 */
export function hashForIndexing(value: string): string {
  const masterKey = config.encryption.masterKey;
  if (!masterKey) {
    throw new Error('Encryption master key is not configured — cannot compute PHI hash for indexing. Set ENCRYPTION_MASTER_KEY.');
  }
  const pepper = crypto.createHash('sha256').update(masterKey).digest('hex').slice(0, 16);
  return crypto.pbkdf2Sync(value, pepper, 10000, 32, 'sha512').toString('hex');
}

/**
 * Mask PHI data for audit logs (keep last 4 digits, replace rest with *)
 */
export function maskPhi(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars) return value;
  const visible = value.slice(-visibleChars);
  const masked = '*'.repeat(value.length - visibleChars);
  return `${masked}${visible}`;
}

/**
 * Generate a random encryption key (for generating master keys)
 */
export function generateKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

export {
  KeyRotationManager,
  KeyVersion,
  EncryptedEnvelope,
  parseEncryptedEnvelope,
  formatEncryptedEnvelope,
  encryptWithRotation,
  decryptWithRotation,
  rotateEncryptionKeys,
  reEncryptValue,
} from './key-rotation';
