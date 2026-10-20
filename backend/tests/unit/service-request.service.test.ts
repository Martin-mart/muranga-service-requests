import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '../../src/models/context.js';
import type { ServiceRequestSummary } from '../../src/models/service-request.js';
import type { ServiceRequestRepository } from '../../src/repositories/service-request.repository.js';
import type { StorageRepository } from '../../src/repositories/storage.repository.js';
import { createServiceRequestService } from '../../src/services/service-request.service.js';
import { AppError, conflict } from '../../src/utils/errors.js';

const ctx: AuthContext = {
  db: {} as SupabaseClient,
  user: {
    id: 'user-1',
    email: null,
    role: 'citizen',
    fullName: 'Wanjiru',
    phone: null,
    isGuest: false,
  },
};

const summary = { id: 'req-1', referenceNumber: 'MRG-2026-000001' } as ServiceRequestSummary;

const input = {
  categoryId: 'c',
  subCountyId: 's',
  locationText: 'Kenol',
  description: 'Water pipe burst near the stage',
  isAnonymous: false,
};

function setup() {
  const requests = {
    insert: vi.fn(),
    findByIdempotencyKey: vi.fn().mockResolvedValue(null),
    listForCitizen: vi.fn(),
    listForAdmin: vi.fn(),
    findDetail: vi.fn(),
    attachImage: vi.fn().mockResolvedValue(undefined),
    changeStatus: vi.fn(),
  } satisfies ServiceRequestRepository;
  const storage = {
    createSignedUploadUrl: vi.fn().mockResolvedValue('https://storage/upload?token=t'),
    createSignedViewUrl: vi.fn().mockResolvedValue('https://storage/view?token=t'),
  } satisfies StorageRepository;
  const service = createServiceRequestService({
    requests,
    storage,
    signedUrlTtlSeconds: 600,
    newId: () => 'fixed-uuid',
  });
  return { service, requests, storage };
}

describe('ServiceRequestService.create', () => {
  it('creates a request and normalises optional coordinates to null', async () => {
    const { service, requests } = setup();
    requests.insert.mockResolvedValue(summary);

    await expect(service.create(ctx, input)).resolves.toEqual({ request: summary, created: true });
    expect(requests.insert).toHaveBeenCalledWith(ctx.db, {
      ...input,
      latitude: null,
      longitude: null,
      idempotencyKey: null,
    });
  });

  it('returns the original request for a repeated idempotency key without inserting', async () => {
    const { service, requests } = setup();
    requests.findByIdempotencyKey.mockResolvedValue(summary);

    await expect(service.create(ctx, input, 'key-1')).resolves.toEqual({
      request: summary,
      created: false,
    });
    expect(requests.insert).not.toHaveBeenCalled();
  });

  it('resolves a concurrent duplicate (unique violation) to the existing row', async () => {
    const { service, requests } = setup();
    requests.findByIdempotencyKey.mockResolvedValueOnce(null).mockResolvedValueOnce(summary);
    requests.insert.mockRejectedValue(conflict('duplicate'));

    await expect(service.create(ctx, input, 'key-1')).resolves.toEqual({
      request: summary,
      created: false,
    });
  });

  it('propagates the daily quota error from the database', async () => {
    const { service, requests } = setup();
    requests.insert.mockRejectedValue(new AppError(429, 'DAILY_LIMIT_REACHED', 'limit'));

    await expect(service.create(ctx, input)).rejects.toMatchObject({ status: 429 });
  });
});

describe('ServiceRequestService.createImageUpload', () => {
  it('registers a server-chosen path in the caller folder before issuing the URL', async () => {
    const { service, requests, storage } = setup();

    const ticket = await service.createImageUpload(ctx, 'req-1', {
      contentType: 'image/png',
      sizeBytes: 1000,
    });

    expect(ticket.path).toBe('user-1/req-1/fixed-uuid.png');
    expect(requests.attachImage).toHaveBeenCalledWith(
      ctx.db,
      'req-1',
      'user-1/req-1/fixed-uuid.png',
    );
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(
      ctx.db,
      'user-1/req-1/fixed-uuid.png',
    );
    expect(requests.attachImage.mock.invocationCallOrder[0]).toBeLessThan(
      storage.createSignedUploadUrl.mock.invocationCallOrder[0]!,
    );
  });

  it('rejects files above 5 MB', async () => {
    const { service, requests } = setup();
    await expect(
      service.createImageUpload(ctx, 'req-1', {
        contentType: 'image/jpeg',
        sizeBytes: 6 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({ status: 413 });
    expect(requests.attachImage).not.toHaveBeenCalled();
  });
});

describe('ServiceRequestService.getView', () => {
  it('returns 404 when the row is missing or hidden by RLS', async () => {
    const { service, requests } = setup();
    requests.findDetail.mockResolvedValue(null);
    await expect(service.getView(ctx, 'req-1')).rejects.toMatchObject({ status: 404 });
  });

  it('replaces the private image path with a signed URL', async () => {
    const { service, requests } = setup();
    requests.findDetail.mockResolvedValue({
      ...summary,
      imagePath: 'user-1/req-1/a.jpg',
      history: [],
    });

    const view = await service.getView(ctx, 'req-1');
    expect(view.imageUrl).toBe('https://storage/view?token=t');
    expect(view).not.toHaveProperty('imagePath');
    expect(requests.findDetail).toHaveBeenCalledWith(ctx.db, 'req-1', false);
  });
});
