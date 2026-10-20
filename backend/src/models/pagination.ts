export interface Page<T> {
  items: T[];
  /** Opaque cursor for the next page, or null when there are no more rows. */
  nextCursor: string | null;
}

/** Keyset position: the (created_at, id) pair of the last row on a page. */
export interface CursorPosition {
  createdAt: string;
  id: string;
}

export interface PageRequest {
  cursor: CursorPosition | null;
  limit: number;
}
