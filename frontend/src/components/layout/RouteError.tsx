import { isRouteErrorResponse, useRouteError } from 'react-router';
import '../../styles/layout/app-shell.css';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

/**
 * Last-resort boundary (e.g. a lazy chunk failed to load after a deploy).
 * Never renders error internals to the user.
 */
export function RouteError() {
  const error = useRouteError();
  console.error(error);
  const title =
    isRouteErrorResponse(error) && error.status === 404 ? 'Page not found' : 'Something went wrong';
  return (
    <main className="app-shell__main">
      <EmptyState
        tone="error"
        icon="bx-error-alt"
        title={title}
        text="Please reload the page. If the problem continues, try again later."
        action={
          <Button
            icon="bx-refresh"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload
          </Button>
        }
      />
    </main>
  );
}
