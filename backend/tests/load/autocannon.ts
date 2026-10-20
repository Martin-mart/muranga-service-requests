/**
 * Load test: `npm run test:load`
 *
 * Env:
 *   TARGET_URL   base URL (default http://localhost:8080, the nginx load balancer)
 *   TOKEN        optional citizen access token to include authenticated reads
 *   DURATION     seconds per scenario (default 20)
 *   CONNECTIONS  concurrent connections (default 50)
 *
 * Runs each scenario separately so the numbers are attributable, and fails
 * (exit 1) if any scenario has non-2xx responses or p99 latency above budget.
 */
import autocannon, { type Result } from 'autocannon';

const target = process.env.TARGET_URL ?? 'http://localhost:8080';
const token = process.env.TOKEN;
const duration = Number(process.env.DURATION ?? 20);
const connections = Number(process.env.CONNECTIONS ?? 50);
const P99_BUDGET_MS = Number(process.env.P99_BUDGET_MS ?? 800);

interface Scenario {
  name: string;
  path: string;
  headers?: Record<string, string>;
}

const scenarios: Scenario[] = [
  { name: 'liveness', path: '/health' },
  { name: 'reference data (cached)', path: '/api/v1/categories' },
  ...(token
    ? [
        {
          name: 'my requests (RLS, DB-bound)',
          path: '/api/v1/requests?limit=20',
          headers: { Authorization: `Bearer ${token}` },
        },
      ]
    : []),
];

async function run(scenario: Scenario): Promise<Result> {
  return autocannon({
    url: `${target}${scenario.path}`,
    connections,
    duration,
    headers: scenario.headers ?? {},
  });
}

async function main(): Promise<void> {
  console.log(`Target ${target} | ${connections} connections | ${duration}s per scenario\n`);
  let failed = false;
  const rows: Record<string, string | number>[] = [];

  for (const scenario of scenarios) {
    const result = await run(scenario);
    const non2xx = result.non2xx + result.errors + result.timeouts;
    rows.push({
      scenario: scenario.name,
      'req/s (avg)': Math.round(result.requests.average),
      'p50 ms': result.latency.p50,
      'p97.5 ms': result.latency.p97_5,
      'p99 ms': result.latency.p99,
      requests: result.requests.total,
      'non-2xx/errors': non2xx,
    });
    if (non2xx > 0 || result.latency.p99 > P99_BUDGET_MS) {
      failed = true;
    }
  }

  console.table(rows);
  process.exit(failed ? 1 : 0);
}

void main();
