// ============================================================================
// TPT Doctor — Zod Validation Schemas
// ============================================================================

import { z } from 'zod';
import {
  Gender,
  BloodType,
  MaritalStatus,
  InsuranceType,
  AppointmentStatus,
  EncounterType,
  UserRole,
  DecisionSupportCategory,
  DecisionSupportSeverity,
  ReminderChannel,
  CredentialType,
  CredentialStatus,
} from './enums';

// ============================================================================
// Common
// ============================================================================

export const addressSchema = z.object({
  street: z.string().min(1).max(200),
  street2: z.string().nullable().optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zipCode: z.string().min(3).max(20),
  country: z.string().min(1).max(100),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
});

export const dateRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

// ============================================================================
// Auth
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  mfaCode: z.string().length(6).optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  invitationToken: z.string().optional(),
});

// ============================================================================
// Tenant
// ============================================================================

export const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  dataRegion: z.enum(['US', 'EU', 'AU', 'NZ']),
});

// ============================================================================
// Patient
// ============================================================================

export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.nativeEnum(Gender),
  bloodType: z.nativeEnum(BloodType).optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  ssn: z.string().optional(),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  address: addressSchema,
  emergencyContact: z
    .object({
      name: z.string().min(1).max(200),
      relationship: z.string().min(1).max(100),
      phone: z.string().min(7).max(20),
      email: z.string().email().nullable().optional(),
    })
    .optional(),
  insurance: z
    .array(
      z.object({
        provider: z.string().min(1).max(200),
        policyNumber: z.string().min(1).max(100),
        groupNumber: z.string().nullable().optional(),
        insuranceType: z.nativeEnum(InsuranceType),
        isPrimary: z.boolean(),
        copay: z.number().min(0).default(0),
        deductible: z.number().min(0).default(0),
      }),
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

// ============================================================================
// Appointment
// ============================================================================

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  staffId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  type: z.nativeEnum(EncounterType),
  isRecurring: z.boolean().default(false),
  recurringPattern: z
    .object({
      frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']),
      interval: z.number().int().positive().default(1),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      daysOfWeek: z.array(z.number().int().min(0).max(6)),
    })
    .optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();

// ============================================================================
// EHR / Encounter
// ============================================================================

export const createEncounterSchema = z.object({
  patientId: z.string().uuid(),
  staffId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  encounterType: z.nativeEnum(EncounterType),
  date: z.string().datetime(),
  chiefComplaint: z.string().min(1).max(500),
  subjective: z.string().max(10000).optional(),
  objective: z.string().max(10000).optional(),
  assessment: z.string().max(10000).optional(),
  plan: z.string().max(10000).optional(),
  diagnosisCodes: z
    .array(
      z.object({
        code: z.string().min(1).max(20),
        description: z.string().min(1).max(500),
        isPrimary: z.boolean(),
      }),
    )
    .optional(),
  vitals: z
    .object({
      bloodPressureSystolic: z.number().int().min(40).max(300).optional(),
      bloodPressureDiastolic: z.number().int().min(30).max(200).optional(),
      heartRate: z.number().int().min(20).max(300).optional(),
      temperature: z.number().min(30).max(45).optional(),
      temperatureUnit: z.enum(['C', 'F']).default('C'),
      respiratoryRate: z.number().int().min(4).max(80).optional(),
      oxygenSaturation: z.number().int().min(50).max(100).optional(),
      weight: z.number().min(1).max(500).optional(),
      weightUnit: z.enum(['kg', 'lbs']).default('kg'),
      height: z.number().min(20).max(300).optional(),
      heightUnit: z.enum(['cm', 'in']).default('cm'),
      painLevel: z.number().int().min(0).max(10).optional(),
      notes: z.string().max(500).optional(),
    })
    .optional(),
});

export const updateEncounterSchema = createEncounterSchema.partial();

// ============================================================================
// Prescription
// ============================================================================

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  medicationName: z.string().min(1).max(200),
  strength: z.string().min(1).max(100),
  form: z.string().min(1).max(100),
  route: z.string().min(1).max(100),
  frequency: z.string().min(1).max(100),
  duration: z.string().min(1).max(100),
  quantity: z.number().int().positive(),
  refills: z.number().int().min(0).max(12),
  dispenseAsWritten: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  pharmacyId: z.string().uuid().optional(),
  expiresAt: z.string().datetime(),
});

