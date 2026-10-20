import { Link } from 'react-router';
import '../../styles/layout/banners.css';
import '../../styles/components/button.css';
import '../../styles/components/badge.css';
import { useNotifications, useRealtimeNotifications } from '../../hooks/useNotifications';
import { Icon } from '../ui/Icon';

/** Header bell with unread count; also owns the Realtime subscription. */
export function NotificationBell({ userId }: { userId: string }) {
  useRealtimeNotifications(userId);
  const { data } = useNotifications();
  const unread = data?.pages[0]?.unreadCount ?? 0;
  const label = unread > 0 ? `Updates, ${unread} unread` : 'Updates';

  return (
    <Link
      to="/notifications"
      className="button button--ghost button--icon notification-bell"
      aria-label={label}
      title={label}
    >
      <Icon name={unread > 0 ? 'bxs-bell-ring' : 'bx-bell'} className="button__icon" />
      {unread > 0 && (
        <span className="badge badge--count notification-bell__count" aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
