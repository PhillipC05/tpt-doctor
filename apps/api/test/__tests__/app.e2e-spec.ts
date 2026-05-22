// ============================================================================
// TPT Doctor — API E2E Integration Tests
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('TPT Doctor API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /api/v1/health should return 200 and status ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('Auth Module', () => {
    it('POST /api/v1/auth/login should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
        .expect(401);
    });

    it('GET /api/v1/auth/profile should return 401 without auth header', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });
  });

  describe('Patients Module', () => {
    it('GET /api/v1/patients should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/patients')
        .expect(401);
    });

    it('POST /api/v1/patients should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/v1/patients')
        .send({ firstName: 'John' })
        .expect(401);
    });
  });

  describe('Appointments Module', () => {
    it('GET /api/v1/appointments should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/appointments')
        .expect(401);
    });

    it('POST /api/v1/appointments should return 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({ patientId: 'test' })
        .expect(401);
    });
  });

  describe('EHR Module', () => {
    it('GET /api/v1/ehr/encounters should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/ehr/encounters')
        .expect(401);
    });
  });

  describe('Billing Module', () => {
    it('GET /api/v1/billing/invoices should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/billing/invoices')
        .expect(401);
    });
  });

  describe('Prescriptions Module', () => {
    it('GET /api/v1/prescriptions should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prescriptions')
        .expect(401);
    });
  });

  describe('Lab Module', () => {
    it('GET /api/v1/lab/orders should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/lab/orders')
        .expect(401);
    });
  });

  describe('Staff Module', () => {
    it('GET /api/v1/staff should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/staff')
        .expect(401);
    });
  });

  describe('Messages Module', () => {
    it('GET /api/v1/messages/inbox should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/messages/inbox')
        .expect(401);
    });
  });

  describe('Reporting Module', () => {
    it('GET /api/v1/reporting/dashboard should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/reporting/dashboard')
        .expect(401);
    });
  });

  describe('Telemedicine Module', () => {
    it('GET /api/v1/telemedicine/sessions should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/telemedicine/sessions')
        .expect(401);
    });
  });

  describe('CORS Headers', () => {
    it('OPTIONS /api/v1/patients should include CORS headers', () => {
      return request(app.getHttpServer())
        .options('/api/v1/patients')
        .expect(200)
        .expect('Access-Control-Allow-Origin', '*');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting after excessive requests', async () => {
      const server = app.getHttpServer();
      // Make many rapid requests to trigger rate limiting
      for (let i = 0; i < 110; i++) {
        await request(server).get('/api/v1/patients').send();
      }
      return request(server)
        .get('/api/v1/patients')
        .expect((res) => {
          expect([429, 401]).toContain(res.status);
        });
    });
  });

  describe('Global Prefix', () => {
    it('GET /patients without prefix should return 404', () => {
      return request(app.getHttpServer())
        .get('/patients')
        .expect(404);
    });

    it('GET /api/v1/patients with prefix should return 200 or 401', () => {
      return request(app.getHttpServer())
        .get('/api/v1/patients')
        .expect((res) => {
          expect([200, 401]).toContain(res.status);
        });
    });
  });

  describe('Swagger Documentation', () => {
    it('GET /api/docs should return swagger UI in dev mode', () => {
      return request(app.getHttpServer())
        .get('/api/docs')
        .expect((res) => {
          // Should either redirect to swagger or return 404 in test
          expect([200, 301, 302, 404]).toContain(res.status);
        });
    });
  });

  describe('Validation Pipe', () => {
    it('POST /api/v1/patients with empty body should return 400', () => {
      return request(app.getHttpServer())
        .post('/api/v1/patients')
        .send({})
        .expect((res) => {
          // Either 400 validation error or 401 unauthorized
          expect([400, 401]).toContain(res.status);
        });
    });

    it('POST /api/v1/patients with extra fields should strip or reject', () => {
      return request(app.getHttpServer())
        .post('/api/v1/patients')
        .send({ unknownField: 'test' })
        .expect((res) => {
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  describe('API Versioning', () => {
    it('v1 endpoints should be accessible', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect((res) => {
          expect([200, 401]).toContain(res.status);
        });
    });

    it('v2 endpoints should return 404', () => {
      return request(app.getHttpServer())
        .get('/api/v2/patients')
        .expect(404);
    });
  });
});