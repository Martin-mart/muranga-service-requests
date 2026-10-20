import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { RequestComment } from '../models/comment.js';
import type { PageRequest } from '../models/pagination.js';
import { newerThanFilter } from '../utils/cursor.js';
import { throwIfDbError } from '../utils/db-errors.js';
import { roleSchema } from './rows.js';

const COLUMNS =
  'id, request_id, author_role, body, is_public, created_at, author:profiles(full_name)';

const commentRow = z
  .object({
    id: z.uuid(),
    request_id: z.uuid(),
    author_role: roleSchema,
    body: z.string(),
    is_public: z.boolean(),
    created_at: z.string(),
    author: z.object({ full_name: z.string() }).nullable().optional(),
  })
  .transform((row): RequestComment => ({
    id: row.id,
    requestId: row.request_id,
    authorRole: row.author_role,
    authorName: row.author?.full_name ?? null,
    body: row.body,
    isPublic: row.is_public,
    createdAt: row.created_at,
  }));

export interface CommentRepository {
  list(db: SupabaseClient, requestId: string, page: PageRequest): Promise<RequestComment[]>;
  insert(
    db: SupabaseClient,
    input: { requestId: string; body: string; isPublic: boolean },
  ): Promise<RequestComment>;
}

export const commentRepository: CommentRepository = {
  async list(db, requestId, page) {
    // Oldest first (conversation order); RLS hides internal notes from citizens.
    let query = db
      .from('request_comments')
      .select(COLUMNS)
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(page.limit + 1);
    if (page.cursor) {
      query = query.or(newerThanFilter(page.cursor));
    }
    const { data, error } = await query;
    throwIfDbError(error);
    return z.array(commentRow).parse(data ?? []);
  },

  async insert(db, input) {
    const { data, error } = await db
      .from('request_comments')
      .insert({ request_id: input.requestId, body: input.body, is_public: input.isPublic })
      .select(COLUMNS)
      .single();
    throwIfDbError(error);
    return commentRow.parse(data);
  },
};
