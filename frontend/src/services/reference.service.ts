import { z } from 'zod';
import { categorySchema, dataEnvelope, referenceItemSchema } from '../schemas/api.schemas';
import type { Category, ReferenceItem } from '../types/api';
import { apiRequest } from './api-client';

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const result = await apiRequest('/categories', {
    authenticated: false,
    schema: dataEnvelope(z.array(categorySchema)),
    signal,
  });
  return result.data;
}

export async function fetchSubCounties(signal?: AbortSignal): Promise<ReferenceItem[]> {
  const result = await apiRequest('/sub-counties', {
    authenticated: false,
    schema: dataEnvelope(z.array(referenceItemSchema)),
    signal,
  });
  return result.data;
}
