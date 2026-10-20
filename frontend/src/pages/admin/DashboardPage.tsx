import '../../styles/components/stat-card.css';
import '../../styles/pages/dashboard.css';
import { ChartCard } from '../../components/admin/ChartCard';
import { DailyTrend, OpenResolvedBars, ResolutionTimeBars } from '../../components/admin/Charts';
import { StatCard } from '../../components/admin/StatCard';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Column } from '../../components/ui/Table';
import { useAnalytics } from '../../hooks/useAdmin';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { errorMessage } from '../../services/api-client';
import type { Analytics } from '../../types/api';
import { formatDuration, formatNumber, formatShortDay } from '../../utils/format';

type BreakdownRow = Analytics['byCategory'][number];
type DailyRow = Analytics['daily'][number];

const breakdownColumns = (groupHeader: string): Column<BreakdownRow>[] => [
  { key: 'name', header: groupHeader, render: (row) => row.name },
  { key: 'open', header: 'Open', render: (row) => formatNumber(row.open) },
  { key: 'resolved', header: 'Resolved', render: (row) => formatNumber(row.resolved) },
  { key: 'total', header: 'Total', render: (row) => formatNumber(row.total) },
];

const dailyColumns: Column<DailyRow>[] = [
  { key: 'day', header: 'Day', render: (row) => formatShortDay(row.day) },
  { key: 'created', header: 'Submitted', render: (row) => formatNumber(row.created) },
  { key: 'resolved', header: 'Resolved', render: (row) => formatNumber(row.resolved) },
];

const resolutionColumns: Column<BreakdownRow>[] = [
  { key: 'name', header: 'Category', render: (row) => row.name },
  {
    key: 'avg',
    header: 'Average time to resolve',
    render: (row) => formatDuration(row.avgResolutionHours),
  },
];

const OPEN_RESOLVED_LEGEND = [
  { label: 'Resolved', swatch: 1 as const },
  { label: 'Open', swatch: 2 as const },
];

function DashboardSkeleton() {
  return (
    <div className="stack stack--lg" role="status" aria-label="Loading dashboard">
      <Skeleton variant="block" />
      <div className="dashboard-charts">
        <Skeleton variant="chart" />
        <Skeleton variant="chart" />
      </div>
    </div>
  );
}

function Totals({ data }: { data: Analytics }) {
  const { totals } = data;
  return (
    <dl className="stat-grid">
      <StatCard label="Total requests" value={formatNumber(totals.total)} icon="bx-collection" />
      <StatCard
        label="Pending"
        value={formatNumber(totals.pending)}
        icon="bx-time-five"
        tone="pending"
      />
      <StatCard
        label="In progress"
        value={formatNumber(totals.inProgress)}
        icon="bx-loader-circle"
        tone="in-progress"
      />
      <StatCard
        label="Resolved"
        value={formatNumber(totals.resolved)}
        icon="bx-check-circle"
        tone="resolved"
        hint={`${formatNumber(totals.open)} still open`}
      />
      <StatCard
        label="Avg. time to resolve"
        value={formatDuration(data.avgResolutionHours)}
        icon="bx-timer"
      />
    </dl>
  );
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const query = useAnalytics();

  return (
    <div className="stack stack--lg">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Dashboard</h1>
          <p className="page-header__subtitle">Service requests across Murang&rsquo;a County.</p>
        </div>
        <ButtonLink to="/admin/requests?status=pending" icon="bx-task">
          Review pending requests
        </ButtonLink>
      </div>

      {query.isPending ? (
        <DashboardSkeleton />
      ) : query.isError ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : query.data.totals.total === 0 ? (
        <EmptyState
          icon="bx-bar-chart-alt-2"
          title="No requests yet"
          text="Charts will appear once citizens start submitting requests."
        />
      ) : (
        <>
          <Totals data={query.data} />
          <div className="dashboard-charts">
            <ChartCard
              wide
              title="Submitted vs resolved, last 30 days"
              subtitle="Daily count of new requests and of requests marked resolved."
              legend={[
                { label: 'Submitted', swatch: 2, line: true },
                { label: 'Resolved', swatch: 1, line: true },
              ]}
              table={{ columns: dailyColumns, rows: query.data.daily, rowKey: (row) => row.day }}
            >
              <DailyTrend data={query.data.daily} />
            </ChartCard>
            <ChartCard
              tall
              title="Requests by category"
              subtitle="Open and resolved requests per category."
              legend={OPEN_RESOLVED_LEGEND}
              table={{
                columns: breakdownColumns('Category'),
                rows: query.data.byCategory,
                rowKey: (row) => row.id,
              }}
            >
              <OpenResolvedBars data={query.data.byCategory} />
            </ChartCard>
            <ChartCard
              tall
              title="Requests by sub-county"
              subtitle="Open and resolved requests per sub-county."
              legend={OPEN_RESOLVED_LEGEND}
              table={{
                columns: breakdownColumns('Sub-county'),
                rows: query.data.bySubCounty,
                rowKey: (row) => row.id,
              }}
            >
              <OpenResolvedBars data={query.data.bySubCounty} />
            </ChartCard>
            <ChartCard
              wide
              title="Average time to resolve, by category"
              subtitle="From submission to resolution, for resolved requests only."
              table={{
                columns: resolutionColumns,
                rows: query.data.byCategory,
                rowKey: (row) => row.id,
              }}
            >
              <ResolutionTimeBars data={query.data.byCategory} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
