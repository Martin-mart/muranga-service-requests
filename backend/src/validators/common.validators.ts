import { z } from 'zod';
import { sanitizeMultiline, sanitizeSingleLine } from '../utils/sanitize.js';

export const idParamSchema = z.object({ id: z.uuid({ message: 'Must be a valid id' }) });

export const pageQuerySchema = z.object({
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Sanitises first, then validates length, so limits apply to stored text. */
export const singleLineText = (min: number, max: number) =>
  z
    .string()
    .transform(sanitizeSingleLine)
    .pipe(
      z
        .string()
        .min(min, `Must be at least ${min} characters`)
        .max(max, `Must be at most ${max} characters`),
    );

export const multilineText = (min: number, max: number) =>
  z
    .string()
    .transform(sanitizeMultiline)
    .pipe(
      z
        .string()
        .min(min, `Must be at least ${min} characters`)
        .max(max, `Must be at most ${max} characters`),
    );
