// ============================================================================
// TPT Doctor — Encryption Key Rotation System
// Supports versioned encryption keys for HIPAA PHI compliance
// Allows re-encryption of existing data without downtime
// ============================================================================

import { config } from '@tpt-doctor/config';
import * as crypto from 'crypto';
import { encrypt, decrypt, hashForIndexing } from './index';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Key rotation configuration
 */
interface KeyRotationConfig {
  /** Interval in days after which automatic re-encryption is triggered */
  rotationIntervalDays: number;
  /** Number of previous key versions to retain for decryption */
  maxKeyVersions: number;
  /** Whether automatic rotation is enabled */
  autoRotationEnabled: boolean;
}

const DEFAULT_CONFIG: KeyRotationConfig = {
  rotationIntervalDays: 90, // HIPAA recommends annual, 90 days for sensitive PHI
  maxKeyVersions: 3,       // Keep current + 2 previous versions
  autoRotationEnabled: true,
};

/**
 * Key version entry stored alongside encrypted data
 */
export interface KeyVersion {
  version: number;
  keyHash: string;        // SHA-256 hash of the derived key (identifies which key was used)
  createdAt: string;      // ISO timestamp
  expiresAt: string;      // ISO timestamp after which this key version is retired
}

/**
 * Encrypted data envelope with key version metadata
 * Format: v{version}:{keyHash}:{salt}:{iv}:{tag}:{ciphertext}
 */
export interface EncryptedEnvelope {
  version: number;
  keyHash: string;
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

/**
 * Parse an encrypted string into its envelope components
 */
export function parseEncryptedEnvelope(encryptedData: string): EncryptedEnvelope {
  const parts = encryptedData.split(':');
  if (parts.length < 6) {
    throw new Error('Invalid encrypted data format - expected versioned envelope');
  }

  const versionMatch = parts[0]!.match(/^v(\d+)$/);
  if (!versionMatch) {
    throw new Error('Invalid encrypted data format - missing version prefix');
  }

  return {
    version: parseInt(versionMatch[1]!, 10),
    keyHash: parts[1]!,
    salt: parts[2]!,
    iv: parts[3]!,
    tag: parts[4]!,
    ciphertext: parts.slice(5).join(':'), // Rejoin remaining parts in case of colons in data
  };
}

/**
 * Format an encrypted envelope back to string
 */
export function formatEncryptedEnvelope(envelope: EncryptedEnvelope): string {
  return `v${envelope.version}:${envelope.keyHash}:${envelope.salt}:${envelope.iv}:${envelope.tag}:${envelope.ciphertext}`;
}

/**
 * Key Rotation Manager
 * Handles versioned encryption keys for seamless rotation
 */
export class KeyRotationManager {
  private static instance: KeyRotationManager;
  private keyVersions: Map<number, { key: Buffer; keyHash: string }> = new Map();
  private currentVersion: number = 1;
  private config: KeyRotationConfig;

  private constructor(config?: Partial<KeyRotationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<KeyRotationConfig>): KeyRotationManager {
    if (!KeyRotationManager.instance) {
      KeyRotationManager.instance = new KeyRotationManager(config);
    }
    return KeyRotationManager.instance;
  }

  /**
   * Initialize key versions from configuration
   * Loads master key(s) and derives working keys
   */
  initialize(keys: { version: number; masterKey: string }[]): void {
    this.keyVersions.clear();

    for (const { version, masterKey } of keys) {
      const salt = crypto.randomBytes(SALT_LENGTH);
      const key = crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      this.keyVersions.set(version, { key, keyHash });

      if (version > this.currentVersion) {
        this.currentVersion = version;
      }
    }

    // If no versions provided, create one from the configured master key
    if (this.keyVersions.size === 0) {
      const masterKey = config.encryption.masterKey;
      if (!masterKey) {
        throw new Error('Encryption master key is not configured');
      }
      const salt = crypto.randomBytes(SALT_LENGTH);
      const key = crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      this.keyVersions.set(1, { key, keyHash });
      this.currentVersion = 1;
    }
  }

  /**
   * Get the current key version number
   */
  getCurrentVersion(): number {
    return this.currentVersion;
  }

