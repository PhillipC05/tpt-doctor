// ============================================================================
// TPT Doctor — API Entry Point
// ============================================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { config } from '@tpt-doctor/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ========================================================================
  // Pre-startup security validations
  // ========================================================================

  // Validate encryption master key in production
  if (config.isProd) {
    const masterKey = config.encryption.masterKey;
    if (!masterKey || masterKey === 'dev-master-key-change-in-production-32bytes') {
      logger.error(
        'PRODUCTION STARTUP FAILED: Encryption master key is not set or still using development placeholder.\n' +
        'Set ENCRYPTION_MASTER_KEY to a secure 32-byte hex key generated via the encryption.generateKey() utility.',
      );
      process.exit(1);
    }
  }

  // Validate Auth0 domain in production
  if (config.isProd && (!config.auth0.domain || !config.auth0.audience)) {
    logger.error(
      'PRODUCTION STARTUP FAILED: Auth0 domain and audience must be configured.\n' +
      'Set AUTH0_DOMAIN and AUTH0_AUDIENCE environment variables.',
    );
    process.exit(1);
  }

  // ========================================================================
  // Application creation
  // ========================================================================

  const app = await NestFactory.create(AppModule);

  // ========================================================================
  // Security middleware
  // ========================================================================

  // Helmet with explicit CSP policy
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for React dev tools; remove in stricter prod
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...config.corsOrigins],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 86400, // Preflight cache for 24 hours
  });

  // Global prefix
  app.setGlobalPrefix(config.apiPrefix);

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  // ========================================================================
  // Swagger API documentation (development only)
  // ========================================================================

  if (config.isDev) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TPT Doctor API')
      .setDescription('Medical Practice Platform — HIPAA/GDPR/AU/NZ Compliant')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('Auth', 'Authentication & authorization')
      .addTag('Patients', 'Patient management')
      .addTag('EHR', 'Electronic Health Records')
      .addTag('Appointments', 'Appointment scheduling')
      .addTag('Billing', 'Billing & invoicing')
      .addTag('Prescriptions', 'Prescription management')
      .addTag('Lab', 'Lab orders & results')
      .addTag('Staff', 'Staff management')
      .addTag('Messages', 'Secure messaging')
      .addTag('Reporting', 'Reports & analytics')
      .addTag('Compliance', 'Compliance & audit')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ========================================================================
  // Start server
  // ========================================================================

  const port = config.port;
  await app.listen(port, config.host);
  logger.log(`TPT Doctor API running on http://${config.host}:${port}`);
  logger.log(`API docs: http://${config.host}:${port}/api/docs`);
  logger.log(`Environment: ${config.env}`);
}

bootstrap();
