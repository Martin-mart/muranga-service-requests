import { z } from 'zod';
import { multilineText } from './common.validators.js';

export const createCommentSchema = z.object({
  body: multilineText(1, 2000),
  // Ignored for citizens (the database forces their comments public).
  isPublic: z.boolean().default(true),
});
