// ============================================================================
// TPT Doctor — PHI Encryption Audit Tests (Phase 15.4)
// Verifies encryption coverage inventory and field-level helpers.
// ============================================================================

import {
  PHI_FIELD_INVENTORY,
  generateEncryptionAuditReport,
  encryptPhiField,
  decryptPhiField,
  maskPhiField,
} from '../../src/modules/audit-log/phi-encryption-audit';

jest.mock('@tpt-doctor/encryption', () => ({
  encrypt: jest.fn((v: string) => `ENC:${v}`),
  decrypt: jest.fn((v: string) => v.replace(/^ENC:/, '')),
  maskPhi: jest.fn((v: string, n: number) => `${'*'.repeat(v.length - n)}${v.slice(-n)}`),
}));

jest.mock('@tpt-doctor/config', () => ({
  config: { encryption: { masterKey: 'test-master-key-32-chars-xxxxxxxx' } },
}));

describe('PHI Field Inventory', () => {
  it('contains at least 15 inventoried PHI fields', () => {
    expect(PHI_FIELD_INVENTORY.length).toBeGreaterThanOrEqual(15);
  });

  it('all fields have required properties defined', () => {
    for (const field of PHI_FIELD_INVENTORY) {
      expect(field.model).toBeTruthy();
      expect(field.field).toBeTruthy();
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(field.sensitivity);
      expect(['ENCRYPTED', 'PLAINTEXT', 'HASHED', 'NOT_APPLICABLE']).toContain(field.encryptionStatus);
      expect(['DEMOGRAPHIC', 'FINANCIAL', 'CLINICAL', 'IDENTITY', 'CONTACT', 'BIOMETRIC']).toContain(field.category);
      expect(typeof field.hipaaIdentifier).toBe('boolean');
    }
  });

  it('Patient.ssn is marked as ENCRYPTED', () => {
    const ssnField = PHI_FIELD_INVENTORY.find(
      (f) => f.model === 'Patient' && f.field === 'ssn',
    );
    expect(ssnField).toBeDefined();
    expect(ssnField!.encryptionStatus).toBe('ENCRYPTED');
    expect(ssnField!.sensitivity).toBe('HIGH');
    expect(ssnField!.hipaaIdentifier).toBe(true);
  });

  it('NhiValidationLog.nhiNumber is included as a HIPAA-equivalent identifier', () => {
    const nhiField = PHI_FIELD_INVENTORY.find(
      (f) => f.model === 'NhiValidationLog' && f.field === 'nhiNumber',
    );
    expect(nhiField).toBeDefined();
    expect(nhiField!.hipaaIdentifier).toBe(true);
  });

  it('PatientInsurance.policyNumber is tracked as HIGH sensitivity', () => {
    const policyField = PHI_FIELD_INVENTORY.find(
      (f) => f.model === 'PatientInsurance' && f.field === 'policyNumber',
    );
    expect(policyField).toBeDefined();
    expect(policyField!.sensitivity).toBe('HIGH');
  });
});

describe('generateEncryptionAuditReport', () => {
  it('returns a valid audit report structure', () => {
    const report = generateEncryptionAuditReport();
    expect(report.totalFields).toBeGreaterThan(0);
    expect(report.encryptedFields).toBeGreaterThanOrEqual(0);
    expect(report.encryptionCoverage).toBeGreaterThanOrEqual(0);
    expect(report.encryptionCoverage).toBeLessThanOrEqual(100);
    expect(Array.isArray(report.plaintextHighSensitivity)).toBe(true);
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  it('identifies plaintext HIGH-sensitivity fields as recommendations', () => {
    const report = generateEncryptionAuditReport();
    expect(report.plaintextHighSensitivity.length).toBeGreaterThan(0);
    expect(report.recommendations.length).toBe(report.plaintextHighSensitivity.length);

    report.recommendations.forEach((rec) => {
      expect(rec).toMatch(/HIGH sensitivity PHI stored in plaintext/);
      expect(rec).toMatch(/encrypt\(\)/);
    });
  });

  it('encryptedFields count matches ENCRYPTED entries in inventory', () => {
    const report = generateEncryptionAuditReport();
    const manualCount = PHI_FIELD_INVENTORY.filter(
      (f) => f.encryptionStatus === 'ENCRYPTED',
    ).length;
    expect(report.encryptedFields).toBe(manualCount);
  });

  it('encryptionCoverage is calculated as (encrypted / total) * 100 rounded', () => {
    const report = generateEncryptionAuditReport();
    const expected = Math.round((report.encryptedFields / report.totalFields) * 100);
    expect(report.encryptionCoverage).toBe(expected);
  });
});

describe('encryptPhiField helper', () => {
  it('encrypts a non-null string', () => {
    const result = encryptPhiField('123-45-6789');
    expect(result).toBe('ENC:123-45-6789');
  });

  it('returns null for null input', () => {
    expect(encryptPhiField(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(encryptPhiField(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(encryptPhiField('')).toBeNull();
  });
});

describe('decryptPhiField helper', () => {
  it('decrypts an encrypted value', () => {
    const result = decryptPhiField('ENC:123-45-6789');
    expect(result).toBe('123-45-6789');
  });

  it('returns null for null input', () => {
    expect(decryptPhiField(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(decryptPhiField(undefined)).toBeNull();
  });

  it('returns null when decryption fails (corrupted data)', () => {
    const { decrypt } = require('@tpt-doctor/encryption');
    decrypt.mockImplementationOnce(() => { throw new Error('Decryption failed'); });
    expect(decryptPhiField('corrupted-data')).toBeNull();
  });
});

describe('maskPhiField helper', () => {
  it('masks SSN showing only last 4 digits', () => {
    const result = maskPhiField('123-45-6789');
    expect(result).toBe('*******6789');
  });

  it('returns null for null input', () => {
    expect(maskPhiField(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(maskPhiField(undefined)).toBeNull();
  });

  it('respects custom visibleChars parameter', () => {
    const result = maskPhiField('1234567890', 6);
    expect(result).toBe('****567890');
  });
});
