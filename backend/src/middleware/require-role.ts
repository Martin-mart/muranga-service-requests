import type { RequestHandler } from 'express';
import type { Role } from '../models/user.js';
import { forbidden, unauthenticated } from '../utils/errors.js';

/** Route guard. Must run after authenticate; RLS remains the final authority. */
export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      throw unauthenticated();
    }
    if (req.auth.user.role !== role) {
      throw forbidden();
    }
    next();
  };
}
