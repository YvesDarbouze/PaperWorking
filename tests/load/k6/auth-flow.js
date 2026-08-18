import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const loginErrorRate = new Rate('login_errors');
const dashboardLoadTime = new Trend('dashboard_load_time');

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 1000 },
    { duration: '10m', target: 1000 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    login_errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.STAGING_URL || 'https://staging.paperworking.co';

export default function () {
  group('Authentication Flow', () => {
    const loginPayload = JSON.stringify({
      email: `test-user-${__VU}@paperworking.test`,
      password: 'TestPassword123!',
    });

    const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login returns token': (r) => r.json('token') !== undefined,
    });

    loginErrorRate.add(!loginSuccess);

    if (!loginSuccess) {
      sleep(1);
      return;
    }

    const token = loginRes.json('token');
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const dashboardStart = Date.now();
    const dashboardRes = http.get(`${BASE_URL}/api/portfolio/metrics?period=overall`, {
      headers: authHeaders,
    });
    dashboardLoadTime.add(Date.now() - dashboardStart);

    check(dashboardRes, {
      'dashboard status is 200': (r) => r.status === 200,
      'dashboard returns metrics': (r) => r.json('noi') !== undefined,
      'dashboard load time < 500ms': (r) => Date.now() - dashboardStart < 500,
    });

    const insightsRes = http.get(`${BASE_URL}/api/portfolio/insights`, {
      headers: authHeaders,
    });

    check(insightsRes, {
      'insights status is 200': (r) => r.status === 200,
      'insights returns 33 metrics': (r) => Object.keys(r.json() || {}).length >= 33,
    });

    sleep(Math.random() * 3 + 1);
  });
}
