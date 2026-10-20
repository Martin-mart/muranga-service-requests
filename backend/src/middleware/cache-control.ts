import type { RequestHandler } from 'express';

/** Default for API responses: personal data must not be stored by shared caches. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

/**
 * Public reference data: CDN/browser may cache briefly and serve stale while
 * revalidating; Express adds an ETag so revalidation returns 304 without a body.
 */
export const publicCache =
  (maxAgeSeconds: number): RequestHandler =>
  (_req, res, next) => {
    res.setHeader(
      'Cache-Control',
      `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`,
    );
    next();
  };

/** Per-user data that is fine to reuse for a short time (e.g. analytics). */
export const privateCache =
  (maxAgeSeconds: number): RequestHandler =>
  (_req, res, next) => {
    res.setHeader('Cache-Control', `private, max-age=${maxAgeSeconds}`);
    next();
  };
