import { z } from 'zod';
import { ROLES } from '../models/user.js';
import { REQUEST_STATUSES } from '../models/service-request.js';

/**
 * Runtime schemas for rows coming back from PostgREST. The client is untyped,
 * so every row is parsed (and mapped to camelCase) at the repository boundary:
 * schema drift fails loudly here instead of leaking malformed data to clients.
 */
export const roleSchema = z.enum(ROLES);
export const statusSchema = z.enum(REQUEST_STATUSES);

export const referenceRow = z.object({ id: z.uuid(), slug: z.string(), name: z.string() });

export const nullableNumber = z
  .number()
  .nullable()
  .transform((value) => value ?? null);
