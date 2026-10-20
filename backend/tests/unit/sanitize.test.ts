import { describe, expect, it } from 'vitest';
import { normalizeKenyanPhone } from '../../src/utils/phone.js';
import { sanitizeMultiline, sanitizeSingleLine } from '../../src/utils/sanitize.js';

describe('sanitize', () => {
  it('strips HTML tags but keeps the text', () => {
    expect(sanitizeSingleLine('<script>alert(1)</script>Burst pipe <b>here</b>')).toBe(
      'alert(1)Burst pipe here',
    );
  });

  it('removes control, zero-width and bidi-override characters', () => {
    expect(sanitizeSingleLine('Kiharu\u0000​‮ market')).toBe('Kiharu market');
  });

  it('preserves paragraphs in multiline text but limits blank lines', () => {
    expect(sanitizeMultiline('Line one\r\n\r\n\r\n\r\nLine two  ')).toBe('Line one\n\nLine two');
  });

  it('collapses whitespace in single-line text', () => {
    expect(sanitizeSingleLine("  Murang'a\n  town  ")).toBe("Murang'a town");
  });
});

describe('normalizeKenyanPhone', () => {
  it.each([
    ['0712345678', '+254712345678'],
    ['0112 345 678', '+254112345678'],
    ['254712345678', '+254712345678'],
    ['+254 712-345-678', '+254712345678'],
  ])('normalises %s', (input, expected) => {
    expect(normalizeKenyanPhone(input)).toBe(expected);
  });

  it.each(['0812345678', '+255712345678', '07123', 'abc'])('rejects %s', (input) => {
    expect(normalizeKenyanPhone(input)).toBeNull();
  });
});
