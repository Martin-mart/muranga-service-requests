import type { AuthContext } from '../models/context.js';
import type { Page, PageRequest } from '../models/pagination.js';
import type {
  AdminRequestFilters,
  RequestStatus,
  ServiceRequestSummary,
  StatusChangeResult,
} from '../models/service-request.js';
import type { ServiceRequestRepository } from '../repositories/service-request.repository.js';
import { toPage } from '../utils/cursor.js';
import { forbidden } from '../utils/errors.js';

export interface AdminRequestService {
  list(
    ctx: AuthContext,
    filters: AdminRequestFilters,
    page: PageRequest,
  ): Promise<Page<ServiceRequestSummary>>;
  changeStatus(
    ctx: AuthContext,
    requestId: string,
    status: Exclude<RequestStatus, 'pending'>,
    note: string | undefined,
  ): Promise<StatusChangeResult>;
}

/** Role is re-checked here so the service is safe even if mounted without the route guard. */
function assertAdmin(ctx: AuthContext): void {
  if (ctx.user.role !== 'admin') {
    throw forbidden();
  }
}

export function createAdminRequestService(deps: {
  requests: ServiceRequestRepository;
}): AdminRequestService {
  return {
    async list(ctx, filters, page) {
      assertAdmin(ctx);
      const rows = await deps.requests.listForAdmin(ctx.db, filters, page);
      return toPage(rows, page.limit);
    },

    async changeStatus(ctx, requestId, status, note) {
      assertAdmin(ctx);
      // Transition rules, history, resolved_at and the citizen notification are
      // all enforced atomically in the database (see change_request_status()).
      return deps.requests.changeStatus(ctx.db, requestId, status, note ?? null);
    },
  };
}
