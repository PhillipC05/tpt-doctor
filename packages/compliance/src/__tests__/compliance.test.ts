import { describe, it, expect } from '@jest/globals';
import {
  validateDataRetention,
  validateConsents,
  isDataProcessingAllowed,
  getComplianceFrameworks,
  validateTenantCompliance,
  generateDSARReport,
  ComplianceCheck,
} from '../index';
import {
  ConsentType,
  ComplianceFramework,
  DataRegion,
  PatientConsent,
} from '@tpt-doctor/shared';

describe('validateDataRetention', () => {
  it('should return true for recent records under HIPAA (6 years)', () => {
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 1);
    expect(validateDataRetention(recent, ComplianceFramework.HIPAA)).toBe(true);
  });

  it('should return false for records older than 6 years under HIPAA', () => {
    const old = new Date();
    old.setFullYear(old.getFullYear() - 10);
    expect(validateDataRetention(old, ComplianceFramework.HIPAA)).toBe(false);
  });

  it('should enforce 10-year retention for NZ HISO', () => {
    const oldForNZ = new Date();
    oldForNZ.setFullYear(oldForNZ.getFullYear() - 8);
    expect(validateDataRetention(oldForNZ, ComplianceFramework.NZ_HISO)).toBe(true);

    const tooOld = new Date();
    tooOld.setFullYear(tooOld.getFullYear() - 15);
    expect(validateDataRetention(tooOld, ComplianceFramework.NZ_HISO)).toBe(false);
  });

  it('should enforce 7-year retention for AU Privacy', () => {
    const valid = new Date();
    valid.setFullYear(valid.getFullYear() - 5);
    expect(validateDataRetention(valid, ComplianceFramework.AU_PRIVACY)).toBe(true);

    const tooOld = new Date();
    tooOld.setFullYear(tooOld.getFullYear() - 10);
    expect(validateDataRetention(tooOld, ComplianceFramework.AU_PRIVACY)).toBe(false);
  });

  it('should enforce 3-year retention for GDPR', () => {
    const valid = new Date();
    valid.setFullYear(valid.getFullYear() - 2);
    expect(validateDataRetention(valid, ComplianceFramework.GDPR)).toBe(true);

    const tooOld = new Date();
    tooOld.setFullYear(tooOld.getFullYear() - 5);
    expect(validateDataRetention(tooOld, ComplianceFramework.GDPR)).toBe(false);
  });
});

describe('validateConsents', () => {
  const createConsent = (type: ConsentType, granted: boolean, revokedAt?: string): PatientConsent => ({
    id: 'consent-1',
    patientId: 'patient-1',
    consentType: type,
    isGranted: granted,
    grantedAt: granted ? new Date().toISOString() : '',
    revokedAt: revokedAt || null,
    expiresAt: null,
    notes: null,
  });

  it('should return granted when all required consents are present', () => {
    const consents = [
      createConsent(ConsentType.TREATMENT, true),
      createConsent(ConsentType.HEALTHCARE_OPERATIONS, true),
    ];
    const result = validateConsents(consents, [ConsentType.TREATMENT, ConsentType.HEALTHCARE_OPERATIONS]);
    expect(result.granted).toBe(true);
    expect(result.missingConsents).toEqual([]);
  });

  it('should return not granted when a required consent is missing', () => {
    const consents = [createConsent(ConsentType.TREATMENT, true)];
    const result = validateConsents(consents, [ConsentType.TREATMENT, ConsentType.MARKETING]);
    expect(result.granted).toBe(false);
    expect(result.missingConsents).toContain(ConsentType.MARKETING);
  });

  it('should detect revoked consents', () => {
    const consents = [createConsent(ConsentType.TREATMENT, true, new Date().toISOString())];
    const result = validateConsents(consents, [ConsentType.TREATMENT]);
    expect(result.granted).toBe(false);
    expect(result.missingConsents).toContain(ConsentType.TREATMENT);
  });

  it('should return granted when no consents are required', () => {
    const result = validateConsents([], []);
    expect(result.granted).toBe(true);
    expect(result.missingConsents).toEqual([]);
  });
});

