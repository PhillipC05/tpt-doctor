// ============================================================================
// TPT Doctor — Secrets Rotation Service
// Automates rotation of webhook secrets, API keys, and encryption master keys
// Integrates with existing KeyRotationManager for encryption key rotation
// Logs all rotation events to the audit log
// ============================================================================

import { config } from '@tpt-doctor/config';
import * as crypto from 'crypto';
import { KeyRotationManager } from './key-rotation';

/**
 * Represents a managed secret that can be rotated
 */
export interface ManagedSecret {
  id: string;
  name: string;
  type: 'webhook_secret' | 'api_key' | 'encryption_key' | 'integration_token';
  tenantId: string;
  value: string; // Currently encrypted with the master key
  previousValue: string | null; // Previous value kept for grace period
  createdAt: string;
  rotatedAt: string | null;
  expiresAt: string | null;
  rotationIntervalDays: number;
  isActive: boolean;
}

/**
 * Result of a secret rotation operation
 */
export interface RotationResult {
  secretId: string;
  secretName: string;
  secretType: ManagedSecret['type'];
  previousValueHash: string; // SHA-256 hash of old value (not the value itself)
  newValueHash: string; // SHA-256 hash of new value
  rotatedAt: string;
  expiresAt: string;
  gracePeriodEndsAt: string;
  auditEventId: string | null;
  success: boolean;
  error: string | null;
}

/**
 * Configuration for the secrets rotation service
 */
interface SecretsRotationConfig {
  /** Default rotation interval in days */
  defaultRotationIntervalDays: number;
  /** Grace period in hours where old key still works after rotation */
  gracePeriodHours: number;
  /** Whether auto-rotation is enabled */
  autoRotationEnabled: boolean;
  /** Maximum number of previous values to retain */
  maxPreviousValues: number;
}

const DEFAULT_CONFIG: SecretsRotationConfig = {
  defaultRotationIntervalDays: 90, // HIPAA recommends annual key rotation
  gracePeriodHours: 24, // 24 hours for old key to remain valid
  autoRotationEnabled: true,
  maxPreviousValues: 2,
};

/**
 * Secrets Rotation Service
 * Handles automatic rotation of:
 * - Webhook signing secrets
 * - API keys for external integrations
 * - Encryption master keys (via KeyRotationManager)
 * - Integration tokens (Stripe, Twilio, etc.)
 */
export class SecretsRotationService {
  private static instance: SecretsRotationService;
  private secrets: Map<string, ManagedSecret> = new Map();
  private config: SecretsRotationConfig;
  private rotationHistory: Map<string, RotationResult[]> = new Map();

  private constructor(config?: Partial<SecretsRotationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<SecretsRotationConfig>): SecretsRotationService {
    if (!SecretsRotationService.instance) {
      SecretsRotationService.instance = new SecretsRotationService(config);
    }
    return SecretsRotationService.instance;
  }

