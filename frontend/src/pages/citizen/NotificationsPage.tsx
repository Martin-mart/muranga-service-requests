import { Link } from 'react-router';
import '../../styles/components/card.css';
import '../../styles/pages/notifications.css';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { LoadMore } from '../../components/ui/LoadMore';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useMarkNotificationRead, useNotifications } from '../../hooks/useNotifications';
import { errorMessage } from '../../services/api-client';
import type { AppNotification } from '../../types/api';
import { cx } from '../../utils/cx';
import { formatDateTime, formatRelative } from '../../utils/format';

function NotificationItem({ item, onOpen }: { item: AppNotification; onOpen: () => void }) {
  const unread = item.readAt === null;
  const content = (
    <>
      <span className="notification__title">
        {unread && <span className="sr-only">Unread: </span>}
        {item.title}
      </span>
    </>
  );
  return (
    <li className={cx('card', 'notification', unread && 'notification--unread')}>
      <Icon
        name={item.type === 'status_changed' ? 'bx-transfer-alt' : 'bx-message-square-dots'}
        className="notification__icon"
      />
      <div>
        {item.requestId ? (
          <Link className="notification__link" to={`/requests/${item.requestId}`} onClick={onOpen}>
            {content}
          </Link>
        ) : (
          content
        )}
        <p className="notification__body">{item.body}</p>
        <time
          className="notification__time"
          dateTime={item.createdAt}
          title={formatDateTime(item.createdAt)}
        >
          {formatRelative(item.createdAt)}
        </time>
      </div>
    </li>
  );
}

export default function NotificationsPage() {
  useDocumentTitle('Updates');
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const unread = query.data?.pages[0]?.unreadCount ?? 0;

  return (
    <div className="stack stack--lg">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Updates</h1>
          <p className="page-header__subtitle">
            {unread > 0
              ? `${unread} unread update${unread === 1 ? '' : 's'}`
              : 'You are all caught up.'}
          </p>
        </div>
      </div>
      {query.isPending ? (
        <SkeletonList label="Loading updates" />
      ) : query.isError ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bx-bell-off"
          title="No updates yet"
          text="You will be notified here when a county officer updates one of your requests."
        />
      ) : (
        <ul className="notification-list" aria-label="Updates">
          {items.map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              onOpen={() => {
                if (item.readAt === null) markRead.mutate(item.id);
              }}
            />
          ))}
        </ul>
      )}
      <LoadMore
        hasMore={query.hasNextPage}
        loading={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
      />
    </div>
  );
}
