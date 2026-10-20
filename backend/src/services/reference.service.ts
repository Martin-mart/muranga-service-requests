import type { SupabaseFactory } from '../config/supabase.js';
import type { Category, SubCounty } from '../models/reference.js';
import type { ReferenceRepository } from '../repositories/reference.repository.js';
import { TtlCache } from '../utils/ttl-cache.js';

export interface ReferenceService {
  categories(): Promise<Category[]>;
  subCounties(): Promise<SubCounty[]>;
}

const FIVE_MINUTES = 5 * 60 * 1000;

export function createReferenceService(deps: {
  repo: ReferenceRepository;
  supabase: Pick<SupabaseFactory, 'anon'>;
  ttlMs?: number;
}): ReferenceService {
  const categoryCache = new TtlCache<Category[]>(deps.ttlMs ?? FIVE_MINUTES);
  const subCountyCache = new TtlCache<SubCounty[]>(deps.ttlMs ?? FIVE_MINUTES);

  return {
    categories: () =>
      categoryCache.getOrLoad('all', () => deps.repo.listCategories(deps.supabase.anon())),
    subCounties: () =>
      subCountyCache.getOrLoad('all', () => deps.repo.listSubCounties(deps.supabase.anon())),
  };
}
