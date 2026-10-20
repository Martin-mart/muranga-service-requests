import type { Analytics } from '../models/analytics.js';
import type { AuthContext } from '../models/context.js';
import type { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { forbidden } from '../utils/errors.js';

export interface AnalyticsService {
  get(
    ctx: AuthContext,
    range: { from?: string | undefined; to?: string | undefined },
  ): Promise<Analytics>;
}

export function createAnalyticsService(deps: { analytics: AnalyticsRepository }): AnalyticsService {
  return {
    async get(ctx, range) {
      if (ctx.user.role !== 'admin') {
        throw forbidden();
      }
      return deps.analytics.get(ctx.db, { from: range.from ?? null, to: range.to ?? null });
    },
  };
}