  /**
   * Get all active key versions
   */
  getActiveVersions(): number[] {
    return Array.from(this.keyVersions.keys()).sort((a, b) => b - a);
  }

  /**
   * Encrypt data using the current (latest) key version
   */
  encrypt(plaintext: string): string {
    const currentKey = this.keyVersions.get(this.currentVersion);
    if (!currentKey) {
      throw new Error(`Key version ${this.currentVersion} not found`);
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, currentKey.key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');

    const envelope: EncryptedEnvelope = {
      version: this.currentVersion,
      keyHash: currentKey.keyHash,
      salt,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      ciphertext: encrypted,
    };

    return formatEncryptedEnvelope(envelope);
  }

  /**
   * Decrypt data using the appropriate key version
   * Automatically detects which key version was used
   */
  decrypt(encryptedData: string): string {
    // Try versioned format first
    try {
      const envelope = parseEncryptedEnvelope(encryptedData);
      const keyEntry = this.keyVersions.get(envelope.version);
      if (!keyEntry) {
        throw new Error(`Key version ${envelope.version} not available for decryption`);
      }

      const iv = Buffer.from(envelope.iv, 'hex');
      const tag = Buffer.from(envelope.tag, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, keyEntry.key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(envelope.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      // Fall back to legacy format (pre-key-rotation)
      return decrypt(encryptedData);
    }
  }

  /**
   * Rotate to a new key version
   * Adds a new master key and increments the version number
   */
  rotate(newMasterKey?: string): KeyVersion {
    const nextVersion = this.currentVersion + 1;
    const masterKey = newMasterKey || crypto.randomBytes(KEY_LENGTH).toString('hex');

    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    this.keyVersions.set(nextVersion, { key, keyHash });
    this.currentVersion = nextVersion;

    // Prune old key versions beyond maxKeyVersions
    const versions = Array.from(this.keyVersions.keys()).sort((a, b) => b - a);
    if (versions.length > this.config.maxKeyVersions) {
      for (let i = this.config.maxKeyVersions; i < versions.length; i++) {
        this.keyVersions.delete(versions[i]!);
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.rotationIntervalDays * 24 * 60 * 60 * 1000);

    return {
      version: nextVersion,
      keyHash,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Re-encrypt data from an old key version to the current key version
   */
  reEncrypt(encryptedData: string): string {
    const plaintext = this.decrypt(encryptedData);
    return this.encrypt(plaintext);
  }

  /**
   * Batch re-encrypt multiple values
   * Useful for migrating a record's fields during rotation
   */
  batchReEncrypt(encryptedFields: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [field, value] of Object.entries(encryptedFields)) {
      result[field] = this.reEncrypt(value);
    }
    return result;
  }

  /**
   * Check if rotation is needed based on key age
   */
  isRotationNeeded(keyVersion: KeyVersion): boolean {
    const expiresAt = new Date(keyVersion.expiresAt);
    return new Date() >= expiresAt;
  }

  /**
   * Get rotation configuration
   */
  getConfig(): KeyRotationConfig {
    return { ...this.config };
  }

  /**
   * Update rotation configuration at runtime
   */
  updateConfig(config: Partial<KeyRotationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Convenience function to encrypt with key rotation support
 */
export function encryptWithRotation(plaintext: string): string {
  const manager = KeyRotationManager.getInstance();
  return manager.encrypt(plaintext);
}

/**
 * Convenience function to decrypt with key rotation support
 */
export function decryptWithRotation(encryptedData: string): string {
  const manager = KeyRotationManager.getInstance();
  return manager.decrypt(encryptedData);
}

/**
 * Perform a key rotation and return the new key version info
 * @param newMasterKey Optional new master key (auto-generated if not provided)
 */
export function rotateEncryptionKeys(newMasterKey?: string): KeyVersion {
  const manager = KeyRotationManager.getInstance();
  return manager.rotate(newMasterKey);
}

/**
 * Re-encrypt a single value with the current key version
 */
export function reEncryptValue(encryptedData: string): string {
  const manager = KeyRotationManager.getInstance();
  return manager.reEncrypt(encryptedData);
}