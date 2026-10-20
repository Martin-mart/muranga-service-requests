import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import '../../styles/components/pager.css';
import '../../styles/components/table.css';
import { RequestFilters } from '../../components/admin/RequestFilters';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { Table, type Column } from '../../components/ui/Table';
import { useAdminRequests } from '../../hooks/useAdmin';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { errorMessage } from '../../services/api-client';
import type { AdminRequestFilters, RequestStatus, RequestSummary } from '../../types/api';
import { formatDateTime, formatRelative } from '../../utils/format';
import { STATUS_ORDER } from '../../utils/status';

const COLUMNS: Column<RequestSummary>[] = [
  {
    key: 'ref',
    header: 'Reference',
    className: 'table__td--nowrap',
    render: (row) => (
      <Link className="table__link" to={`/admin/requests/${row.id}`}>
        {row.referenceNumber}
      </Link>
    ),
  },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'category', header: 'Category', render: (row) => row.category.name },
  {
    key: 'location',
    header: 'Location',
    className: 'table__td--truncate',
    render: (row) => (
      <>
        {row.locationText}
        <span className="table__muted">{row.subCounty.name}</span>
      </>
    ),
  },
  {
    key: 'citizen',
    header: 'Citizen',
    render: (row) => (row.isAnonymous ? 'Anonymous' : (row.citizen?.fullName ?? 'Unknown')),
  },
  {
    key: 'submitted',
    header: 'Submitted',
    className: 'table__td--nowrap',
    render: (row) => (
      <time dateTime={row.createdAt} title={formatDateTime(row.createdAt)}>
        {formatRelative(row.createdAt)}
      </time>
    ),
  },
];

/** Filters live in the URL so views can be bookmarked and shared between officers. */
function useUrlFilters(): [AdminRequestFilters, (next: AdminRequestFilters) => void] {
  const [params, setParams] = useSearchParams();
  const filters = useMemo<AdminRequestFilters>(() => {
    const status = params.get('status');
    return {
      status:
        status && (STATUS_ORDER as string[]).includes(status)
          ? (status as RequestStatus)
          : undefined,
      categoryId: params.get('category') ?? undefined,
      subCountyId: params.get('subCounty') ?? undefined,
      search: params.get('q') ?? undefined,
    };
  }, [params]);

  const setFilters = useCallback(
    (next: AdminRequestFilters) => {
      const entries = {
        status: next.status,
        category: next.categoryId,
        subCounty: next.subCountyId,
        q: next.search,
      };
      const clean = Object.fromEntries(Object.entries(entries).filter(([, v]) => v)) as Record<
        string,
        string
      >;
      setParams(clean, { replace: true });
    },
    [setParams],
  );
  return [filters, setFilters];
}

export default function AdminRequestsPage() {
  useDocumentTitle('Requests');
  const [filters, setFilters] = useUrlFilters();
  // Cursor pagination: a stack of cursors lets "Previous" go back exactly.
  // The stack belongs to one filter combination; any filter change (including
  // browser back/forward) starts again from page 1.
  const filterKey = JSON.stringify(filters);
  const [paging, setPaging] = useState<{ key: string; stack: (string | null)[] }>({
    key: filterKey,
    stack: [null],
  });
  const cursors = paging.key === filterKey ? paging.stack : [null];
  const setCursors = (update: (stack: (string | null)[]) => (string | null)[]) => {
    setPaging({ key: filterKey, stack: update(cursors) });
  };
  const cursor = cursors.at(-1) ?? null;
  const query = useAdminRequests(filters, cursor);

  const pageNumber = cursors.length;
  const rows = query.data?.items ?? [];

  return (
    <div className="stack stack--lg">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Service requests</h1>
          <p className="page-header__subtitle">
            Newest first. Open a request to update its status.
          </p>
        </div>
      </div>
      <RequestFilters value={filters} onChange={setFilters} />

      {query.isPending ? (
        <SkeletonList count={4} label="Loading requests" />
      ) : query.isError ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="bx-filter-alt"
          title="No matching requests"
          text="Try a different search or clear the filters."
        />
      ) : (
        <>
          <div aria-busy={query.isFetching}>
            <Table
              caption={`Service requests, page ${pageNumber}`}
              columns={COLUMNS}
              rows={rows}
              rowKey={(row) => row.id}
            />
          </div>
          <nav className="pager" aria-label="Pagination">
            <span className="pager__status" aria-live="polite">
              Page {pageNumber}
            </span>
            <div className="pager__buttons">
              <Button
                variant="secondary"
                size="sm"
                icon="bx-chevron-left"
                disabled={pageNumber === 1 || query.isFetching}
                onClick={() => {
                  setCursors((stack) => stack.slice(0, -1));
                }}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!query.data.nextCursor || query.isFetching}
                onClick={() => {
                  const next = query.data.nextCursor;
                  if (next) setCursors((stack) => [...stack, next]);
                }}
              >
                Next
              </Button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
