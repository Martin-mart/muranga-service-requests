import { useState } from 'react';
import { Link, useParams } from 'react-router';
import '../../styles/pages/request-detail.css';
import { CommentThread } from '../../components/requests/CommentThread';
import { ImagePicker } from '../../components/requests/ImagePicker';
import { RequestFacts, RequestImage } from '../../components/requests/RequestFacts';
import { StatusTimeline } from '../../components/requests/StatusTimeline';
import { StatusBadge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useRequest, useUploadImage } from '../../hooks/useRequests';
import { useToast } from '../../hooks/useToast';
import { ApiError, errorMessage } from '../../services/api-client';
import type { RequestView } from '../../types/api';
import { STATUS_META } from '../../utils/status';

function AddPhoto({ request }: { request: RequestView }) {
  const [file, setFile] = useState<File | null>(null);
  const upload = useUploadImage(request.id);
  const toast = useToast();

  const send = async () => {
    if (!file) return;
    try {
      await upload.mutateAsync(file);
      setFile(null);
      toast.show({ tone: 'success', title: 'Photo added' });
    } catch (error) {
      toast.show({ tone: 'error', title: 'Photo upload failed', message: errorMessage(error) });
    }
  };

  return (
    <div className="stack">
      <ImagePicker file={file} onChange={setFile} disabled={upload.isPending} />
      {file && (
        <Button icon="bx-upload" loading={upload.isPending} onClick={() => void send()}>
          Upload photo
        </Button>
      )}
    </div>
  );
}

export default function RequestDetailPage() {
  const { id = '' } = useParams();
  const query = useRequest(id);
  useDocumentTitle(query.data ? `Request ${query.data.referenceNumber}` : 'Request');

  if (query.isPending) {
    return <SkeletonList count={3} label="Loading request" />;
  }
  if (query.isError) {
    if (
      query.error instanceof ApiError &&
      (query.error.status === 404 || query.error.status === 422)
    ) {
      return (
        <EmptyState
          icon="bx-search"
          title="Request not found"
          text="It may have been mistyped, or it belongs to another account."
          action={<ButtonLink to="/requests">Back to my requests</ButtonLink>}
        />
      );
    }
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  const request = query.data;
  return (
    <div className="stack stack--lg">
      <div className="page-header">
        <div>
          <Link className="page-header__back" to="/requests">
            <Icon name="bx-arrow-back" />
            My requests
          </Link>
          <h1 className="page-header__title">
            <span className="detail-header__ref">{request.referenceNumber}</span>
          </h1>
          <div className="detail-header__badges">
            <StatusBadge status={request.status} />
          </div>
          <p className="page-header__subtitle">{STATUS_META[request.status].description}</p>
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
            ) : request.status === 'pending' ? (
              <AddPhoto request={request} />
            ) : (
              <p className="field__hint">No photo was attached.</p>
            )}
          </Card>
          <Card title="Messages" titleId="messages-title">
            <CommentThread requestId={request.id} viewerRole="citizen" />
          </Card>
        </div>
        <Card title="Progress" titleId="progress-title">
          <StatusTimeline history={request.history} currentStatus={request.status} />
        </Card>
      </div>
    </div>
  );
}
