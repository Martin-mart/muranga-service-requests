// k6 ramping scenario (optional; requires https://k6.io):
//   k6 run -e TARGET_URL=https://api.example.org -e TOKEN=<citizen jwt> tests/load/k6-ramp.js
// Models a realistic mix: most traffic is citizens checking their requests,
// some reference-data reads, few writes are excluded (they hit the 10/day quota).
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.TARGET_URL || 'http://localhost:8080';
const AUTH = { headers: { Authorization: `Bearer ${__ENV.TOKEN}` } };

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
};

export default function () {
  const categories = http.get(`${BASE}/api/v1/categories`);
  check(categories, { 'categories 200': (r) => r.status === 200 });

  if (__ENV.TOKEN) {
    const mine = http.get(`${BASE}/api/v1/requests?limit=20`, AUTH);
    check(mine, { 'my requests 200': (r) => r.status === 200 });
    const notifications = http.get(`${BASE}/api/v1/notifications?limit=10`, AUTH);
    check(notifications, { 'notifications 200': (r) => r.status === 200 });
  }

  sleep(1 + Math.random() * 2);
}
