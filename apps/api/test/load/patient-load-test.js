// ============================================================================
// TPT Doctor — API Load Testing (k6)
// Simulates realistic patient management workload
// ============================================================================
// Run with: k6 run apps/api/test/load/patient-load-test.js
// ============================================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api/v1';

// Custom metrics
const errorRate = new Rate('errors');
const patientCreateTime = new Trend('patient_create_time');
const searchTime = new Trend('patient_search_time');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    errors: ['rate<0.10'],              // Error rate below 10%
  },
};

const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

const HEADERS = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
};

export default function () {
  group('Patient Creation', () => {
    const payload = JSON.stringify({
      firstName: `Test${__VU}`,
      lastName: `Patient${__ITER}`,
      dateOfBirth: '1990-01-15',
      gender: 'MALE',
      email: `patient${__VU}_${__ITER}@test.com`,
      phone: `555-${String(__VU).padStart(4, '0')}`,
      address: {
        street: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
      },
    });

    const start = Date.now();
    const res = http.post(`${BASE_URL}/patients`, payload, { headers: HEADERS });
    const duration = Date.now() - start;

    patientCreateTime.add(duration);
    errorRate.add(res.status !== 200 && res.status !== 201);

    check(res, {
      'patient created successfully': (r) => r.status === 200 || r.status === 201,
      'response has patient id': (r) => JSON.parse(r.body).id !== undefined,
    });

    if (res.status === 200 || res.status === 201) {
      const patientId = JSON.parse(res.body).id;

      group('Patient Search', () => {
        const searchStart = Date.now();
        const searchRes = http.get(
          `${BASE_URL}/patients?search=Test${__VU}`,
          { headers: HEADERS },
        );
        searchTime.add(Date.now() - searchStart);

        check(searchRes, {
          'search returned results': (r) => JSON.parse(r.body).data.length > 0,
        });
      });

      group('Patient Update', () => {
        const updateRes = http.patch(
          `${BASE_URL}/patients/${patientId}`,
          JSON.stringify({ phone: `555-9999` }),
          { headers: HEADERS },
        );

        check(updateRes, {
          'patient updated': (r) => r.status === 200,
        });
      });
    }
  });

  sleep(1);
}

export function teardown() {
  // Cleanup test data if needed
  console.log('Load test complete');
}