describe('isDataProcessingAllowed', () => {
  it('should return true for all regions', () => {
    expect(isDataProcessingAllowed(DataRegion.US, [ConsentType.TREATMENT])).toBe(true);
    expect(isDataProcessingAllowed(DataRegion.EU, [ConsentType.TREATMENT])).toBe(true);
    expect(isDataProcessingAllowed(DataRegion.AU, [ConsentType.TREATMENT])).toBe(true);
    expect(isDataProcessingAllowed(DataRegion.NZ, [ConsentType.TREATMENT])).toBe(true);
  });
});

describe('getComplianceFrameworks', () => {
  it('should return HIPAA for US', () => {
    const frameworks = getComplianceFrameworks(DataRegion.US);
    expect(frameworks).toEqual([ComplianceFramework.HIPAA]);
  });

  it('should return GDPR for EU', () => {
    const frameworks = getComplianceFrameworks(DataRegion.EU);
    expect(frameworks).toEqual([ComplianceFramework.GDPR]);
  });

  it('should return AU_PRIVACY for AU', () => {
    const frameworks = getComplianceFrameworks(DataRegion.AU);
    expect(frameworks).toEqual([ComplianceFramework.AU_PRIVACY]);
  });

  it('should return NZ_HISO for NZ', () => {
    const frameworks = getComplianceFrameworks(DataRegion.NZ);
    expect(frameworks).toEqual([ComplianceFramework.NZ_HISO]);
  });
});

describe('validateTenantCompliance', () => {
  it('should validate HIPAA compliance checks', async () => {
    const result = await validateTenantCompliance('tenant-1', DataRegion.US);
    expect(result.passed).toBe(true);
    expect(result.framework).toBe(ComplianceFramework.HIPAA);
    expect(result.checks.length).toBeGreaterThanOrEqual(6);

    const checkNames = result.checks.map((c: ComplianceCheck) => c.name);
    expect(checkNames).toContain('Encryption at Rest');
    expect(checkNames).toContain('Audit Logging');
    expect(checkNames).toContain('Access Controls');
    expect(checkNames).toContain('Breach Notification');
  });

  it('should validate GDPR compliance checks', async () => {
    const result = await validateTenantCompliance('tenant-1', DataRegion.EU);
    expect(result.passed).toBe(true);
    expect(result.framework).toBe(ComplianceFramework.GDPR);
    const checkNames = result.checks.map((c: ComplianceCheck) => c.name);
    expect(checkNames).toContain('Lawful Basis');
    expect(checkNames).toContain('Data Subject Rights');
    expect(checkNames).toContain('Data Portability');
  });

  it('should validate AU Privacy compliance', async () => {
    const result = await validateTenantCompliance('tenant-1', DataRegion.AU);
    expect(result.passed).toBe(true);
    expect(result.framework).toBe(ComplianceFramework.AU_PRIVACY);
  });

  it('should validate NZ HISO compliance', async () => {
    const result = await validateTenantCompliance('tenant-1', DataRegion.NZ);
    expect(result.passed).toBe(true);
    expect(result.framework).toBe(ComplianceFramework.NZ_HISO);
  });
});

describe('generateDSARReport', () => {
  it('should generate a DSAR report with all data categories', async () => {
    const result = await generateDSARReport('user-1', 'tenant-1', ComplianceFramework.GDPR);
    expect(result.userId).toBe('user-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.framework).toBe(ComplianceFramework.GDPR);
    expect(result.dataCategories).toContain('Medical Records');
    expect(result.dataCategories).toContain('Appointments');
    expect(result.dataCategories).toContain('Billing History');
    expect(result.dataCategories).toContain('Audit Logs');
    expect(result.dataCategories).toContain('Consent Records');
    expect(result.generatedAt).toBeDefined();
  });
});