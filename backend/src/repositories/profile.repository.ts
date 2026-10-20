import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Profile } from '../models/user.js';
import { throwIfDbError } from '../utils/db-errors.js';
import { roleSchema } from './rows.js';

const profileRow = z
  .object({
    id: z.uuid(),
    full_name: z.string(),
    phone: z.string().nullable(),
    role: roleSchema,
    created_at: z.string(),
  })
  .transform((row): Profile => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
  }));

export interface ProfileRepository {
  findById(db: SupabaseClient, id: string): Promise<Profile | null>;
}

export const profileRepository: ProfileRepository = {
  async findById(db, id) {
    const { data, error } = await db
      .from('profiles')
      .select('id, full_name, phone, role, created_at')
      .eq('id', id)
      .maybeSingle();
    throwIfDbError(error);
    return data ? profileRow.parse(data) : null;
  },
};
