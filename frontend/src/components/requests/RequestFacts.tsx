import '../../styles/pages/request-detail.css';
import type { RequestView } from '../../types/api';
import { formatDateTime, osmLink } from '../../utils/format';
import { Icon } from '../ui/Icon';

function Fact({
  icon,
  term,
  wide,
  children,
}: {
  icon: string;
  term: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? 'facts__item facts__item--wide' : 'facts__item'}>
      <dt className="facts__term">
        <Icon name={icon} />
        {term}
      </dt>
      <dd className={wide ? 'facts__value facts__value--prose' : 'facts__value'}>{children}</dd>
    </div>
  );
}

/** Read-only details shared by the citizen and admin request pages. */
export function RequestFacts({ request }: { request: RequestView }) {
  return (
    <dl className="facts">
      <Fact icon="bx-category" term="Category">
        {request.category.name}
      </Fact>
      <Fact icon="bx-map-alt" term="Sub-county">
        {request.subCounty.name}
      </Fact>
      <Fact icon="bx-map" term="Location">
        {request.locationText}
      </Fact>
      <Fact icon="bx-current-location" term="GPS">
        {request.latitude !== null && request.longitude !== null ? (
          <a
            href={osmLink(request.latitude, request.longitude)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on map<span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          'Not provided'
        )}
      </Fact>
      <Fact icon="bx-calendar" term="Submitted">
        <time dateTime={request.createdAt}>{formatDateTime(request.createdAt)}</time>
      </Fact>
      <Fact icon="bx-check-circle" term="Resolved">
        {request.resolvedAt ? (
          <time dateTime={request.resolvedAt}>{formatDateTime(request.resolvedAt)}</time>
        ) : (
          'Not yet'
        )}
      </Fact>
      {request.citizen && (
        <Fact icon="bx-user" term="Reported by">
          {request.citizen.fullName}
          {request.citizen.phone && (
            <>
              {' '}
              &middot; <a href={`tel:${request.citizen.phone}`}>{request.citizen.phone}</a>
            </>
          )}
        </Fact>
      )}
      <Fact icon="bx-detail" term="Description" wide>
        {request.description}
      </Fact>
    </dl>
  );
}

/** Private image served through a short-lived signed URL. */
export function RequestImage({ url, reference }: { url: string; reference: string }) {
  return (
    <a className="request-image__link" href={url} target="_blank" rel="noopener noreferrer">
      <img
        className="request-image"
        src={url}
        alt={`Evidence attached to request ${reference}`}
        loading="lazy"
      />
      <span className="sr-only">(opens full size in a new tab)</span>
    </a>
  );
}