// ============================================================================
// Lab Order
// ============================================================================

export const createLabOrderSchema = z.object({
  patientId: z.string().uuid(),
  labName: z.string().min(1).max(200),
  testName: z.string().min(1).max(200),
  loincCode: z.string().min(1).max(20),
  notes: z.string().max(2000).optional(),
});

// ============================================================================
// Staff
// ============================================================================

export const createStaffSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).refine((r: UserRole) => r !== UserRole.PATIENT, {
    message: 'Cannot create a patient as staff',
  }),
  title: z.string().min(1).max(200),
  licenseNumber: z.string().optional(),
  specialization: z.string().optional(),
});

// ============================================================================
// Billing
// ============================================================================

export const createInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  items: z
    .array(
      z.object({
        cptCode: z.string().min(1).max(20),
        description: z.string().min(1).max(500),
        quantity: z.number().int().positive(),
        unitPrice: z.number().min(0),
        icd10Codes: z.array(z.string().min(1).max(20)).default([]),
      }),
    )
    .min(1),
  discount: z.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().datetime(),
});

export const processPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'ACH', 'CASH', 'CHECK']),
  paymentProvider: z.enum(['STRIPE', 'AIRWALLEX']),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// User Profile
// ============================================================================

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(7).max(20).optional(),
  avatarUrl: z.string().url().optional(),
});

// ============================================================================
// Patient Consent
// ============================================================================

export const updateConsentSchema = z.object({
  isGranted: z.boolean(),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// Patient Merge / Dedup
// ============================================================================

export const mergePatientsSchema = z.object({
  survivingPatientId: z.string().uuid(),
  mergedPatientId: z.string().uuid(),
  mergeReason: z.string().max(2000).optional(),
});

// ============================================================================
// Document Upload
// ============================================================================

export const uploadDocumentSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024),
  mimeType: z.string().min(1).max(100),
  storageKey: z.string().min(1).max(500),
  category: z.string().max(100).optional(),
});

// ============================================================================
// EHR Templates
// ============================================================================

export const createEhrTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  templateType: z.nativeEnum(EncounterType),
  category: z.string().min(1).max(100),
  content: z.record(z.unknown()),
  isPublic: z.boolean().default(true),
});

export const updateEhrTemplateSchema = createEhrTemplateSchema.partial();

// ============================================================================
// Decision Support Rules
// ============================================================================

export const createDecisionSupportRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.nativeEnum(DecisionSupportCategory),
  severity: z.nativeEnum(DecisionSupportSeverity).default('WARNING' as any),
  condition: z.record(z.unknown()),
  action: z.record(z.unknown()),
  appliesToRoles: z.array(z.string()).default([]),
});

export const updateDecisionSupportRuleSchema = createDecisionSupportRuleSchema.partial();

// ============================================================================
// Recurring Appointments
// ============================================================================

export const createRecurringAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  staffId: z.string().uuid(),
  title: z.string().min(1).max(200),
  type: z.nativeEnum(EncounterType),
  location: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  recurringPattern: z.object({
    frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']),
    interval: z.number().int().positive().default(1),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    daysOfWeek: z.array(z.number().int().min(0).max(6)),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  }),
});

// ============================================================================
// Waitlist
// ============================================================================

