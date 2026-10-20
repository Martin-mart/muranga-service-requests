import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createReferenceService } from '../../src/services/reference.service.js';

describe('ReferenceService', () => {
  it('caches reference data and coalesces concurrent loads', async () => {
    const listCategories = vi
      .fn()
      .mockResolvedValue([{ id: '1', slug: 'water', name: 'Water', description: null }]);
    const service = createReferenceService({
      repo: { listCategories, listSubCounties: vi.fn() },
      supabase: { anon: () => ({}) as SupabaseClient },
    });

    await Promise.all([service.categories(), service.categories(), service.categories()]);
    await service.categories();

    expect(listCategories).toHaveBeenCalledTimes(1);
  });
});
