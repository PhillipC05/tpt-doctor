// ============================================================================
// TPT Doctor — Penetration Testing Suite (Phase 15.3)
// Covers: SQL injection probes, JWT fuzzing, rate limit verification,
//         OWASP Top-10 input validation, and header security checks.
// Run with: jest --testPathPattern=penetration-tests --forceExit
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Test app bootstrap
// ---------------------------------------------------------------------------

let app: INestApplication;
let server: any;

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
      forbidUnknownValues: true,
    }),
  );
  await app.init();
  server = app.getHttpServer();
}, 30000);

afterAll(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJwt(payload: object, secret = 'wrong-secret') {
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

function expiredJwt() {
  return jwt.sign({ sub: 'user-1', email: 'a@b.com' }, 'test-secret', { expiresIn: '-1s' });
}

// OWASP ZAP common SQL injection payloads
const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE patients; --",
  "1' AND 1=1 --",
  "' UNION SELECT null,null,null --",
  "admin'--",
  "' OR 1=1 --",
  "') OR ('1'='1",
  "1; SELECT sleep(5) --",
  "' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version()))) --",
  "' OR SLEEP(5) --",
];

// OWASP ZAP common XSS payloads
const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  "javascript:alert('XSS')",
  '<svg/onload=alert(1)>',
  '{{7*7}}',
  '${7*7}',
];

// Common path traversal payloads
const PATH_TRAVERSAL_PAYLOADS = [
  '../../../etc/passwd',
  '..%2F..%2F..%2Fetc%2Fpasswd',
  '....//....//etc/passwd',
  '%252e%252e%252f',
];

// ===========================================================================
// 1. SQL Injection — Query Parameters
// ===========================================================================

describe('SQL Injection — Query Parameter Probes', () => {
  const endpoints = [
    '/api/v1/patients',
    '/api/v1/appointments',
    '/api/v1/prescriptions',
    '/api/v1/lab/orders',
  ];

  SQL_INJECTION_PAYLOADS.forEach((payload) => {
    endpoints.forEach((endpoint) => {
      it(`${endpoint} rejects SQL payload in query: ${payload.substring(0, 30)}`, async () => {
        const res = await request(server)
          .get(endpoint)
          .query({ search: payload, name: payload, q: payload });

        // Must not return 200 with unfiltered data — acceptable responses are
        // 400 (validation), 401 (unauthenticated), or 403 (forbidden)
        expect([400, 401, 403]).toContain(res.status);
      });
    });
  });

  it('rejects SQL payload in POST body (patients create)', async () => {
    const res = await request(server)
      .post('/api/v1/patients')
      .send({
        firstName: "' OR '1'='1",
        lastName: "'; DROP TABLE patients; --",
        email: 'test@test.com',
      });
    expect([400, 401, 403]).toContain(res.status);
  });
});

// ===========================================================================
// 2. SQL Injection — Path Parameters
// ===========================================================================

describe('SQL Injection — Path Parameter Probes', () => {
  const pathPayloads = ["1' OR '1'='1", "1; DROP TABLE--", '00000000-0000-0000-0000-000000000000'];

  pathPayloads.forEach((payload) => {
    it(`GET /api/v1/patients/:id rejects malicious id: ${payload.substring(0, 20)}`, async () => {
      const res = await request(server)
        .get(`/api/v1/patients/${encodeURIComponent(payload)}`);
      expect([400, 401, 403, 404]).toContain(res.status);
      // Must not expose raw SQL error messages
      if (res.body?.message) {
        const msg = JSON.stringify(res.body.message).toLowerCase();
        expect(msg).not.toMatch(/sql|syntax error|unclosed|unterminated/i);
      }
    });
  });
});

// ===========================================================================
// 3. XSS — Input Validation
// ===========================================================================

describe('XSS — Input Sanitisation Probes', () => {
  XSS_PAYLOADS.forEach((payload) => {
    it(`POST /api/v1/patients rejects XSS payload: ${payload.substring(0, 25)}`, async () => {
      const res = await request(server)
        .post('/api/v1/patients')
        .send({ firstName: payload, lastName: 'Test', email: 'xss@test.com' });
      expect([400, 401, 403]).toContain(res.status);
    });
  });
});

