import '../../styles/components/timeline.css';
import type { RequestStatus, StatusHistoryEntry } from '../../types/api';
import { cx } from '../../utils/cx';
import { formatDateTime } from '../../utils/format';
import { STATUS_META, STATUS_ORDER } from '../../utils/status';
import { Icon } from '../ui/Icon';

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
  currentStatus: RequestStatus;
  /** Admins see officer names; citizens see "County officer". */
  showActorNames?: boolean;
}

function actorLabel(entry: StatusHistoryEntry, showActorNames: boolean): string {
  if (entry.actorRole === 'citizen')
    return showActorNames ? 'Submitted by the citizen' : 'You submitted this request';
  return showActorNames && entry.actorName
    ? `Updated by ${entry.actorName}`
    : 'Updated by a county officer';
}

/**
 * Full audit trail (who/what/when, with officer notes) followed by the
 * remaining steps, so citizens can see where their request is heading.
 */
export function StatusTimeline({
  history,
  currentStatus,
  showActorNames = false,
}: StatusTimelineProps) {
  const upcoming = STATUS_ORDER.slice(STATUS_ORDER.indexOf(currentStatus) + 1);

  return (
    <ol className="timeline">
      {history.map((entry) => {
        const meta = STATUS_META[entry.toStatus];
        return (
          <li key={entry.id} className="timeline__item">
            <span className={cx('timeline__marker', `timeline__marker--${meta.modifier}`)}>
              <Icon name={meta.icon} />
            </span>
            <div>
              <p className="timeline__title">
                {entry.fromStatus === null ? 'Request received' : meta.label}
              </p>
              <p className="timeline__meta">
                <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time> &middot;{' '}
                {actorLabel(entry, showActorNames)}
              </p>
              {entry.note && (
                <p className="timeline__note">
                  <span className="sr-only">Officer note: </span>
                  {entry.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
      {upcoming.map((status) => (
        <li key={status} className="timeline__item">
          <span className="timeline__marker timeline__marker--upcoming">
            <Icon name={STATUS_META[status].icon} />
          </span>
          <div>
            <p className="timeline__title">{STATUS_META[status].label}</p>
            <p className="timeline__meta">Not yet</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
