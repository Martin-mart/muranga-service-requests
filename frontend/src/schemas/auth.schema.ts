import { z } from 'zod';

// Mirrors backend validators (layer 1 of 3: UX feedback only, never trusted).
const KENYAN_MOBILE = /^(?:\+?254|0)[71]\d{8}$/;

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(72, 'Use at most 72 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number');

export const registerFormSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(100, 'Name is too long'),
    email: z.email('Enter a valid email address').max(254),
    phone: z
      .string()
      .trim()
      .refine((value) => value === '' || KENYAN_MOBILE.test(value.replace(/[\s-]/g, '')), {
        message: 'Enter a Kenyan mobile number, e.g. 0712 345 678',
      }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export const loginFormSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