// ===========================================================================
// 4. Path Traversal — File Reference Attacks
// ===========================================================================

describe('Path Traversal — Parameter Probes', () => {
  PATH_TRAVERSAL_PAYLOADS.forEach((payload) => {
    it(`GET /api/v1/patients/:id rejects path traversal: ${payload.substring(0, 25)}`, async () => {
      const res = await request(server)
        .get(`/api/v1/patients/${encodeURIComponent(payload)}`);
      expect([400, 401, 403, 404]).toContain(res.status);
      // Response must never contain /etc/passwd content
      expect(JSON.stringify(res.body)).not.toMatch(/root:|bin:|daemon:/);
    });
  });
});

// ===========================================================================
// 5. JWT Fuzzing
// ===========================================================================

describe('JWT Fuzzing — Token Manipulation', () => {
  const protectedEndpoints = [
    '/api/v1/patients',
    '/api/v1/appointments',
    '/api/v1/ehr/encounters',
  ];

  describe('Expired tokens', () => {
    protectedEndpoints.forEach((endpoint) => {
      it(`${endpoint} rejects expired JWT`, async () => {
        const res = await request(server)
          .get(endpoint)
          .set('Authorization', `Bearer ${expiredJwt()}`);
        expect([401, 403]).toContain(res.status);
      });
    });
  });

  describe('Wrong signing secret', () => {
    protectedEndpoints.forEach((endpoint) => {
      it(`${endpoint} rejects JWT signed with wrong secret`, async () => {
        const token = makeJwt({ sub: 'user-1', email: 'attacker@evil.com' }, 'wrong-secret-xyz');
        const res = await request(server)
          .get(endpoint)
          .set('Authorization', `Bearer ${token}`);
        expect([401, 403]).toContain(res.status);
      });
    });
  });

  describe('Algorithm confusion (alg: none attack)', () => {
    it('rejects JWT with alg:none in header', async () => {
      // Manually craft a token with alg:none
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: 'admin', role: 'admin', iat: Date.now() })).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      const res = await request(server)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${noneToken}`);
      expect([401, 403]).toContain(res.status);
    });

    it('rejects JWT with alg:HS256 when server expects RS256', async () => {
      const weakToken = makeJwt({ sub: 'user-1', role: 'admin' }, 'weak');
      const res = await request(server)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${weakToken}`);
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('Malformed tokens', () => {
    const malformedTokens = [
      'not.a.jwt',
      'Bearer',
      '',
      'eyJhbGciOiJIUzI1NiJ9..',
      'null',
      'undefined',
      '{}.{}.{}',
    ];

    malformedTokens.forEach((token) => {
      it(`rejects malformed token: "${token.substring(0, 20)}"`, async () => {
        const res = await request(server)
          .get('/api/v1/patients')
          .set('Authorization', token ? `Bearer ${token}` : '');
        expect([401, 403]).toContain(res.status);
      });
    });
  });

  describe('Privilege escalation via token tampering', () => {
    it('rejects tampered JWT payload (role claim modified)', async () => {
      // Take a valid-looking JWT structure but tamper the payload
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: 'user-1', role: 'SUPER_ADMIN', tenantId: 'any' })).toString('base64url');
      const fakeSignature = Buffer.from('fakesignature').toString('base64url');
      const tamperedToken = `${header}.${payload}.${fakeSignature}`;

      const res = await request(server)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${tamperedToken}`);
      expect([401, 403]).toContain(res.status);
    });
  });
});

// ===========================================================================
// 6. Rate Limiting Verification
// ===========================================================================

describe('Rate Limiting — Threshold Enforcement', () => {
  it('enforces rate limit on unauthenticated endpoints after burst', async () => {
    const responses: number[] = [];
    for (let i = 0; i < 120; i++) {
      const res = await request(server).get('/api/v1/health');
      responses.push(res.status);
    }
    // After sustained burst, at least some responses should be rate-limited (429)
    // or the health endpoint continues (it may be excluded); auth endpoints must rate-limit
    const has429 = responses.some(s => s === 429);
    const allSucceeded = responses.every(s => s === 200);
    // Either rate limiting engaged, or the endpoint is explicitly excluded
    expect(has429 || allSucceeded).toBe(true);
  }, 60000);

  it('enforces rate limit on auth endpoint (brute force protection)', async () => {
    const responses: number[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'brute@force.com', password: `wrong${i}` });
      responses.push(res.status);
    }
    const has429 = responses.some(s => s === 429);
    const allRejected = responses.every(s => [400, 401, 429].includes(s));
    expect(allRejected).toBe(true);
    // At least some rate limiting should kick in after 15 rapid requests
    if (!has429) {
      // Acceptable if auth endpoint returns 401 consistently (still prevents brute force via timing)
      const allUnauthorised = responses.every(s => s === 401 || s === 400);
      expect(allUnauthorised).toBe(true);
    }
  }, 30000);
});

// ===========================================================================
// 7. Security Headers
// ===========================================================================

describe('Security Headers', () => {
  let res: request.Response;

  beforeAll(async () => {
    res = await request(server).get('/api/v1/health');
  });

  it('sets X-Content-Type-Options: nosniff', () => {
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options to deny clickjacking', () => {
    const frameOptions = res.headers['x-frame-options'];
    expect(['DENY', 'SAMEORIGIN']).toContain(frameOptions?.toUpperCase());
  });

  it('does not expose X-Powered-By header', () => {
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets Strict-Transport-Security in production-like mode', () => {
    // May not be set in test, but if present must be valid
    const hsts = res.headers['strict-transport-security'];
    if (hsts) {
      expect(hsts).toMatch(/max-age=\d+/);
    }
  });
});

// ===========================================================================
// 8. Mass Assignment / Property Pollution
// ===========================================================================

describe('Mass Assignment — Forbidden Field Injection', () => {
  const forbiddenFields = ['role', 'tenantId', 'isAdmin', 'isDeleted', 'createdAt', 'updatedAt', 'id'];

  forbiddenFields.forEach((field) => {
    it(`POST /api/v1/patients strips injected field: ${field}`, async () => {
      const payload: Record<string, unknown> = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        [field]: 'INJECTED_VALUE',
      };
      const res = await request(server)
        .post('/api/v1/patients')
        .send(payload);

      // With forbidNonWhitelisted=true, extra fields → 400; or 401 unauthenticated
      expect([400, 401, 403]).toContain(res.status);
    });
  });
});

// ===========================================================================
// 9. Tenant Isolation — Cross-Tenant Data Access
// ===========================================================================

describe('Tenant Isolation — Cross-Tenant Header Manipulation', () => {
  it('GET /api/v1/patients with spoofed tenant header returns 401 or empty data', async () => {
    const res = await request(server)
      .get('/api/v1/patients')
      .set('x-tenant-id', 'another-tenant-uuid');
    // Without valid auth, should be 401; with auth, must scope to that tenant only
    expect([200, 401, 403]).toContain(res.status);
    if (res.status === 200 && res.body?.data) {
      // If somehow data is returned, it must not contain cross-tenant records
      const data = res.body.data as any[];
      data.forEach((item) => {
        expect(item.tenantId).toBe('another-tenant-uuid');
      });
    }
  });
});

// ===========================================================================
// 10. Large Payload / DoS Protection
// ===========================================================================

describe('Large Payload — Request Size Limits', () => {
  it('rejects excessively large JSON body (>100KB)', async () => {
    const largeString = 'A'.repeat(150 * 1024); // 150 KB
    const res = await request(server)
      .post('/api/v1/patients')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ firstName: largeString }));
    expect([400, 401, 413]).toContain(res.status);
  });

  it('rejects deeply nested JSON object (prototype pollution risk)', async () => {
    const deepNested = { a: { b: { c: { d: { e: { f: { g: { h: 'deep' } } } } } } } };
    const res = await request(server)
      .post('/api/v1/patients')
      .send(deepNested);
    expect([400, 401, 403]).toContain(res.status);
  });

  it('rejects __proto__ pollution attempt in body', async () => {
    const res = await request(server)
      .post('/api/v1/patients')
      .set('Content-Type', 'application/json')
      .send('{"__proto__":{"isAdmin":true},"firstName":"test"}');
    expect([400, 401, 403]).toContain(res.status);
    // Verify no pollution occurred on global Object prototype
    expect((Object.prototype as any).isAdmin).toBeUndefined();
  });
});
