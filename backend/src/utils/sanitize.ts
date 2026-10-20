// Control characters (except tab and newline), zero-width characters and
// bidi overrides, which can disguise text (e.g. "Trojan Source" style tricks).
/* eslint-disable no-control-regex -- matching control characters is the purpose */
const CONTROL_CHARS = new RegExp(
  '[\\u0000-\\u0008\\u000B-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069]',
  'g',
);
/* eslint-enable no-control-regex */
const HTML_TAGS = /<\/?[a-z][^>]*>/gi;

/**
 * Normalises user free text before it is stored. React escapes on output, so
 * this is defence in depth for other consumers (CSV exports, emails, admin
 * tools): strips markup, invisible/bidi-override characters that can be used
 * to disguise content, and normalises Unicode so equal-looking text compares equal.
 */
export function sanitizeMultiline(input: string): string {
  return input
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS, '')
    .replace(HTML_TAGS, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Same as sanitizeMultiline but collapses all whitespace to single spaces. */
export function sanitizeSingleLine(input: string): string {
  return sanitizeMultiline(input).replace(/\s+/g, ' ');
}
