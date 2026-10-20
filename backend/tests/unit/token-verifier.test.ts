import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { createTokenVerifier } from '../../src/services/token-verifier.js';

const SUPABASE_URL = 'https://abc.supabase.co';
const SECRET = 'super-secret-jwt-token-with-at-least-32-characters';
const USER_ID = '2b9b1f9e-1a2b-4c3d-8e4f-111111111111';

async function sign(
  overrides: {
    secret?: string;
    iss?: string;
    aud?: string;
    role?: string;
    exp?: string;
    claims?: Record<string, unknown>;
  } = {},
) {
  return new SignJWT({
    role: overrides.role ?? 'authenticated',
    email: 'a@test.local',
    ...overrides.claims,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(USER_ID)
    .setIssuer(overrides.iss ?? `${SUPABASE_URL}/auth/v1`)
    .setAudience(overrides.aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(overrides.exp ?? '1h')
    .sign(new TextEncoder().encode(overrides.secret ?? SECRET));
}

describe('token verifier (HS256 legacy mode)', () => {
  const verifier = createTokenVerifier({ SUPABASE_URL, SUPABASE_JWT_SECRET: SECRET });

  it('accepts a valid Supabase access token', async () => {
    await expect(verifier.verify(await sign())).resolves.toEqual({
      userId: USER_ID,
      email: 'a@test.local',
      isGuest: false,
    });
  });

  it('marks anonymous sign-ins as guests with no email', async () => {
    await expect(
      verifier.verify(await sign({ claims: { email: '', is_anonymous: true } })),
    ).resolves.toEqual({ userId: USER_ID, email: null, isGuest: true });
  });

  it.each([
    ['wrong signature', { secret: 'another-secret-another-secret-another-secret' }],
    ['wrong issuer', { iss: 'https://evil.supabase.co/auth/v1' }],
    ['wrong audience', { aud: 'other' }],
    ['anon role', { role: 'anon' }],
    ['expired', { exp: '-10m' }],
  ])('rejects a token with %s', async (_label, overrides) => {
    await expect(verifier.verify(await sign(overrides))).rejects.toMatchObject({ status: 401 });
  });

  it('rejects an unsigned (alg: none) token', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: USER_ID, role: 'authenticated' })).toString(
      'base64url',
    );
    await expect(verifier.verify(`${header}.${body}.`)).rejects.toMatchObject({ status: 401 });
  });
});
