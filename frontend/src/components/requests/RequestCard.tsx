import { Link } from 'react-router';
import '../../styles/components/card.css';
import '../../styles/components/request-card.css';
import type { RequestSummary } from '../../types/api';
import { formatRelative, formatDateTime } from '../../utils/format';
import { categoryIcon } from '../../utils/status';
import { StatusBadge } from '../ui/Badge';
import { Icon } from '../ui/Icon';

export function RequestCard({ request, to }: { request: RequestSummary; to: string }) {
  return (
    <article className="card card--interactive request-card">
      <span className="request-card__icon">
        <Icon name={categoryIcon(request.category.slug)} />
      </span>
      <div className="request-card__body">
        <div className="request-card__top">
          <h2 className="request-card__title">
            <Link className="request-card__link" to={to}>
              {request.category.name}
            </Link>
          </h2>
          <StatusBadge status={request.status} />
        </div>
        <span className="request-card__ref">{request.referenceNumber}</span>
        <p className="request-card__description">{request.description}</p>
        <div className="request-card__meta">
          <span className="request-card__meta-item">
            <Icon name="bx-map" />
            {request.locationText}, {request.subCounty.name}
          </span>
          <span className="request-card__meta-item">
            <Icon name="bx-calendar" />
            <time dateTime={request.createdAt} title={formatDateTime(request.createdAt)}>
              {formatRelative(request.createdAt)}
            </time>
          </span>
        </div>
      </div>
    </article>
  );
}
