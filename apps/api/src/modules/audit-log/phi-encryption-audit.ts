// ============================================================================
// TPT Doctor — PHI Field Encryption Audit (Phase 15.4)
// Inventories all PHI fields across Prisma models and verifies that
// sensitive fields are encrypted at rest using @tpt-doctor/encryption.
// ============================================================================

export type EncryptionStatus = 'ENCRYPTED' | 'PLAINTEXT' | 'HASHED' | 'NOT_APPLICABLE';
export type PhiCategory =
  | 'DEMOGRAPHIC'
  | 'FINANCIAL'
  | 'CLINICAL'
  | 'IDENTITY'
  | 'CONTACT'
  | 'BIOMETRIC';

export interface PhiField {
  model: string;
  field: string;
  category: PhiCategory;
  sensitivity: 'HIGH' | 'MEDIUM' | 'LOW';
  encryptionStatus: EncryptionStatus;
  encryptedBy?: string;
  notes?: string;
  hipaaIdentifier: boolean;
}

// ---------------------------------------------------------------------------
// PHI Field Inventory
// Based on 18 HIPAA Safe Harbor identifiers + additional clinical PHI
// ---------------------------------------------------------------------------

export const PHI_FIELD_INVENTORY: PhiField[] = [
  // --------------------------------------------------------------------------
  // Patient — core demographics and PII
  // --------------------------------------------------------------------------
  {
    model: 'Patient',
    field: 'ssn',
    category: 'IDENTITY',
    sensitivity: 'HIGH',
    encryptionStatus: 'ENCRYPTED',
    encryptedBy: 'patients.service.ts → encrypt()',
    notes: 'AES-256-GCM via @tpt-doctor/encryption',
    hipaaIdentifier: true,
  },
  {
    model: 'Patient',
    field: 'firstName',
    category: 'DEMOGRAPHIC',
    sensitivity: 'MEDIUM',
    encryptionStatus: 'PLAINTEXT',
    notes: 'HIPAA identifier; plaintext for search performance. Mitigated by row-level security and audit logging.',
    hipaaIdentifier: true,
  },
  {
    model: 'Patient',
    field: 'lastName',
    category: 'DEMOGRAPHIC',
    sensitivity: 'MEDIUM',
    encryptionStatus: 'PLAINTEXT',
    notes: 'HIPAA identifier; plaintext for search. Mitigated by RLS.',
    hipaaIdentifier: true,
  },
  {
    model: 'Patient',
    field: 'dateOfBirth',
    category: 'DEMOGRAPHIC',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'HIPAA identifier — RECOMMENDATION: encrypt; store hashed value for age-range queries.',
    hipaaIdentifier: true,
  },
  {
    model: 'Patient',
    field: 'email',
    category: 'CONTACT',
    sensitivity: 'MEDIUM',
    encryptionStatus: 'PLAINTEXT',
    notes: 'HIPAA identifier — RECOMMENDATION: encrypt at rest.',
    hipaaIdentifier: true,
  },
  {
    model: 'Patient',
    field: 'phone',
    category: 'CONTACT',
    sensitivity: 'MEDIUM',
    encryptionStatus: 'PLAINTEXT',
    notes: 'HIPAA identifier — RECOMMENDATION: encrypt at rest.',
    hipaaIdentifier: true,
  },
  {
    model: 'Patient',
    field: 'address',
    category: 'CONTACT',
    sensitivity: 'MEDIUM',
    encryptionStatus: 'PLAINTEXT',
    notes: 'HIPAA identifier (geographic data) — RECOMMENDATION: encrypt JSON blob.',
    hipaaIdentifier: true,
  },
  {
    model: 'Patient',
    field: 'emergencyContact',
    category: 'CONTACT',
    sensitivity: 'MEDIUM',
    encryptionStatus: 'PLAINTEXT',
    notes: 'Contains third-party PII (name, phone). RECOMMENDATION: encrypt.',
    hipaaIdentifier: true,
  },
  {
    model: 'Patient',
    field: 'medicalRecordNumber',
    category: 'IDENTITY',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'HIPAA identifier — unique account number. Plaintext required for index lookup; mitigated by RLS.',
    hipaaIdentifier: true,
  },

  // --------------------------------------------------------------------------
  // PatientInsurance — financial PHI
  // --------------------------------------------------------------------------
  {
    model: 'PatientInsurance',
    field: 'policyNumber',
    category: 'FINANCIAL',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'HIPAA identifier (health plan beneficiary number) — RECOMMENDATION: encrypt.',
    hipaaIdentifier: true,
  },
  {
    model: 'PatientInsurance',
    field: 'groupNumber',
    category: 'FINANCIAL',
    sensitivity: 'MEDIUM',
    encryptionStatus: 'PLAINTEXT',
    notes: 'HIPAA identifier — RECOMMENDATION: encrypt.',
    hipaaIdentifier: true,
  },

  // --------------------------------------------------------------------------
  // Encounter / Clinical notes
  // --------------------------------------------------------------------------
  {
    model: 'Encounter',
    field: 'chiefComplaint',
    category: 'CLINICAL',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'Clinical PHI. Protected by RLS and audit log; encryption would prevent full-text search.',
    hipaaIdentifier: false,
  },
  {
    model: 'Encounter',
    field: 'assessment',
    category: 'CLINICAL',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'Clinical PHI — full-text search dependency makes column encryption complex.',
    hipaaIdentifier: false,
  },
  {
    model: 'Encounter',
    field: 'plan',
    category: 'CLINICAL',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'Clinical PHI.',
    hipaaIdentifier: false,
  },

  // --------------------------------------------------------------------------
  // Prescription / Medication — sensitive treatment information
  // --------------------------------------------------------------------------
  {
    model: 'Prescription',
    field: 'medicationName',
    category: 'CLINICAL',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'Can reveal sensitive diagnoses (HIV, psych, substance abuse).',
    hipaaIdentifier: false,
  },
  {
    model: 'Prescription',
    field: 'diagnosisCode',
    category: 'CLINICAL',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'Links diagnosis to patient — clinical PHI.',
    hipaaIdentifier: false,
  },

  // --------------------------------------------------------------------------
  // ControlledSubstanceLog — DEA-regulated
  // --------------------------------------------------------------------------
  {
    model: 'ControlledSubstanceLog',
    field: 'rxNumber',
    category: 'CLINICAL',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'Controlled substance tracking — DEA requirement. RECOMMENDATION: encrypt at rest.',
    hipaaIdentifier: false,
  },

  // --------------------------------------------------------------------------
  // TelemedicineSession — session recording references
  // --------------------------------------------------------------------------
  {
    model: 'TelemedicineSession',
    field: 'recordingUrl',
    category: 'CLINICAL',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'URL to video recording. RECOMMENDATION: encrypt URL or use signed short-lived URLs only.',
    hipaaIdentifier: false,
  },

  // --------------------------------------------------------------------------
  // MedicalCertificate — legal/clinical document
  // --------------------------------------------------------------------------
  {
    model: 'MedicalCertificate',
    field: 'clinicalFindings',
    category: 'CLINICAL',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'Clinical PHI in certificate body.',
    hipaaIdentifier: false,
  },

  // --------------------------------------------------------------------------
  // NhiValidationLog — NZ national health identifier
  // --------------------------------------------------------------------------
  {
    model: 'NhiValidationLog',
    field: 'nhiNumber',
    category: 'IDENTITY',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'NZ National Health Identifier — RECOMMENDATION: encrypt.',
    hipaaIdentifier: true,
  },

  // --------------------------------------------------------------------------
  // UkSpineInteraction — NHS number (UK equivalent of SSN)
  // --------------------------------------------------------------------------
  {
    model: 'UkSpineInteraction',
    field: 'patientNhsNumber',
    category: 'IDENTITY',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'NHS number is a HIPAA-equivalent identifier — RECOMMENDATION: encrypt.',
    hipaaIdentifier: true,
  },
  {
    model: 'UkGp2GpTransfer',
    field: 'patientNhsNumber',
    category: 'IDENTITY',
    sensitivity: 'HIGH',
    encryptionStatus: 'PLAINTEXT',
    notes: 'NHS number — RECOMMENDATION: encrypt.',
    hipaaIdentifier: true,
  },
];

