import { describe, expect, it } from 'vitest';
import { formatDuration, formatRelative } from './format';
import { nextStatus } from './status';

describe('formatDuration', () => {
  it.each([
    [null, 'No data'],
    [3.25, '3.3 h'],
    [24, '1 day'],
    [54, '2 days 6 h'],
  ])('%s -> %s', (hours, expected) => {
    expect(formatDuration(hours)).toBe(expected);
  });
});

describe('formatRelative', () => {
  it('formats past times relative to now', () => {
    const now = Date.parse('2026-10-19T12:00:00Z');
    expect(formatRelative('2026-10-19T09:00:00Z', now)).toBe('3 hours ago');
    expect(formatRelative('2026-10-19T11:59:40Z', now)).toBe('just now');
  });
});

describe('nextStatus', () => {
  it('only ever moves forward one step (mirrors the DB trigger)', () => {
    expect(nextStatus('pending')).toBe('in_progress');
    expect(nextStatus('in_progress')).toBe('resolved');
    expect(nextStatus('resolved')).toBeNull();
  });
});