export const createWaitlistEntrySchema = z.object({
  patientId: z.string().uuid(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  preferredStaffId: z.string().uuid().optional(),
  encounterType: z.nativeEnum(EncounterType),
  notes: z.string().max(2000).optional(),
});

// ============================================================================
// Block Times / Override
// ============================================================================

export const createBlockTimeSchema = z.object({
  staffId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAllDay: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

export const updateBlockTimeSchema = createBlockTimeSchema.partial();

// ============================================================================
// Appointment Reminder
// ============================================================================

export const createReminderSchema = z.object({
  appointmentId: z.string().uuid(),
  channel: z.nativeEnum(ReminderChannel),
  scheduledFor: z.string().datetime(),
});

// ============================================================================
// Check-in / Check-out
// ============================================================================

export const checkInSchema = z.object({
  appointmentId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

export const checkOutSchema = z.object({
  notes: z.string().max(500).optional(),
});

// ============================================================================
// PTO / Leave
// ============================================================================

export const createTimeOffRequestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1).max(500),
  type: z.enum(['VACATION', 'SICK', 'PERSONAL', 'OTHER']),
  notes: z.string().max(2000).optional(),
});

export const approveTimeOffSchema = z.object({
  approved: z.boolean(),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// Credentialing
// ============================================================================

// ============================================================================
// Message Templates
// ============================================================================

export const createMessageTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  category: z.string().min(1).max(100),
  variables: z.array(z.string()).default([]),
});

export const updateMessageTemplateSchema = createMessageTemplateSchema.partial();

// ============================================================================
// CPT / ICD-10 Codes
// ============================================================================

export const createCptCodeSchema = z.object({
  code: z.string().min(1).max(10),
  description: z.string().min(1).max(500),
  category: z.string().min(1).max(100),
  defaultPrice: z.number().min(0).optional(),
});

export const createIcd10CodeSchema = z.object({
  code: z.string().min(1).max(20),
  description: z.string().min(1).max(500),
  category: z.string().min(1).max(100),
});

// ============================================================================
// Insurance Verification
// ============================================================================

export const verifyInsuranceSchema = z.object({
  patientId: z.string().uuid(),
  insuranceId: z.string().uuid(),
  copay: z.number().min(0).optional(),
  deductible: z.number().min(0).optional(),
  deductibleMet: z.number().min(0).optional(),
  outOfPocketMax: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// Claim Submission (837)
// ============================================================================

export const submitClaimSchema = z.object({
  claimId: z.string().uuid(),
  submissionType: z.enum(['ORIGINAL', 'REPLACEMENT', 'VOID']).default('ORIGINAL'),
  patientName: z.string().optional(),
  diagnosisCodes: z.array(z.string()).optional(),
  procedureCodes: z.array(z.string()).optional(),
  providerInfo: z.record(z.unknown()).optional(),
  payerInfo: z.record(z.unknown()).optional(),
});

// ============================================================================
// ERA / EOB
// ============================================================================

export const processEraSchema = z.object({
  payerClaimNumber: z.string().min(1).max(100),
  patientResponsibility: z.number().min(0).optional(),
  amountPaid: z.number().min(0).optional(),
  adjustmentReason: z.string().optional(),
  adjustmentAmount: z.number().min(0).optional(),
  serviceDate: z.string().datetime().optional(),
  processedDate: z.string().datetime().optional(),
});

// ============================================================================
// Write-offs
// ============================================================================

export const createWriteOffSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
  writeOffType: z.enum(['CHARITY', 'CONTRACTUAL', 'BAD_DEBT', 'OTHER']),
  notes: z.string().max(2000).optional(),
});

// ============================================================================
// Refunds
// ============================================================================

export const processRefundSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
  notes: z.string().max(2000).optional(),
});

// ============================================================================
// Copay
// ============================================================================

