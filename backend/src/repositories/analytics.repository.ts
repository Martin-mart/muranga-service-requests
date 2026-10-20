import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Analytics, BreakdownRow } from '../models/analytics.js';
import { throwIfDbError } from '../utils/db-errors.js';

// Postgres numeric arrives as a JSON number inside jsonb.
const hours = z.number().nullable();

const breakdown = z
  .object({
    id: z.uuid(),
    name: z.string(),
    total: z.number(),
    open: z.number(),
    resolved: z.number(),
    avg_resolution_hours: hours.optional(),
  })
  .transform((row): BreakdownRow => ({
    id: row.id,
    name: row.name,
    total: row.total,
    open: row.open,
    resolved: row.resolved,
    avgResolutionHours: row.avg_resolution_hours ?? null,
  }));

const analyticsSchema = z
  .object({
    totals: z.object({
      total: z.number(),
      pending: z.number(),
      in_progress: z.number(),
      resolved: z.number(),
      open: z.number(),
    }),
    avg_resolution_hours: hours,
    by_category: z.array(breakdown),
    by_sub_county: z.array(breakdown),
    daily: z.array(z.object({ day: z.string(), created: z.number(), resolved: z.number() })),
  })
  .transform((raw): Analytics => ({
    totals: {
      total: raw.totals.total,
      pending: raw.totals.pending,
      inProgress: raw.totals.in_progress,
      resolved: raw.totals.resolved,
      open: raw.totals.open,
    },
    avgResolutionHours: raw.avg_resolution_hours,
    byCategory: raw.by_category,
    bySubCounty: raw.by_sub_county,
    daily: raw.daily,
  }));

export interface AnalyticsRepository {
  get(db: SupabaseClient, range: { from: string | null; to: string | null }): Promise<Analytics>;
}

export const analyticsRepository: AnalyticsRepository = {
  async get(db, range) {
    // get: true issues a GET (the function is STABLE/read-only), which also
    // makes it eligible for the idempotent-retry policy in resilient fetch.
    // A GET sends args as query params, where null becomes the string "null"
    // (not a valid timestamptz), so unset bounds are omitted and the SQL
    // defaults (null = unbounded) apply.
    const args: { p_from?: string; p_to?: string } = {};
    if (range.from) args.p_from = range.from;
    if (range.to) args.p_to = range.to;
    const response = await db.rpc('get_request_analytics', args, { get: true });
    throwIfDbError(response.error);
    return analyticsSchema.parse(response.data);
  },
};
