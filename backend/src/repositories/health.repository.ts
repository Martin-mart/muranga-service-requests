import type { SupabaseClient } from '@supabase/supabase-js';

export interface HealthRepository {
  /** Cheapest real round trip through PostgREST to Postgres. */
  ping(db: SupabaseClient): Promise<boolean>;
}

export const healthRepository: HealthRepository = {
  async ping(db) {
    const { error } = await db
      .from('categories')
      .select('id', { head: true, count: 'planned' })
      .limit(1)
      .abortSignal(AbortSignal.timeout(2000));
    return error === null;
  },
};
