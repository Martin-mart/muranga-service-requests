import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/api-client';
import { offlineQueue } from '../services/offline-queue';
import {
  addComment,
  createRequest,
  fetchComments,
  fetchMyRequests,
  fetchRequest,
  uploadRequestImage,
  type NewRequestPayload,
} from '../services/requests.service';
import type { RequestSummary } from '../types/api';
import { queryKeys } from '../utils/query-client';

export function useMyRequests() {
  return useInfiniteQuery({
    queryKey: queryKeys.myRequests,
    queryFn: ({ pageParam, signal }) => fetchMyRequests(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: queryKeys.request(id),
    queryFn: ({ signal }) => fetchRequest(id, signal),
    // Signed image URLs expire after 10 minutes; refresh well before that.
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export type SubmitOutcome =
  { kind: 'created'; request: RequestSummary; imageFailed: boolean } | { kind: 'queued' };

interface SubmitInput {
  userId: string;
  payload: NewRequestPayload;
  image: File | null;
  idempotencyKey: string;
}

/**
 * Submits a request. When there is no connection the text is queued and sent
 * later with the same idempotency key; the image upload is a separate step so
 * a failed upload never loses the request itself.
 */
export function useSubmitRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      payload,
      image,
      idempotencyKey,
    }: SubmitInput): Promise<SubmitOutcome> => {
      const queue = () => {
        offlineQueue.add(userId, { idempotencyKey, payload, queuedAt: new Date().toISOString() });
        return { kind: 'queued' } as const;
      };
      if (!navigator.onLine) {
        return queue();
      }
      let request: RequestSummary;
      try {
        request = await createRequest(payload, idempotencyKey);
      } catch (error) {
        if (error instanceof ApiError && error.isNetworkError) {
          return queue();
        }
        throw error;
      }
      let imageFailed = false;
      if (image) {
        imageFailed = await uploadRequestImage(request.id, image).then(
          () => false,
          () => true,
        );
      }
      return { kind: 'created', request, imageFailed };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myRequests }),
  });
}

export function useUploadImage(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadRequestImage(requestId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.request(requestId) }),
  });
}

export function useComments(requestId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.comments(requestId),
    queryFn: ({ pageParam, signal }) => fetchComments(requestId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useAddComment(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, isPublic }: { body: string; isPublic: boolean }) =>
      addComment(requestId, body, isPublic),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.comments(requestId) }),
  });
}
