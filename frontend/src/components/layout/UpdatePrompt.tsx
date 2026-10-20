import { useRegisterSW } from 'virtual:pwa-register/react';
import '../../styles/layout/banners.css';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/**
 * registerType "prompt": a new version never replaces the running one
 * mid-task (e.g. while a citizen is filling in a form); the user chooses when.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="banner banner--update" role="status">
      <Icon name="bx-refresh" className="banner__icon" />A new version of the app is available.
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        Update now
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setNeedRefresh(false);
        }}
      >
        Later
      </Button>
    </div>
  );
}
