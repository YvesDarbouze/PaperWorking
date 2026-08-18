import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';

const portfolioLoadTime = new Trend('portfolio_load_time');

export const options = {
  stages: [
    { duration: '2m', target: 200 },
    { duration: '5m', target: 1000 },
    { duration: '10m', target: 1000 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    portfolio_load_time: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.STAGING_URL || 'https://staging.paperworking.co';

export default function () {
  group('Portfolio Dashboard', () => {
    const token = __ENV.TEST_TOKEN || 'mock_staging_token';
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const startTime = Date.now();

    const overviewRes = http.get(`${BASE_URL}/api/portfolio/metrics?period=overall`, {
      headers: authHeaders,
    });

    const insightsRes = http.get(`${BASE_URL}/api/portfolio/insights`, {
      headers: authHeaders,
    });

    const reportsRes = http.get(`${BASE_URL}/api/reports?type=monthly`, {
      headers: authHeaders,
    });

    portfolioLoadTime.add(Date.now() - startTime);

    check(overviewRes, {
      'portfolio overview loaded': (r) => r.status === 200,
      'portfolio has NOI': (r) => r.json('noi') !== undefined,
    });

    check(insightsRes, {
      'insights loaded': (r) => r.status === 200,
    });

    check(reportsRes, {
      'reports loaded': (r) => r.status === 200,
    });

    sleep(Math.random() * 3 + 1);
  });
}
