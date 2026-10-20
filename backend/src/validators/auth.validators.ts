import { z } from 'zod';
import { normalizeKenyanPhone } from '../utils/phone.js';
import { singleLineText } from './common.validators.js';

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  // bcrypt (used by Supabase Auth) ignores bytes beyond 72.
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/\d/, 'Password needs a number');

export const registerSchema = z.object({
  email: z
    .email('Enter a valid email address')
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: passwordSchema,
  fullName: singleLineText(2, 100),
  phone: z
    .string()
    .max(20)
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value.trim() === '') {
        return null;
      }
      const normalized = normalizeKenyanPhone(value);
      if (!normalized) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid Kenyan mobile number' });
        return z.NEVER;
      }
      return normalized;
    }),
  captchaToken: z.string().min(1).max(4096).optional(),
});

export type RegisterInput = z.output<typeof registerSchema>;
