import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Category, SubCounty } from '../models/reference.js';
import { throwIfDbError } from '../utils/db-errors.js';

const categoryRow = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

const subCountyRow = z.object({ id: z.uuid(), slug: z.string(), name: z.string() });

// Reference tables are tiny, but every list query is still bounded.
const MAX_REFERENCE_ROWS = 100;

export interface ReferenceRepository {
  listCategories(db: SupabaseClient): Promise<Category[]>;
  listSubCounties(db: SupabaseClient): Promise<SubCounty[]>;
}

export const referenceRepository: ReferenceRepository = {
  async listCategories(db) {
    const { data, error } = await db
      .from('categories')
      .select('id, slug, name, description')
      .eq('is_active', true)
      .order('sort_order')
      .order('name')
      .limit(MAX_REFERENCE_ROWS);
    throwIfDbError(error);
    return z.array(categoryRow).parse(data ?? []);
  },

  async listSubCounties(db) {
    const { data, error } = await db
      .from('sub_counties')
      .select('id, slug, name')
      .eq('is_active', true)
      .order('name')
      .limit(MAX_REFERENCE_ROWS);
    throwIfDbError(error);
    return z.array(subCountyRow).parse(data ?? []);
  },
};