// ---------------------------------------------------------------------------
// Audit Summary
// ---------------------------------------------------------------------------

export function generateEncryptionAuditReport(): {
  totalFields: number;
  encryptedFields: number;
  plaintextHighSensitivity: PhiField[];
  encryptionCoverage: number;
  recommendations: string[];
} {
  const total = PHI_FIELD_INVENTORY.length;
  const encrypted = PHI_FIELD_INVENTORY.filter((f) => f.encryptionStatus === 'ENCRYPTED').length;
  const plaintextHigh = PHI_FIELD_INVENTORY.filter(
    (f) => f.encryptionStatus === 'PLAINTEXT' && f.sensitivity === 'HIGH',
  );

  const recommendations = plaintextHigh.map(
    (f) =>
      `[${f.model}.${f.field}] HIGH sensitivity PHI stored in plaintext. Apply encrypt() from @tpt-doctor/encryption before persisting.`,
  );

  return {
    totalFields: total,
    encryptedFields: encrypted,
    plaintextHighSensitivity: plaintextHigh,
    encryptionCoverage: Math.round((encrypted / total) * 100),
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Runtime field-value encryption helpers for service layer use
// ---------------------------------------------------------------------------

import { encrypt, decrypt, maskPhi } from '@tpt-doctor/encryption';

export function encryptPhiField(value: string | null | undefined): string | null {
  if (!value) return null;
  return encrypt(value);
}

export function decryptPhiField(encryptedValue: string | null | undefined): string | null {
  if (!encryptedValue) return null;
  try {
    return decrypt(encryptedValue);
  } catch {
    return null;
  }
}

export function maskPhiField(value: string | null | undefined, visibleChars = 4): string | null {
  if (!value) return null;
  return maskPhi(value, visibleChars);
}
