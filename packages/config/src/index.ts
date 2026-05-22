// ============================================================================
// TPT Doctor — Configuration Package
// ============================================================================

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production'
  : process.env.NODE_ENV === 'test' ? '.env.test'
  : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ============================================================================
// Environment Configuration
// ============================================================================

export const config = {
  env: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  apiPrefix: '/api/v1',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tpt_doctor',
    ssl: process.env.DATABASE_SSL === 'true',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: process.env.REDIS_PREFIX || 'tpt:',
  },

  // Auth0
  auth0: {
    domain: process.env.AUTH0_DOMAIN || '',
    clientId: process.env.AUTH0_CLIENT_ID || '',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
    audience: process.env.AUTH0_AUDIENCE || '',
    managementApiToken: process.env.AUTH0_MANAGEMENT_API_TOKEN || '',
  },

  // Encryption / KMS
  encryption: {
    provider: process.env.ENCRYPTION_PROVIDER || 'local', // 'local' | 'aws' | 'azure' | 'gcp'
    masterKeyId: process.env.ENCRYPTION_MASTER_KEY_ID || '',
    masterKey: process.env.ENCRYPTION_MASTER_KEY || '',
    algorithm: 'aes-256-gcm' as const,
  },

  // Storage (S3-compatible)
  storage: {
    provider: process.env.STORAGE_PROVIDER || 's3',
    endpoint: process.env.STORAGE_ENDPOINT || '',
    region: process.env.STORAGE_REGION || 'us-east-1',
    bucket: process.env.STORAGE_BUCKET || 'tpt-doctor-files',
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || '',
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
  },

  // Payments
  payments: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    },
    airwallex: {
      apiKey: process.env.AIRWALLEX_API_KEY || '',
      clientId: process.env.AIRWALLEX_CLIENT_ID || '',
      webhookSecret: process.env.AIRWALLEX_WEBHOOK_SECRET || '',
    },
  },

  // Twilio (SMS, notifications)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },

  // Telemedicine
  telemedicine: {
    provider: process.env.TELEMEDICINE_PROVIDER || 'jitsi', // 'jitsi' | 'twilio'
    jitsiDomain: process.env.JITSI_DOMAIN || 'meet.tptdoctor.com',
    twilioApiKey: process.env.TWILIO_VIDEO_API_KEY || '',
    twilioApiSecret: process.env.TWILIO_VIDEO_API_SECRET || '',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    sentryDsn: process.env.SENTRY_DSN || '',
  },

  // Monitoring
  monitoring: {
    prometheus: process.env.PROMETHEUS_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9464', 10),
  },

  // Compliance
  compliance: {
    hipaa: true,
    gdpr: true,
    auPrivacy: true,
    nzHiso: true,
    auditRetentionDays: 365 * 6, // 6 years for HIPAA
  },
} as const;

export type Config = typeof config;