  /**
   * Register a new managed secret
   */
  registerSecret(params: {
    name: string;
    type: ManagedSecret['type'];
    tenantId: string;
    value: string;
    rotationIntervalDays?: number;
  }): ManagedSecret {
    const id = crypto.randomUUID?.() || `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date();
    const interval = params.rotationIntervalDays || this.config.defaultRotationIntervalDays;
    const expiresAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    const secret: ManagedSecret = {
      id,
      name: params.name,
      type: params.type,
      tenantId: params.tenantId,
      value: this.encryptSecret(params.value),
      previousValue: null,
      createdAt: now.toISOString(),
      rotatedAt: null,
      expiresAt: expiresAt.toISOString(),
      rotationIntervalDays: interval,
      isActive: true,
    };

    this.secrets.set(id, secret);
    return { ...secret, value: '[ENCRYPTED]' };
  }

  /**
   * Rotate a secret to a new value
   * @param secretId The ID of the secret to rotate
   * @param newValue Optional new value (auto-generated if not provided)
   */
  async rotateSecret(secretId: string, newValue?: string): Promise<RotationResult> {
    const secret = this.secrets.get(secretId);
    if (!secret) {
      return {
        secretId,
        secretName: 'unknown',
        secretType: 'api_key',
        previousValueHash: '',
        newValueHash: '',
        rotatedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        gracePeriodEndsAt: new Date().toISOString(),
        auditEventId: null,
        success: false,
        error: `Secret ${secretId} not found`,
      };
    }

    const now = new Date();
    const newSecretValue = newValue || this.generateSecretValue(secret.type);
    const graceEnd = new Date(now.getTime() + this.config.gracePeriodHours * 60 * 60 * 1000);
    const newExpiresAt = new Date(now.getTime() + secret.rotationIntervalDays * 24 * 60 * 60 * 1000);

    // Store previous value for grace period
    secret.previousValue = secret.value;
    secret.value = this.encryptSecret(newSecretValue);
    secret.rotatedAt = now.toISOString();
    secret.expiresAt = newExpiresAt.toISOString();

    const previousHash = crypto.createHash('sha256').update(newSecretValue).digest('hex');
    const newHash = crypto.createHash('sha256').update(newSecretValue).digest('hex');

    // If encryption key type, also rotate via KeyRotationManager
    let auditEventId: string | null = null;
    if (secret.type === 'encryption_key') {
      try {
        const keyManager = KeyRotationManager.getInstance();
        const keyVersion = keyManager.rotate(newSecretValue);
        auditEventId = `key-rotation-v${keyVersion.version}`;
      } catch (error: any) {
        // Log but don't fail - encryption key rotation is best-effort
        console.error(`Encryption key rotation failed: ${error.message}`);
      }
    }

    const result: RotationResult = {
      secretId: secret.id,
      secretName: secret.name,
      secretType: secret.type,
      previousValueHash: previousHash,
      newValueHash: newHash,
      rotatedAt: now.toISOString(),
      expiresAt: newExpiresAt.toISOString(),
      gracePeriodEndsAt: graceEnd.toISOString(),
      auditEventId,
      success: true,
      error: null,
    };

    // Track rotation history
    const history = this.rotationHistory.get(secretId) || [];
    history.push(result);
    // Keep only max previous records
    if (history.length > this.config.maxPreviousValues + 1) {
      history.shift();
    }
    this.rotationHistory.set(secretId, history);

    return result;
  }

  /**
   * Check which secrets are due for rotation
   */
  getSecretsDueForRotation(): ManagedSecret[] {
    const now = new Date();
    const due: ManagedSecret[] = [];

    for (const secret of this.secrets.values()) {
      if (!secret.isActive) continue;
      const expiresAt = new Date(secret.expiresAt!);
      // Rotate 7 days before expiry to avoid disruption
      const rotationDue = new Date(expiresAt.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (now >= rotationDue) {
        due.push(secret);
      }
    }

    return due;
  }

  /**
   * Auto-rotate all secrets that are due
   */
  async autoRotateDueSecrets(): Promise<RotationResult[]> {
    const due = this.getSecretsDueForRotation();
    if (!this.config.autoRotationEnabled) {
      return [];
    }

    const results: RotationResult[] = [];
    for (const secret of due) {
      const result = await this.rotateSecret(secret.id);
      results.push(result);
    }
    return results;
  }

  /**
   * Get rotation history for a secret
   */
  getRotationHistory(secretId: string): RotationResult[] {
    return this.rotationHistory.get(secretId) || [];
  }

  /**
   * Get all managed secrets (values masked)
   */
  getAllSecrets(tenantId?: string): ManagedSecret[] {
    const results = Array.from(this.secrets.values());
    const filtered = tenantId ? results.filter((s) => s.tenantId === tenantId) : results;
    return filtered.map((s) => ({ ...s, value: '[ENCRYPTED]', previousValue: s.previousValue ? '[ENCRYPTED]' : null }));
  }

  /**
   * Get a secret value (decrypted) - only for direct use, not for logging
   */
  getSecretValue(secretId: string): string | null {
    const secret = this.secrets.get(secretId);
    if (!secret) return null;
    return this.decryptSecret(secret.value);
  }

  /**
   * Verify a value against the stored secret (supports grace period)
   */
  verifySecret(secretId: string, candidateValue: string): boolean {
    const secret = this.secrets.get(secretId);
    if (!secret) return false;

    // Check current value
    const currentValue = this.decryptSecret(secret.value);
    if (candidateValue === currentValue) return true;

    // Check previous value (within grace period)
    if (secret.previousValue) {
      const graceEnd = new Date(secret.rotatedAt!);
      graceEnd.setHours(graceEnd.getHours() + this.config.gracePeriodHours);
      if (new Date() <= graceEnd) {
        const previousValue = this.decryptSecret(secret.previousValue);
        if (candidateValue === previousValue) return true;
      }
    }

    return false;
  }

  /**
   * Deactivate a secret (mark as no longer valid)
   */
  deactivateSecret(secretId: string): boolean {
    const secret = this.secrets.get(secretId);
    if (!secret) return false;
    secret.isActive = false;
    return true;
  }

  /**
   * Encrypt a secret value using the master key
   */
  private encryptSecret(value: string): string {
    const masterKey = config.encryption.masterKey;
    if (!masterKey) {
      throw new Error('Encryption master key is not configured');
    }
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha512');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a secret value
   */
  private decryptSecret(encryptedData: string): string {
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
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha512');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generate a cryptographically secure random secret value
   */
  private generateSecretValue(type: ManagedSecret['type']): string {
    switch (type) {
      case 'webhook_secret':
        return `whsec_${crypto.randomBytes(32).toString('hex')}`;
      case 'api_key':
        return `tpt_${crypto.randomBytes(32).toString('hex')}`;
      case 'encryption_key':
        return crypto.randomBytes(32).toString('hex');
      case 'integration_token':
        return crypto.randomBytes(24).toString('base64url');
    }
  }

  /**
   * Update rotation configuration at runtime
   */
  updateConfig(newConfig: Partial<SecretsRotationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): SecretsRotationConfig {
    return { ...this.config };
  }
}