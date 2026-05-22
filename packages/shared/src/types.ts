// ============================================================================
// TPT Doctor — Shared Types
// ============================================================================

import {
  UserRole,
  Permission,
  AppointmentStatus,
  EncounterType,
  Gender,
  BloodType,
  MaritalStatus,
  InsuranceType,
  ClaimStatus,
  PaymentStatus,
  PrescriptionStatus,
  LabStatus,
  AuditAction,
  ConsentType,
  ComplianceFramework,
  DataRegion,
  Severity,
  NotificationType,
  CountryCode,
  CodingSystem,
  MbsItemType,
  PbsCategory,
  MyHealthRecordDocumentType,
  NzClaimType,
  NhiStatus,
  UkClaimType,
  ProvincialHealthPlan,
  ClaimSubmissionChannel,
  ClaimSubmissionMethod,
  AirVaccineStatus,
} from './enums';

// ============================================================================
// Tenant / Organization
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  dataRegion: DataRegion;
  complianceFrameworks: ComplianceFramework[];
  isActive: boolean;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  timezone: string;
  dateFormat: string;
  currency: string;
  defaultAppointmentDuration: number;
  enableTelemedicine: boolean;
  enablePatientPortal: boolean;
  enableBilling: boolean;
  businessHours: BusinessHours;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string | null;
  close: string | null;
  isOpen: boolean;
}

// ============================================================================
// Staff
// ============================================================================

