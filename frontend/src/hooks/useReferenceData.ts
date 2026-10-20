import { useQuery } from '@tanstack/react-query';
import { fetchCategories, fetchSubCounties } from '../services/reference.service';
import { queryKeys } from '../utils/query-client';

// Reference data changes rarely; the API also caches it (ETag + 5 min).
const ONE_HOUR = 60 * 60_000;

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: ONE_HOUR,
  });
}

export function useSubCounties() {
  return useQuery({
    queryKey: queryKeys.subCounties,
    queryFn: ({ signal }) => fetchSubCounties(signal),
    staleTime: ONE_HOUR,
  });
}
