import { Link, useParams } from 'react-router';
import '../../styles/pages/request-detail.css';
import { StatusChangePanel } from '../../components/admin/StatusChangePanel';
import { CommentThread } from '../../components/requests/CommentThread';
import { RequestFacts, RequestImage } from '../../components/requests/RequestFacts';
import { StatusTimeline } from '../../components/requests/StatusTimeline';
import { StatusBadge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useRequest } from '../../hooks/useRequests';
import { ApiError, errorMessage } from '../../services/api-client';

export default function AdminRequestDetailPage() {
  const { id = '' } = useParams();
  const query = useRequest(id);
  useDocumentTitle(query.data ? `Manage ${query.data.referenceNumber}` : 'Manage request');

  if (query.isPending) {
    return <SkeletonList count={3} label="Loading request" />;
  }
  if (query.isError) {
    return query.error instanceof ApiError &&
      (query.error.status === 404 || query.error.status === 422) ? (
      <EmptyState
        icon="bx-search"
        title="Request not found"
        action={<ButtonLink to="/admin/requests">Back to requests</ButtonLink>}
      />
    ) : (
      <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  }

  const request = query.data;
  return (
    <div className="stack stack--lg">
      <div className="page-header">
        <div>
          <Link className="page-header__back" to="/admin/requests">
            <Icon name="bx-arrow-back" />
            All requests
          </Link>
          <h1 className="page-header__title">
            <span className="detail-header__ref">{request.referenceNumber}</span>
          </h1>
          <div className="detail-header__badges">
            <StatusBadge status={request.status} />
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <div className="stack stack--lg">
          <Card title="Details" titleId="details-title">
            <RequestFacts request={request} />
          </Card>
          <Card title="Photo" titleId="photo-title">
            {request.imageUrl ? (
              <RequestImage url={request.imageUrl} reference={request.referenceNumber} />
            ) : (
              <p className="field__hint">No photo was attached.</p>
            )}
          </Card>
          <Card title="Notes and messages" titleId="notes-title">
            <CommentThread requestId={request.id} viewerRole="admin" />
          </Card>
        </div>
        <div className="stack stack--lg">
          <Card title="Status" titleId="status-title">
            <StatusChangePanel request={request} />
          </Card>
          <Card title="History" titleId="history-title">
            <StatusTimeline
              history={request.history}
              currentStatus={request.status}
              showActorNames
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
