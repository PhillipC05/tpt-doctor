import { describe, it, expect, beforeAll } from '@jest/globals';
import { encrypt, decrypt, hashForIndexing, maskPhi, generateKey } from '../index';
import { config } from '@tpt-doctor/config';

// Set up encryption master key for tests
beforeAll(() => {
  // The config reads from environment variables; we set the test key
  process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32bytes-long-for-testing!';
  // Force config re-evaluation
  (config as any).encryption.masterKey = process.env.ENCRYPTION_MASTER_KEY;
});

describe('encrypt / decrypt', () => {
  it('should encrypt and decrypt a string correctly', () => {
    const original = 'sensitive-phi-data-ssn-123-45-6789';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':'); // salt:iv:tag:ciphertext format

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertexts for the same input (IV randomisation)', () => {
    const input = 'same-data';
    const encrypted1 = encrypt(input);
    const encrypted2 = encrypt(input);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should handle empty strings', () => {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('should handle special characters', () => {
    const input = '特殊文字 émojis 😊 and <script>alert("xss")</script>';
    const encrypted = encrypt(input);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(input);
  });

  it('should handle long strings', () => {
    const input = 'A'.repeat(10000);
    const encrypted = encrypt(input);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(input);
  });

  it('should throw on invalid encrypted format', () => {
    expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted data format');
  });

  it('should throw on tampered ciphertext', () => {
    const original = 'important-data';
    const encrypted = encrypt(original);
    // Tamper with the ciphertext part (last segment)
    const parts = encrypted.split(':');
    const tampered = [...parts.slice(0, 3), 'tampered-hex'].join(':');
    expect(() => decrypt(tampered)).toThrow();
  });
});

describe('hashForIndexing', () => {
  it('should produce a deterministic hash', () => {
    const hash1 = hashForIndexing('123-45-6789');
    const hash2 = hashForIndexing('123-45-6789');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = hashForIndexing('123-45-6789');
    const hash2 = hashForIndexing('987-65-4321');
    expect(hash1).not.toBe(hash2);
  });

  it('should return a hex string of expected length', () => {
    const hash = hashForIndexing('test-value');
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(hash.length).toBe(64); // SHA-512 hex output
  });
});

describe('maskPhi', () => {
  it('should mask all but last 4 characters by default', () => {
    expect(maskPhi('123-45-6789')).toBe('******6789');
  });

  it('should keep value as-is if shorter than visible chars', () => {
    expect(maskPhi('ABC')).toBe('ABC');
  });

  it('should support custom visible character count', () => {
    expect(maskPhi('123-45-6789', 2)).toBe('********89');
  });

  it('should handle empty string', () => {
    expect(maskPhi('')).toBe('');
  });

  it('should mask email addresses partially', () => {
    expect(maskPhi('john.doe@example.com', 4)).toBe('********************.com');
  });
});

describe('generateKey', () => {
  it('should generate a hex string of correct length', () => {
    const key = generateKey();
    expect(key).toMatch(/^[0-9a-f]+$/);
    expect(key.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it('should generate unique keys each time', () => {
    const key1 = generateKey();
    const key2 = generateKey();
    expect(key1).not.toBe(key2);
  });
});