const RETRYABLE_STATUS = new Set([408, 429, 502, 503, 504]);

export interface ResilientFetchOptions {
  timeoutMs: number;
  /** Extra attempts after the first, for idempotent requests only. */
  retries: number;
  baseDelayMs: number;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Exponential backoff with full jitter, so retrying instances don't synchronise. */
export function backoffDelay(attempt: number, baseDelayMs: number): number {
  return Math.floor(Math.random() * baseDelayMs * 2 ** attempt);
}

function isIdempotent(init: RequestInit | undefined): boolean {
  const method = (init?.method ?? 'GET').toUpperCase();
  return method === 'GET' || method === 'HEAD';
}

/**
 * fetch wrapper used by every Supabase client: hard timeout on every call and
 * bounded retries for idempotent reads. Writes are never retried here because
 * a timed-out write may still have been committed (writes use idempotency keys
 * at the application level instead).
 */
export function createResilientFetch(options: ResilientFetchOptions): typeof fetch {
  return async (input, init) => {
    const attempts = isIdempotent(init) ? options.retries + 1 : 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const timeout = AbortSignal.timeout(options.timeoutMs);
      const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
      const isLast = attempt === attempts - 1;
      try {
        const response = await fetch(input, { ...init, signal });
        if (isLast || !RETRYABLE_STATUS.has(response.status)) {
          return response;
        }
      } catch (error) {
        if (isLast || init?.signal?.aborted) {
          throw error;
        }
        lastError = error;
      }
      await sleep(backoffDelay(attempt, options.baseDelayMs));
    }

    throw lastError instanceof Error ? lastError : new Error('Upstream request failed');
  };
}
