import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';

const projectCreationTime = new Trend('project_creation_time');

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 200 },
    { duration: '10m', target: 200 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    project_creation_time: ['p(95)<3000'],
  },
};

const BASE_URL = __ENV.STAGING_URL || 'https://staging.paperworking.co';

export default function () {
  group('Project Creation', () => {
    const token = __ENV.TEST_TOKEN || 'mock_staging_token';
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const startTime = Date.now();

    const projectPayload = JSON.stringify({
      phase: 'acquisition',
      property_address: '123 Main St, Austin, TX 78701',
      purchase_price: 279000,
      down_payment_pct: 20,
      interest_rate: 0.065,
      loan_term_years: 30,
      gross_scheduled_rent: 24000,
      vacancy_rate: 3,
      expenses: {
        tax: 3600,
        insurance: 1800,
        security: 0,
        maintenance: 1995,
        utilities: 1000,
        management: 2400,
        HOA: 0,
        capex: 0,
      },
    });

    const createRes = http.post(`${BASE_URL}/api/projects`, projectPayload, {
      headers: authHeaders,
    });

    const projectId = createRes.json('projectId');

    check(createRes, {
      'project created': (r) => r.status === 201,
      'project has ID': (r) => r.json('projectId') !== undefined,
    });

    if (projectId) {
      const svRes = http.post(
        `${BASE_URL}/api/street-view`,
        JSON.stringify({ lat: 30.2672, lng: -97.7431 }),
        { headers: authHeaders }
      );

      check(svRes, {
        'street view returned': (r) => r.status === 200,
      });
    }

    projectCreationTime.add(Date.now() - startTime);
    sleep(Math.random() * 5 + 2);
  });
}
