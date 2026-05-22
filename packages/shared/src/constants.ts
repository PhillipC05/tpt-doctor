// ============================================================================
// TPT Doctor — Constants
// ============================================================================

export const APP_NAME = 'TPT Doctor';
export const APP_VERSION = '1.0.0';
export const API_PREFIX = '/api/v1';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const AUTH = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  MFA_TOKEN_EXPIRY: '5m',
  BCRYPT_SALT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  SESSION_TIMEOUT_MINUTES: 30,
} as const;

export const ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32,
  IV_LENGTH: 16,
  TAG_LENGTH: 16,
  SALT_LENGTH: 32,
  ENVELOPE_ENCRYPTION: true,
} as const;

export const AUDIT_LOG = {
  RETENTION_DAYS: 365, // HIPAA requires 6 years, stored in archive
  ARCHIVE_DAYS: 90,
  IMMUTABLE: true,
  TAMPER_DETECTION: true,
} as const;

export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/dicom',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  STORAGE_PROVIDER: 's3',
  ENCRYPT_UPLOADS: true,
} as const;

export const APPOINTMENT = {
  MIN_DURATION_MINUTES: 5,
  MAX_DURATION_MINUTES: 240,
  DEFAULT_DURATION_MINUTES: 15,
  MAX_ADVANCE_BOOKING_DAYS: 365,
  MIN_ADVANCE_BOOKING_HOURS: 1,
  CANCELLATION_WINDOW_HOURS: 24,
  REMINDER_HOURS_BEFORE: [48, 24, 2],
} as const;

export const BILLING = {
  TAX_RATE: 0.08,
  DEFAULT_CURRENCY: 'USD',
  PAYMENT_TERMS_DAYS: 30,
  LATE_FEE_PERCENTAGE: 0.015,
  LATE_FEE_DAYS: 30,
} as const;

export const PRESCRIPTION = {
  MAX_REFILLS: 12,
  MAX_DAYS_SUPPLY: 90,
  CONTROLLED_SUBSTANCE_MAX_DAYS: 30,
  EXPIRY_DAYS: 365,
  EARLY_REFILL_DAYS: 7,
} as const;

export const COMPLIANCE = {
  HIPAA: {
    AUDIT_RETENTION_YEARS: 6,
    BREACH_NOTIFICATION_HOURS: 72,
    MINIMUM_NECESSARY: true,
    PATIENT_ACCESS_DAYS: 30,
    AMENDMENT_DAYS: 60,
    ACCOUNTING_DISCLOSURE_YEARS: 6,
  },
  GDPR: {
    DATA_PORTABILITY: true,
    RIGHT_TO_ERASURE: true,
    BREACH_NOTIFICATION_HOURS: 72,
    DATA_PROCESSOR_RECORDS: true,
    CONSENT_RECORDS: true,
  },
} as const;

export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Pacific/Auckland',
  'Pacific/Fiji',
] as const;

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'NZD', 'CAD'] as const;

export const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja'] as const;