export interface StaffMember {
  id: string;
  tenantId: string;
  userId: string;
  role: UserRole;
  permissions: Permission[];
  title: string;
  licenseNumber: string | null;
  npiNumber: string | null; // US National Provider Identifier
  specialization: string | null;
  isActive: boolean;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  auth0Id: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Patient
// ============================================================================

export interface Patient {
  id: string;
  tenantId: string;
  userId: string | null;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  bloodType: BloodType;
  maritalStatus: MaritalStatus;
  ssn: string | null; // Encrypted PHI
  email: string;
  phone: string;
  address: Address;
  emergencyContact: EmergencyContact | null;
  insurance: PatientInsurance[];
  primaryCareProviderId: string | null;
  preferredPharmacyId: string | null;
  consents: PatientConsent[];
  isActive: boolean;
  tags: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street: string;
  street2: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
}

export interface PatientInsurance {
  id: string;
  patientId: string;
  provider: string;
  policyNumber: string;
  groupNumber: string | null;
  insuranceType: InsuranceType;
  isPrimary: boolean;
  coverageStart: string;
  coverageEnd: string | null;
  copay: number;
  deductible: number;
  deductibleMet: number;
}

export interface PatientConsent {
  id: string;
  patientId: string;
  consentType: ConsentType;
  isGranted: boolean;
  grantedAt: string;
  revokedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
}

// ============================================================================
// EHR / Medical Records
// ============================================================================

export interface Encounter {
  id: string;
  tenantId: string;
  patientId: string;
  staffId: string;
  appointmentId: string | null;
  encounterType: EncounterType;
  date: string;
  chiefComplaint: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  diagnosisCodes: DiagnosisCode[];
  vitals: Vitals | null;
  isSigned: boolean;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosisCode {
  id: string;
  code: string; // ICD-10
  description: string;
  isPrimary: boolean;
}

export interface Vitals {
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
  temperatureUnit: 'C' | 'F';
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
  weightUnit: 'kg' | 'lbs';
  height: number | null;
  heightUnit: 'cm' | 'in';
  bmi: number | null;
  painLevel: number | null;
  notes: string | null;
}

export interface MedicalCondition {
  id: string;
  patientId: string;
  code: string;
  description: string;
  onsetDate: string;
  resolvedDate: string | null;
  isChronic: boolean;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  notes: string | null;
}

export interface Allergy {
  id: string;
  patientId: string;
  allergen: string;
  reaction: string;
  severity: Severity;
  onsetDate: string;
  isActive: boolean;
}

export interface Immunization {
  id: string;
  patientId: string;
  vaccineName: string;
  cvxCode: string;
  administrationDate: string;
  administeredBy: string;
  lotNumber: string;
  manufacturer: string;
  doseNumber: number;
  notes: string | null;
}

// ============================================================================
// Appointment
// ============================================================================

export interface Appointment {
  id: string;
  tenantId: string;
  patientId: string;
  staffId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  type: EncounterType;
  isRecurring: boolean;
  recurringPattern: RecurringPattern | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringPattern {
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  interval: number;
  endDate: string;
  daysOfWeek: number[];
}

// ============================================================================
// Billing
// ============================================================================

export interface Invoice {
  id: string;
  tenantId: string;
  patientId: string;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: PaymentStatus;
  dueDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  cptCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  icd10Codes: string[];
}

export interface Claim {
  id: string;
  tenantId: string;
  patientId: string;
  invoiceId: string;
  claimNumber: string;
  insuranceId: string;
  serviceDate: string;
  submittedDate: string | null;
  status: ClaimStatus;
  amount: number;
  paidAmount: number;
  denialReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Prescription
// ============================================================================

export interface Prescription {
  id: string;
  tenantId: string;
  patientId: string;
  staffId: string;
  medicationName: string;
  strength: string;
  form: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  dispenseAsWritten: boolean;
  notes: string | null;
  status: PrescriptionStatus;
  pharmacyId: string | null;
  submittedAt: string | null;
  filledAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Lab
// ============================================================================

export interface LabOrder {
  id: string;
  tenantId: string;
  patientId: string;
  staffId: string;
  labName: string;
  testName: string;
  loincCode: string;
  status: LabStatus;
  orderedAt: string;
  collectedAt: string | null;
  resultAt: string | null;
  result: LabResult | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabResult {
  value: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  flagged: 'HIGH' | 'LOW' | 'CRITICAL_HIGH' | 'CRITICAL_LOW' | 'NORMAL' | null;
  notes: string | null;
}

// ============================================================================
// Audit Log
// ============================================================================

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  tamperHash: string;
  previousHash: string;
}

// ============================================================================
// Messaging
// ============================================================================

export interface Message {
  id: string;
  tenantId: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  attachments: MessageAttachment[];
  isRead: boolean;
  readAt: string | null;
  parentMessageId: string | null;
  isUrgent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string; // Encrypted S3 key
}

// ============================================================================
// Notifications
// ============================================================================

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ============================================================================
// Pagination & Common
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown> | null;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface DateRange {
  start: string;
  end: string;
}

// ============================================================================
// Waitlist
// ============================================================================

export interface WaitlistEntry {
  id: string;
  tenantId: string;
  patientId: string;
  preferredDate: string;
  preferredTime: string | null;
  preferredStaffId: string | null;
  encounterType: EncounterType;
  notes: string | null;
  status: import('./enums').WaitlistStatus;
  notifiedAt: string | null;
  notifiedVia: import('./enums').ReminderChannel | null;
  bookedAt: string | null;
  bookedAppointmentId: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Block Times
// ============================================================================

export interface BlockTime {
  id: string;
  tenantId: string;
  staffId: string | null;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Check-in / Check-out
// ============================================================================

export interface CheckInRecord {
  id: string;
  tenantId: string;
  appointmentId: string;
  patientId: string;
  checkedInAt: string;
  checkedInBy: string;
  checkedOutAt: string | null;
  checkedOutBy: string | null;
  status: import('./enums').CheckInStatus;
  waitTimeMinutes: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PTO / Leave
// ============================================================================

export interface TimeOffRequest {
  id: string;
  tenantId: string;
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: string;
  status: import('./enums').PTOStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Credentialing
// ============================================================================

export interface Credential {
  id: string;
  tenantId: string;
  staffId: string;
  credentialType: import('./enums').CredentialType;
  credentialNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expirationDate: string;
  status: import('./enums').CredentialStatus;
  attachmentUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// EHR Templates
// ============================================================================

export interface EhrTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  templateType: EncounterType;
  category: string;
  content: Record<string, unknown>;
  isPublic: boolean;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Decision Support Rules
// ============================================================================

export interface DecisionSupportRule {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  category: import('./enums').DecisionSupportCategory;
  severity: import('./enums').DecisionSupportSeverity;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  isActive: boolean;
  appliesToRoles: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Appointment Reminders
// ============================================================================

export interface AppointmentReminder {
  id: string;
  tenantId: string;
  appointmentId: string;
  channel: import('./enums').ReminderChannel;
  scheduledFor: string;
  sentAt: string | null;
  status: import('./enums').ReminderStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Patient Merge / Dedup
// ============================================================================

export interface PatientMergeLog {
  id: string;
  tenantId: string;
  survivingPatientId: string;
  mergedPatientId: string;
  mergedAt: string;
  mergedBy: string;
  mergeReason: string | null;
}

// ============================================================================
// Staff Performance Metrics
// ============================================================================

export interface StaffPerformanceMetrics {
  staffId: string;
  staffName: string;
  totalAppointments: number;
  completedAppointments: number;
  noShowCount: number;
  cancellationRate: number;
  averageRating: number | null;
  averageConsultTimeMinutes: number;
  patientCount: number;
  onTimePercentage: number;
  periodStart: string;
  periodEnd: string;
}

// ============================================================================
// Country Profile — Shared (Phase 11)
// ============================================================================

export interface CountryProfile {
  countryCode: CountryCode;
  countryName: string;
  diagnosisSystem: CodingSystem;
  currency: string;
  dateFormat: string;
  phoneFormat: string;
  postalCodeFormat: string;
  supportsMbs: boolean;
  supportsPbs: boolean;
  supportsMyHealthRecord: boolean;
  supportsAir: boolean;
  supportsPipReporting: boolean;
  supportsMohClaiming: boolean;
  supportsPhoReporting: boolean;
  supportsNhi: boolean;
  supportsNhs: boolean;
  supportsQof: boolean;
  supportsGpConnect: boolean;
  supportsSpine: boolean;
  supportsEps: boolean;
  supportsProvincialClaims: boolean;
  supportsInfoway: boolean;
  supportsCanadianDrugDb: boolean;
  defaultLanguage: string;
  timezone: string;
  regulatoryBody: string;
  privacyAct: string;
}

export interface CountryProfileConfig {
  tenantId: string;
  countryCode: CountryCode;
  profile: CountryProfile;
  modules: CountryModuleConfig[];
  dataResidency: DataRegion;
  isActive: boolean;
}

export interface CountryModuleConfig {
  moduleName: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
}

// ============================================================================
// AU Country Profile — Types
// ============================================================================

export interface MbsItem {
  id: string;
  itemNumber: string;
  description: string;
  itemType: MbsItemType;
  scheduleFee: number;
  benefitAmount: number;
  isClaimable: boolean;
  rules: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MbsClaimSubmission {
  id: string;
  tenantId: string;
  patientId: string;
  claimNumber: string;
  items: MbsClaimItem[];
  totalAmount: number;
  totalBenefit: number;
  submissionMethod: ClaimSubmissionMethod;
  submissionChannel: ClaimSubmissionChannel;
  status: string;
  submittedAt: string | null;
  responseData: Record<string, unknown> | null;
  medicareReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MbsClaimItem {
  itemNumber: string;
  fee: number;
  benefit: number;
  serviceDate: string;
  diagnosisCodes: string[];
  providerId: string;
  referralId: string | null;
  restrictionCodes: string[];
}

export interface PbsPrescription {
  id: string;
  tenantId: string;
  patientId: string;
  staffId: string;
  pbsCode: string;
  medicationName: string;
  strength: string;
  quantity: number;
  repeats: number;
  category: PbsCategory;
  safetyNetEntitlement: boolean;
  concessionCardNumber: string | null;
  authorityPrescription: boolean;
  authorityNumber: string | null;
  streamlinedAuthority: boolean;
  specialPatientContributions: boolean;
  status: string;
  submittedAt: string | null;
  pharmacyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyHealthRecordDocument {
  id: string;
  tenantId: string;
  patientId: string;
  documentType: MyHealthRecordDocumentType;
  clinicalDocumentId: string;
  title: string;
  description: string | null;
  authoredAt: string;
  status: string;
  ihiNumber: string; // Individual Healthcare Identifier
  source: string;
  documentPayload: Record<string, unknown> | null;
  uploadedToMhr: boolean;
  uploadedAt: string | null;
  mhrDocumentId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AirRecordSubmission {
  id: string;
  tenantId: string;
  patientId: string;
  vaccineName: string;
  airVaccineCode: string;
  administrationDate: string;
  doseNumber: number;
  lotNumber: string;
  manufacturer: string;
  administeringProviderId: string;
  status: AirVaccineStatus;
  airReference: string | null;
  errorMessage: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipReport {
  id: string;
  tenantId: string;
  reportPeriod: string;
  reportType: string;
  indicators: PipIndicator[];
  totalIncentive: number;
  generatedAt: string;
  createdAt: string;
}

export interface PipIndicator {
  indicatorCode: string;
  description: string;
  target: string;
  achievement: string;
  achieved: boolean;
  incentiveAmount: number;
}

// ============================================================================
// NZ Country Profile — Types
// ============================================================================

export interface NzClaimSubmission {
  id: string;
  tenantId: string;
  patientId: string;
  claimType: NzClaimType;
  claimNumber: string;
  serviceDate: string;
  items: NzClaimItem[];
  totalAmount: number;
  subsidyAmount: number;
  patientCoPayment: number;
  submissionMethod: ClaimSubmissionMethod;
  status: string;
  phoOrgId: string | null;
  submittedAt: string | null;
  responseData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface NzClaimItem {
  serviceCode: string;
  description: string;
  fee: number;
  subsidy: number;
  copayment: number;
  quantity: number;
  providerId: string;
  isAcc: boolean;
  accNumber: string | null;
}

export interface NhiValidationRequest {
  nhiNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
}

export interface NhiValidationResponse {
  isValid: boolean;
  status: NhiStatus;
  nhiNumber: string;
  matchedName: string | null;
  matchedDob: string | null;
  matchedGender: string | null;
  deceasedDate: string | null;
  message: string | null;
}

export interface NzImmunisationSubmission {
  id: string;
  tenantId: string;
  patientId: string;
  nhiNumber: string;
  vaccineName: string;
  vaccineCode: string;
  administrationDate: string;
  doseNumber: number;
  lotNumber: string;
  manufacturer: string;
  administeringProviderId: string;
  facilityCode: string;
  funded: boolean;
  scheduleStatus: string;
  status: string;
  cirReference: string | null;
  errorMessage: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PhoReport {
  id: string;
  tenantId: string;
  phoOrgId: string;
  reportPeriod: string;
  reportType: string; // CAPITATION, FFS, PERFORMANCE
  enrolledPatients: number;
  capitationAmount: number;
  ffsAmount: number;
  totalAmount: number;
  breakdown: Record<string, unknown>;
  generatedAt: string;
  createdAt: string;
}

// ============================================================================
// UK Country Profile — Types
// ============================================================================

export interface UkGp2GpRecordTransfer {
  id: string;
  tenantId: string;
  patientId: string;
  direction: string; // INCOMING, OUTGOING
  transferId: string;
  requestingPracticeOds: string;
  sendingPracticeOds: string;
  patientNhsNumber: string;
  status: string;
  recordPayload: Record<string, unknown> | null;
  transferredAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UkQofReport {
  id: string;
  tenantId: string;
  practiceOdsCode: string;
  reportPeriod: string;
  indicatorGroups: UkQofIndicatorGroup[];
  totalPoints: number;
  totalAchieved: number;
  totalPayment: number;
  generatedAt: string;
  createdAt: string;
}

export interface UkQofIndicatorGroup {
  groupName: string;
  indicators: UkQofIndicatorResult[];
}

export interface UkQofIndicatorResult {
  indicatorCode: string;
  description: string;
  numerator: number;
  denominator: number;
  exceptionCount: number;
  achievementRate: number;
  pointsAvailable: number;
  pointsAchieved: number;
  status: string;
}

export interface UkGpConnectInteraction {
  id: string;
  tenantId: string;
  patientId: string;
  interactionType: string; // APPOINTMENT_BOOKING, RECORD_SHARING, CONSULTATION
  gpConnectRequestId: string;
  status: string;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  performedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface UkSpineInteraction {
  id: string;
  tenantId: string;
  patientId: string;
  patientNhsNumber: string;
  interactionType: string; // PDS_LOOKUP, SCR_ACCESS, SCR_UPDATE
  spineRequestId: string;
  status: string;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  performedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface UkEpsPrescription {
  id: string;
  tenantId: string;
  prescriptionId: string;
  epsGuid: string;
  nominatedPharmacyOds: string | null;
  prescriptionType: string;
  dosageText: string;
  quantity: number;
  numberOfRepeats: number;
  status: string;
  submittedAt: string | null;
  dispensedAt: string | null;
  lastDispensedDate: string | null;
  cancelledAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CA Country Profile — Types
// ============================================================================

export interface CaProvincialClaimSubmission {
  id: string;
  tenantId: string;
  patientId: string;
  healthPlan: ProvincialHealthPlan;
  claimNumber: string;
  serviceDate: string;
  items: CaClaimItem[];
  totalAmount: number;
  paidAmount: number;
  submissionMethod: ClaimSubmissionMethod;
  status: string;
  submittedAt: string | null;
  responseData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaClaimItem {
  feeCode: string;
  description: string;
  fee: number;
  paid: number;
  quantity: number;
  providerId: string;
  diagnosisCode: string;
  serviceLocationCode: string;
}

export interface CaDrugDbLookup {
  din: string; // Drug Identification Number
  brandName: string;
  genericName: string;
  manufacturer: string;
  strength: string;
  form: string;
  route: string;
  schedule: string;
  status: string;
  provincialFormularies: string[];
  atcCode: string | null;
}

export interface CaImmunisationSubmission {
  id: string;
  tenantId: string;
  patientId: string;
  provincialHealthCard: string;
  province: string;
  vaccineName: string;
  vaccineCode: string;
  administrationDate: string;
  doseNumber: number;
  lotNumber: string;
  manufacturer: string;
  administeringProviderId: string;
  status: string;
  registryReference: string | null;
  errorMessage: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaInfowayInteraction {
  id: string;
  tenantId: string;
  patientId: string;
  interactionType: string; // EHR_QUERY, DOCUMENT_SUBMIT, PATIENT_SUMMARY
  infowayRequestId: string;
  status: string;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  performedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}
