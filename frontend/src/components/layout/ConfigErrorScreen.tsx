import '../../styles/layout/app-shell.css';
import { EmptyState } from '../ui/EmptyState';

export function ConfigErrorScreen() {
  return (
    <main className="app-shell__main">
      <EmptyState
        tone="error"
        icon="bx-cog"
        title="The app is not configured"
        text="Required settings are missing. If you run this site, check the VITE_ environment variables (see frontend/.env.example)."
      />
    </main>
  );
}
