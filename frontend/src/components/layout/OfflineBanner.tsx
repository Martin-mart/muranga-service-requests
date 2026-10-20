import '../../styles/layout/banners.css';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Icon } from '../ui/Icon';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="banner banner--offline" role="status">
      <Icon name="bx-wifi-off" className="banner__icon" />
      You are offline. Showing saved data; new requests will be sent when you reconnect.
    </div>
  );
}
