import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

// Accept an upstream id (from nginx / the platform LB) only if it is
// well-formed, so clients cannot inject arbitrary content into logs.
const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get('x-request-id');
  req.requestId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};
