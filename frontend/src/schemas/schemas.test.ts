import { describe, expect, it } from 'vitest';
import { registerFormSchema } from './auth.schema';
import { newRequestFormSchema, validateImage } from './request-form.schema';

const validRegistration = {
  fullName: 'Wanjiru Kamau',
  email: 'wanjiru@example.org',
  phone: '0712 345 678',
  password: 'Str0ngPassword',
  confirmPassword: 'Str0ngPassword',
};

describe('registerFormSchema', () => {
  it('accepts a valid registration with or without a phone', () => {
    expect(registerFormSchema.safeParse(validRegistration).success).toBe(true);
    expect(registerFormSchema.safeParse({ ...validRegistration, phone: '' }).success).toBe(true);
  });

  it.each([
    ['weak password', { password: 'password', confirmPassword: 'password' }, 'password'],
    ['mismatched confirmation', { confirmPassword: 'Different1Pass' }, 'confirmPassword'],
    ['non-Kenyan phone', { phone: '+255712345678' }, 'phone'],
    ['bad email', { email: 'not-an-email' }, 'email'],
  ])('rejects %s', (_label, override, path) => {
    const result = registerFormSchema.safeParse({ ...validRegistration, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain(path);
  });
});

describe('newRequestFormSchema', () => {
  const valid = {
    categoryId: 'c',
    subCountyId: 's',
    locationText: 'Kenol stage',
    description: 'Burst pipe flooding the road',
  };

  it('accepts a complete request', () => {
    expect(newRequestFormSchema.safeParse(valid).success).toBe(true);
  });

  it('enforces the same description limits as the database (10-2000)', () => {
    expect(newRequestFormSchema.safeParse({ ...valid, description: 'too short' }).success).toBe(
      false,
    );
    expect(
      newRequestFormSchema.safeParse({ ...valid, description: 'x'.repeat(2001) }).success,
    ).toBe(false);
  });

  it('requires category and sub-county', () => {
    const result = newRequestFormSchema.safeParse({ ...valid, categoryId: '', subCountyId: '' });
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      'categoryId',
      'subCountyId',
    ]);
  });
});

describe('validateImage', () => {
  const file = (type: string, size: number) => new File([new Uint8Array(size)], 'photo', { type });

  it('accepts JPEG, PNG and WebP up to 5 MB', () => {
    expect(validateImage(file('image/jpeg', 1024))).toBeNull();
    expect(validateImage(file('image/webp', 5 * 1024 * 1024))).toBeNull();
  });

  it('rejects other types and oversized files', () => {
    expect(validateImage(file('image/svg+xml', 10))).toMatch(/JPEG, PNG or WebP/);
    expect(validateImage(file('image/png', 5 * 1024 * 1024 + 1))).toMatch(/5 MB/);
  });
});
