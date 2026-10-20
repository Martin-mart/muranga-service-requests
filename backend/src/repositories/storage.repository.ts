import type { SupabaseClient } from '@supabase/supabase-js';
import { throwIfDbError } from '../utils/db-errors.js';

export const REQUEST_IMAGES_BUCKET = 'request-images';

export interface StorageRepository {
  createSignedUploadUrl(db: SupabaseClient, path: string): Promise<string>;
  /** Returns null when the object does not exist (upload never completed). */
  createSignedViewUrl(db: SupabaseClient, path: string, ttlSeconds: number): Promise<string | null>;
}

export const storageRepository: StorageRepository = {
  async createSignedUploadUrl(db, path) {
    // Runs with the citizen's JWT: Storage evaluates the bucket INSERT policy
    // (own folder + registered path) before issuing the URL.
    const { data, error } = await db.storage
      .from(REQUEST_IMAGES_BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    throwIfDbError(error ? { code: '42501', message: error.message } : null);
    if (!data) {
      throw new Error('Storage returned no signed upload URL');
    }
    return data.signedUrl;
  },

  async createSignedViewUrl(db, path, ttlSeconds) {
    const { data, error } = await db.storage
      .from(REQUEST_IMAGES_BUCKET)
      .createSignedUrl(path, ttlSeconds);
    if (error) {
      return null;
    }
    return data.signedUrl;
  },
};
