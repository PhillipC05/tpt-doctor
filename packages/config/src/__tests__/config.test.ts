import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Configuration Package', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env vars before each test
    process.env = { ...originalEnv };
  });

  it('should have development defaults when NODE_ENV is not set', () => {
    // Clear env and reload config
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    
    // Dynamic import to get fresh config
    const { config } = require('../index');
    expect(config.env).toBe('development');
    expect(config.isDev).toBe(true);
    expect(config.isProd).toBe(false);
    expect(config.isTest).toBe(false);
    expect(config.port).toBe(4000);
  });

  it('should detect production environment', () => {
    process.env.NODE_ENV = 'production';
    const { config } = require('../index');
    expect(config.env).toBe('production');
    expect(config.isProd).toBe(true);
    expect(config.isDev).toBe(false);
  });

  it('should detect test environment', () => {
    process.env.NODE_ENV = 'test';
    const { config } = require('../index');
    expect(config.env).toBe('test');
    expect(config.isTest).toBe(true);
  });

  it('should respect PORT environment variable', () => {
    process.env.PORT = '8080';
    const { config } = require('../index');
    expect(config.port).toBe(8080);
  });

  it('should parse CORS origins from comma-separated string', () => {
    process.env.CORS_ORIGINS = 'http://app1.com,http://app2.com';
    const { config } = require('../index');
    expect(config.corsOrigins).toEqual(['http://app1.com', 'http://app2.com']);
  });

  it('should have default CORS origins when not set', () => {
    delete process.env.CORS_ORIGINS;
    const { config } = require('../index');
    expect(config.corsOrigins).toEqual(['http://localhost:3000']);
  });

  it('should configure database URL from env', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@custom-host:5432/db';
    const { config } = require('../index');
    expect(config.database.url).toBe('postgresql://user:pass@custom-host:5432/db');
  });

  it('should have default database URL', () => {
    delete process.env.DATABASE_URL;
    const { config } = require('../index');
    expect(config.database.url).toBe('postgresql://postgres:postgres@localhost:5432/tpt_doctor');
  });

  it('should parse database pool settings', () => {
    process.env.DATABASE_POOL_MIN = '5';
    process.env.DATABASE_POOL_MAX = '25';
    const { config } = require('../index');
    expect(config.database.poolMin).toBe(5);
    expect(config.database.poolMax).toBe(25);
  });

  it('should configure Auth0 settings', () => {
    process.env.AUTH0_DOMAIN = 'test.auth0.com';
    process.env.AUTH0_CLIENT_ID = 'client-123';
    const { config } = require('../index');
    expect(config.auth0.domain).toBe('test.auth0.com');
    expect(config.auth0.clientId).toBe('client-123');
  });

  it('should configure encryption settings', () => {
    process.env.ENCRYPTION_PROVIDER = 'aws';
    process.env.ENCRYPTION_MASTER_KEY_ID = 'arn:aws:kms:key-123';
    const { config } = require('../index');
    expect(config.encryption.provider).toBe('aws');
    expect(config.encryption.masterKeyId).toBe('arn:aws:kms:key-123');
    expect(config.encryption.algorithm).toBe('aes-256-gcm');
  });

  it('should configure storage settings', () => {
    process.env.STORAGE_BUCKET = 'my-healthcare-bucket';
    process.env.STORAGE_REGION = 'ap-southeast-2';
    const { config } = require('../index');
    expect(config.storage.bucket).toBe('my-healthcare-bucket');
    expect(config.storage.region).toBe('ap-southeast-2');
  });

  it('should configure Stripe payments', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_456';
    const { config } = require('../index');
    expect(config.payments.stripe.secretKey).toBe('sk_test_123');
    expect(config.payments.stripe.publishableKey).toBe('pk_test_456');
  });

  it('should configure telemedicine settings', () => {
    process.env.TELEMEDICINE_PROVIDER = 'twilio';
    process.env.JITSI_DOMAIN = 'meet.custom.com';
    const { config } = require('../index');
    expect(config.telemedicine.provider).toBe('twilio');
    expect(config.telemedicine.jitsiDomain).toBe('meet.custom.com');
  });

  it('should configure compliance retention', () => {
    const { config } = require('../index');
    expect(config.compliance.hipaa).toBe(true);
    expect(config.compliance.auditRetentionDays).toBe(2190); // 6 years
  });

  it('should configure logging level', () => {
    process.env.LOG_LEVEL = 'debug';
    process.env.LOG_FORMAT = 'text';
    const { config } = require('../index');
    expect(config.logging.level).toBe('debug');
    expect(config.logging.format).toBe('text');
  });
});