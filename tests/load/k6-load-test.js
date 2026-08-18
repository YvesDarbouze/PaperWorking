import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * PaperWorking Load Test Script (AGENT P-4)
 * 
 * Simulates 1,000 concurrent virtual users and 100 req/sec to verify
 * API p95 response time < 500ms and page load response time < 2s.
 */
export const options = {
  stages: [
    { duration: '30s', target: 200 },   // Ramp up to 200 users
    { duration: '1m', target: 1000 },   // Ramp up to 1,000 users
    { duration: '2m', target: 1000 },   // Sustain 1,000 concurrent users
    { duration: '30s', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must complete in < 500ms
    http_req_failed: ['rate<0.01'],    // < 1% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Health check endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health status 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
  });

  // 2. Command Center dashboard
  const dashboardRes = http.get(`${BASE_URL}/dashboard/command-center`);
  check(dashboardRes, {
    'dashboard status 200': (r) => r.status === 200,
    'dashboard load time < 2000ms': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
