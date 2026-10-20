import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { PageRequest } from '../models/pagination.js';
import type {
  AdminRequestFilters,
  NewServiceRequest,
  RequestStatus,
  ServiceRequestDetail,
  ServiceRequestSummary,
  StatusChangeResult,
} from '../models/service-request.js';
import { olderThanFilter } from '../utils/cursor.js';
import { throwIfDbError } from '../utils/db-errors.js';
import { notFound } from '../utils/errors.js';
import { nullableNumber, referenceRow, roleSchema, statusSchema } from './rows.js';

// Explicit column lists (never `*`): stable API shape, no accidental exposure of
// internal columns such as search_vector or idempotency_key.
const SUMMARY_COLUMNS =
  'id, reference_number, status, location_text, description, created_at, updated_at, resolved_at, is_anonymous, ' +
  'category:categories(id, slug, name), sub_county:sub_counties(id, slug, name)';
const CITIZEN_EMBED = 'citizen:profiles(id, full_name, phone)';
// History is embedded in the same round trip (no N+1 per request).
const DETAIL_COLUMNS =
  `${SUMMARY_COLUMNS}, latitude, longitude, image_path, ${CITIZEN_EMBED}, ` +
  'history:request_status_history(id, from_status, to_status, actor_role, note, created_at, actor:profiles(full_name))';

const MAX_HISTORY_ROWS = 50;
const REFERENCE_NUMBER_RE = /^MRG-\d{4}-\d{6,}$/i;

const citizenRow = z
  .object({ id: z.uuid(), full_name: z.string(), phone: z.string().nullable() })
  .nullable()
  .optional()
  .transform((row) => (row ? { id: row.id, fullName: row.full_name, phone: row.phone } : null));

const summaryRow = z
  .object({
    id: z.uuid(),
    reference_number: z.string(),
    status: statusSchema,
    location_text: z.string(),
    description: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    resolved_at: z.string().nullable(),
    is_anonymous: z.boolean(),
    category: referenceRow,
    sub_county: referenceRow,
    citizen: citizenRow,
  })
  .transform((row): ServiceRequestSummary => ({
    id: row.id,
    referenceNumber: row.reference_number,
    status: row.status,
    locationText: row.location_text,
    description: row.description,
    category: row.category,
    subCounty: row.sub_county,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    isAnonymous: row.is_anonymous,
    // Officers can read every profile under RLS, so anonymity is applied here.
    citizen: row.is_anonymous ? null : row.citizen,
  }));

const historyRow = z
  .object({
    id: z.uuid(),
    from_status: statusSchema.nullable(),
    to_status: statusSchema,
    actor_role: roleSchema,
    note: z.string().nullable(),
    created_at: z.string(),
    actor: z.object({ full_name: z.string() }).nullable().optional(),
  })
  .transform((row) => ({
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actorRole: row.actor_role,
    actorName: row.actor?.full_name ?? null,
    note: row.note,
    createdAt: row.created_at,
  }));

const detailRow = z
  .object({
    latitude: nullableNumber,
    longitude: nullableNumber,
    image_path: z.string().nullable(),
    history: z.array(historyRow),
  })
  .loose();

const statusChangeRow = z
  .object({
    id: z.uuid(),
    status: statusSchema,
    resolved_at: z.string().nullable(),
    updated_at: z.string(),
  })
  .transform((row): StatusChangeResult => ({
    id: row.id,
    status: row.status,
    resolvedAt: row.resolved_at,
    updatedAt: row.updated_at,
  }));

function parseDetail(data: unknown, includeCitizen: boolean): ServiceRequestDetail {
  const summary = summaryRow.parse(data);
  const extra = detailRow.parse(data);
  return {
    ...summary,
    citizen: includeCitizen ? summary.citizen : null,
    latitude: extra.latitude,
    longitude: extra.longitude,
    imagePath: extra.image_path,
    history: summary.isAnonymous
      ? extra.history.map((entry) =>
          entry.actorRole === 'citizen' ? { ...entry, actorName: null } : entry,
        )
      : extra.history,
  };
}

