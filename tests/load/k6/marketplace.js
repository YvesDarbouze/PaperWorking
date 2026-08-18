import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '10m', target: 500 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
  },
};

const BASE_URL = __ENV.STAGING_URL || 'https://staging.paperworking.co';

export default function () {
  group('Marketplace', () => {
    const token = __ENV.TEST_TOKEN || 'mock_staging_token';
    const authHeaders = {
      Authorization: `Bearer ${token}`,
    };

    const vendorsRes = http.get(`${BASE_URL}/api/marketplace/vendors?page=1&limit=20`, {
      headers: authHeaders,
    });

    check(vendorsRes, {
      'vendors loaded': (r) => r.status === 200,
      'vendors returned list': (r) => Array.isArray(r.json('vendors')),
    });

    const searchRes = http.get(`${BASE_URL}/api/marketplace/vendors?search=plumber&page=1`, {
      headers: authHeaders,
    });

    check(searchRes, {
      'search works': (r) => r.status === 200,
    });

    sleep(Math.random() * 2 + 1);
  });
}