export const recordCopaySchema = z.object({
  appointmentId: z.string().uuid(),
  amount: z.number().positive(),
  collectionMethod: z.enum(['CASH', 'CARD', 'CHECK', 'BILLED']),
  isVerified: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// HSA / FSA
// ============================================================================

export const createHsaFsaAccountSchema = z.object({
  patientId: z.string().uuid(),
  accountType: z.enum(['HSA', 'FSA']),
  accountNumber: z.string().min(1).max(100),
  providerName: z.string().min(1).max(200),
  balance: z.number().min(0).default(0),
  contributionLimit: z.number().min(0).optional(),
});

// ============================================================================
// Billing Statement
// ============================================================================

export const markStatementSentSchema = z.object({
  sentVia: z.enum(['EMAIL', 'MAIL', 'PORTAL']),
});

// ============================================================================
// ePrescribing
// ============================================================================

export const sendToPharmacySchema = z.object({
  pharmacyId: z.string().uuid().optional(),
});

// ============================================================================
// Drug Database
// ============================================================================

export const createDrugSchema = z.object({
  ndc: z.string().min(1).max(50),
  name: z.string().min(1).max(300),
  genericName: z.string().max(300).optional(),
  brandName: z.string().max(300).optional(),
  drugClass: z.string().max(100).optional(),
  route: z.string().max(100).optional(),
  strength: z.string().max(100).optional(),
  form: z.string().max(100).optional(),
  manufacturer: z.string().max(200).optional(),
  isControlled: z.boolean().default(false),
  schedule: z.string().max(10).optional(),
});

// ============================================================================
// Drug Interactions
// ============================================================================

export const createDrugInteractionSchema = z.object({
  drugId: z.string().uuid(),
  interactingDrugId: z.string().uuid(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).default('WARNING'),
  description: z.string().min(1),
  mechanism: z.string().max(500).optional(),
  management: z.string().optional(),
  evidence: z.string().max(500).optional(),
});

// ============================================================================
// Controlled Substances
// ============================================================================

export const logControlledSubstanceSchema = z.object({
  prescriptionId: z.string().uuid(),
  action: z.enum(['PRESCRIBED', 'DISPENSED', 'ADMINISTERED', 'WASTED', 'RETURNED']),
  quantity: z.number().int().positive(),
  remainingQuantity: z.number().int().min(0).optional(),
  deaNumber: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
});

// ============================================================================
// Pharmacy Directory
// ============================================================================

export const createPharmacySchema = z.object({
  name: z.string().min(1).max(200),
  ncpdpId: z.string().max(50).optional(),
  npiNumber: z.string().max(50).optional(),
  address: z.record(z.unknown()).default({}),
  phone: z.string().max(20).optional(),
  fax: z.string().max(20).optional(),
  email: z.string().email().optional(),
  supportsEprescribing: z.boolean().default(true),
  supportedNetworks: z.array(z.string()).default([]),
});

// ============================================================================
// Lab Panels
// ============================================================================

export const createLabPanelSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  labName: z.string().min(1).max(200),
  tests: z.array(z.object({
    testName: z.string().min(1),
    loincCode: z.string().min(1).max(20),
    component: z.string().optional(),
  })).min(1),
});

// ============================================================================
// External Lab Config
// ============================================================================

export const createExternalLabConfigSchema = z.object({
  labName: z.string().min(1).max(200),
  integrationType: z.enum(['FHIR', 'HL7', 'CSV', 'API']),
  apiEndpoint: z.string().max(500).optional(),
  apiKey: z.string().max(500).optional(),
  clientId: z.string().max(200).optional(),
  clientSecret: z.string().max(500).optional(),
  settings: z.record(z.unknown()).default({}),
});

// ============================================================================
// FHIR Import
// ============================================================================

export const importFhirResultsSchema = z.object({
  source: z.string().min(1).max(100),
  entries: z.array(z.object({
    patientId: z.string().uuid(),
    loincCode: z.string().min(1).max(20),
    value: z.string(),
    unit: z.string().optional(),
    referenceRange: z.string().optional(),
    isAbnormal: z.boolean().default(false),
    flagged: z.enum(['HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW', 'NORMAL']).optional(),
    notes: z.string().optional(),
  })).min(1),
});

// ============================================================================
// Credentialing
// ============================================================================

export const createCredentialSchema = z.object({
  staffId: z.string().uuid(),
  credentialType: z.nativeEnum(CredentialType),
  credentialNumber: z.string().min(1).max(100),
  issuingAuthority: z.string().min(1).max(200),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  attachmentUrl: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateCredentialSchema = z.object({
  status: z.nativeEnum(CredentialStatus).optional(),
  credentialNumber: z.string().min(1).max(100).optional(),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  attachmentUrl: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
});
