import { hostname } from 'node:os';
import type { SupabaseFactory } from '../config/supabase.js';
import type { HealthRepository } from '../repositories/health.repository.js';

/** Mutable process lifecycle flags shared with the shutdown handler. */
export interface Lifecycle {
  shuttingDown: boolean;
}

export interface HealthReport {
  status: 'ok' | 'unavailable';
  instance: string;
  uptimeSeconds: number;
  checks?: Partial<Record<'supabase' | 'shutdown', 'ok' | 'failing'>>;
}

export interface HealthService {
  liveness(): HealthReport;
  readiness(): Promise<HealthReport>;
}

export function createHealthService(deps: {
  repo: HealthRepository;
  supabase: Pick<SupabaseFactory, 'anon'>;
  lifecycle: Lifecycle;
}): HealthService {
  // Identifies which replica answered: useful when demonstrating load balancing.
  const instance = hostname();
  const base = () => ({ instance, uptimeSeconds: Math.round(process.uptime()) });

  return {
    liveness: () => ({ status: 'ok', ...base() }),

    async readiness() {
      // While draining, report not-ready so the load balancer stops routing
      // new traffic here before the process exits.
      if (deps.lifecycle.shuttingDown) {
        return { status: 'unavailable', ...base(), checks: { shutdown: 'failing' } };
      }
      const dbOk = await deps.repo.ping(deps.supabase.anon()).catch(() => false);
      return {
        status: dbOk ? 'ok' : 'unavailable',
        ...base(),
        checks: { supabase: dbOk ? 'ok' : 'failing' },
      };
    },
  };
}
