/**
 * Normalises common Kenyan mobile formats (07.., 01.., 2547.., +2547..) to
 * E.164 (+2547XXXXXXXX / +2541XXXXXXXX), the only format the database accepts.
 * Returns null when the input is not a valid Kenyan mobile number.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '');
  const match = /^(?:\+?254|0)([71]\d{8})$/.exec(digits);
  return match?.[1] ? `+254${match[1]}` : null;
}
