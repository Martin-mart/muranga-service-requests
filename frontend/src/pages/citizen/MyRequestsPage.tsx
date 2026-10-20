import '../../styles/components/request-card.css';
import '../../styles/components/card.css';
import { RequestCard } from '../../components/requests/RequestCard';
import { ButtonLink } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { LoadMore } from '../../components/ui/LoadMore';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useOfflineQueueSync } from '../../hooks/useOfflineQueueSync';
import { useMyRequests } from '../../hooks/useRequests';
import { errorMessage } from '../../services/api-client';
import { offlineQueue } from '../../services/offline-queue';

function QueuedRequests({ userId }: { userId: string }) {
  const queued = offlineQueue.list(userId);
  if (queued.length === 0) return null;
  return (
    <section aria-labelledby="queued-title" className="stack">
      <h2 id="queued-title" className="card__title">
        Waiting to be sent
      </h2>
      <ul className="request-list">
        {queued.map((item) => (
          <li key={item.idempotencyKey} className="card request-card request-card--queued">
            <span className="request-card__icon">
              <Icon name="bx-cloud-upload" />
            </span>
            <div className="request-card__body">
              <div className="request-card__top">
                <span className="request-card__link">{item.payload.locationText}</span>
                <Badge icon="bx-wifi-off">Saved offline</Badge>
              </div>
              <p className="request-card__description">{item.payload.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function MyRequestsPage() {
  useDocumentTitle('My requests');
  const { user } = useAuth();
  useOfflineQueueSync(user?.id ?? null);
  const query = useMyRequests();
  const requests = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="stack stack--lg">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">My requests</h1>
          <p className="page-header__subtitle">Everything you have reported, newest first.</p>
        </div>
        <ButtonLink to="/requests/new" icon="bx-plus">
          Report an issue
        </ButtonLink>
      </div>

      {user && <QueuedRequests userId={user.id} />}

      {query.isPending ? (
        <SkeletonList label="Loading your requests" />
      ) : query.isError ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon="bx-clipboard"
          title="No requests yet"
          text="When you report a problem it will appear here with its current status."
          action={
            <ButtonLink to="/requests/new" icon="bx-plus">
              Report your first issue
            </ButtonLink>
          }
        />
      ) : (
        <ul className="request-list" aria-label="Your service requests">
          {requests.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} to={`/requests/${request.id}`} />
            </li>
          ))}
        </ul>
      )}

      <LoadMore
        hasMore={query.hasNextPage}
        loading={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
        label="Show older requests"
      />
    </div>
  );
}
