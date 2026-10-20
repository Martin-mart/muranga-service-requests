import { beforeEach, describe, expect, it } from 'vitest';
import { offlineQueue } from './offline-queue';

const payload = {
  categoryId: 'c',
  subCountyId: 's',
  locationText: 'Kenol',
  description: 'Burst pipe on road',
  latitude: null,
  longitude: null,
  isAnonymous: false,
};

describe('offlineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores items per user and de-duplicates by idempotency key', () => {
    offlineQueue.add('u1', { idempotencyKey: 'k1', payload, queuedAt: 'now' });
    offlineQueue.add('u1', { idempotencyKey: 'k1', payload, queuedAt: 'later' });
    offlineQueue.add('u2', { idempotencyKey: 'k2', payload, queuedAt: 'now' });
    expect(offlineQueue.list('u1')).toHaveLength(1);
    expect(offlineQueue.list('u2')).toHaveLength(1);
  });

  it('removes items and cleans up storage when empty', () => {
    offlineQueue.add('u1', { idempotencyKey: 'k1', payload, queuedAt: 'now' });
    offlineQueue.remove('u1', 'k1');
    expect(offlineQueue.list('u1')).toEqual([]);
    expect(localStorage.length).toBe(0);
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('mrg:offline-requests:u1', '{not json');
    expect(offlineQueue.list('u1')).toEqual([]);
  });
});