export interface ServiceRequestRepository {
  insert(db: SupabaseClient, input: NewServiceRequest): Promise<ServiceRequestSummary>;
  findByIdempotencyKey(
    db: SupabaseClient,
    citizenId: string,
    key: string,
  ): Promise<ServiceRequestSummary | null>;
  listForCitizen(
    db: SupabaseClient,
    citizenId: string,
    page: PageRequest,
  ): Promise<ServiceRequestSummary[]>;
  listForAdmin(
    db: SupabaseClient,
    filters: AdminRequestFilters,
    page: PageRequest,
  ): Promise<ServiceRequestSummary[]>;
  findDetail(
    db: SupabaseClient,
    id: string,
    includeCitizen: boolean,
  ): Promise<ServiceRequestDetail | null>;
  attachImage(db: SupabaseClient, requestId: string, path: string): Promise<void>;
  changeStatus(
    db: SupabaseClient,
    requestId: string,
    status: RequestStatus,
    note: string | null,
  ): Promise<StatusChangeResult>;
}

export const serviceRequestRepository: ServiceRequestRepository = {
  async insert(db, input) {
    const { data, error } = await db
      .from('service_requests')
      .insert({
        category_id: input.categoryId,
        sub_county_id: input.subCountyId,
        location_text: input.locationText,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        idempotency_key: input.idempotencyKey,
        is_anonymous: input.isAnonymous,
      })
      .select(SUMMARY_COLUMNS)
      .single();
    throwIfDbError(error);
    return summaryRow.parse(data);
  },

  async findByIdempotencyKey(db, citizenId, key) {
    const { data, error } = await db
      .from('service_requests')
      .select(SUMMARY_COLUMNS)
      .eq('citizen_id', citizenId)
      .eq('idempotency_key', key)
      .maybeSingle();
    throwIfDbError(error);
    return data ? summaryRow.parse(data) : null;
  },

  async listForCitizen(db, citizenId, page) {
    // The explicit citizen_id filter duplicates RLS on purpose: it lets the
    // planner use (citizen_id, created_at desc, id desc) instead of filtering
    // through the RLS predicate.
    let query = db
      .from('service_requests')
      .select(SUMMARY_COLUMNS)
      .eq('citizen_id', citizenId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(page.limit + 1);
    if (page.cursor) {
      query = query.or(olderThanFilter(page.cursor));
    }
    const { data, error } = await query;
    throwIfDbError(error);
    return z.array(summaryRow).parse(data ?? []);
  },

  async listForAdmin(db, filters, page) {
    let query = db
      .from('service_requests')
      .select(`${SUMMARY_COLUMNS}, ${CITIZEN_EMBED}`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(page.limit + 1);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.subCountyId) query = query.eq('sub_county_id', filters.subCountyId);
    if (filters.search) {
      query = REFERENCE_NUMBER_RE.test(filters.search)
        ? query.eq('reference_number', filters.search.toUpperCase())
        : // websearch_to_tsquery: parameterised, never interpreted as SQL or LIKE patterns.
          query.textSearch('search_vector', filters.search, {
            type: 'websearch',
            config: 'english',
          });
    }
    if (page.cursor) {
      query = query.or(olderThanFilter(page.cursor));
    }

    const { data, error } = await query;
    throwIfDbError(error);
    return z.array(summaryRow).parse(data ?? []);
  },

  async findDetail(db, id, includeCitizen) {
    const { data, error } = await db
      .from('service_requests')
      .select(DETAIL_COLUMNS)
      .eq('id', id)
      .order('created_at', { referencedTable: 'history', ascending: true })
      .limit(MAX_HISTORY_ROWS, { referencedTable: 'history' })
      .maybeSingle();
    throwIfDbError(error);
    return data ? parseDetail(data, includeCitizen) : null;
  },

  async attachImage(db, requestId, path) {
    const { error } = await db.rpc('attach_request_image', {
      p_request_id: requestId,
      p_path: path,
    });
    throwIfDbError(error);
  },

  async changeStatus(db, requestId, status, note) {
    const response = await db.rpc('change_request_status', {
      p_request_id: requestId,
      p_status: status,
      p_note: note,
    });
    throwIfDbError(response.error);
    const row = z.array(statusChangeRow).parse(response.data)[0];
    if (!row) {
      throw notFound();
    }
    return row;
  },
};
