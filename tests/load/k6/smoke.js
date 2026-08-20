import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const loginErrorRate = new Rate('login_errors');
const dashboardLoadTime = new Trend('dashboard_load_time');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.05'],
    login_errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.MIGRATION_URL || 'http://localhost:3000';

export default function () {
  group('Migration stack smoke — auth + portfolio', () => {
    const loginPayload = JSON.stringify({
      idToken: 'mock_session_token_123',
      accountType: 'investor',
    });

    const loginRes = http.post(`${BASE_URL}/api/auth/session`, loginPayload, {
      headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
    });

    const loginSuccess = check(loginRes, {
      'session status is 200': (r) => r.status === 200,
      'session sets cookie': (r) => (r.headers['Set-Cookie'] || '').includes('__session='),
    });

    loginErrorRate.add(!loginSuccess);
    if (!loginSuccess) {
      sleep(1);
      return;
    }

    const cookieHeader = loginRes.headers['Set-Cookie'] || '';
    const authHeaders = {
      Cookie: cookieHeader.split(';')[0],
      'Content-Type': 'application/json',
    };

    const dashboardStart = Date.now();
    const metricsRes = http.get(`${BASE_URL}/api/portfolio/metrics?period=overall`, {
      headers: authHeaders,
    });
    dashboardLoadTime.add(Date.now() - dashboardStart);

    check(metricsRes, {
      'portfolio metrics status is 200': (r) => r.status === 200,
      'portfolio metrics returns NOI': (r) => {
        try {
          return r.json('portfolio.portfolioNoi') !== undefined;
        } catch {
          return false;
        }
      },
    });

    const insightsRes = http.get(`${BASE_URL}/api/insights?userId=dev-user-1`, {
      headers: authHeaders,
    });

    check(insightsRes, {
      'insights status is 200': (r) => r.status === 200,
      'insights returns metrics object': (r) => {
        try {
          const metrics = r.json('metrics');
          return metrics && Object.keys(metrics).length >= 5;
        } catch {
          return false;
        }
      },
    });

    sleep(Math.random() * 2 + 0.5);
  });
}
