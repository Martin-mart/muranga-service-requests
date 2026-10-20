import type { PageRequest } from '../models/pagination.js';
import { decodeCursor } from '../utils/cursor.js';

export function toPageRequest(query: { cursor?: string | undefined; limit: number }): PageRequest {
  return { cursor: decodeCursor(query.cursor), limit: query.limit };
}
