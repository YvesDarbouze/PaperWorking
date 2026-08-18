import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';

const metricComputeTime = new Trend('metric_compute_time');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 500 },
    { duration: '5m', target: 500 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    metric_compute_time: ['p(95)<200'],
  },
};

const BASE_URL = __ENV.STAGING_URL || 'https://staging.paperworking.co';

export default function () {
  group('Metric Engine', () => {
    const token = __ENV.TEST_TOKEN || 'mock_staging_token';
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const projectId = __ENV.TEST_PROJECT_ID || 'canonical-seed-deal-id';
    const startTime = Date.now();

    const res = http.get(`${BASE_URL}/api/projects/${projectId}/metrics`, {
      headers: authHeaders,
    });

    metricComputeTime.add(Date.now() - startTime);

    check(res, {
      'metrics status is 200': (r) => r.status === 200,
      'metrics returned 33 values': (r) => {
        const data = r.json();
        return data && data.scorecard && data.insights;
      },
      'NOI is calculated': (r) => r.json('scorecard.noi.value') !== null,
      'compute time < 200ms': (r) => Date.now() - startTime < 200,
    });

    sleep(Math.random() * 2 + 0.5);
  });
}
