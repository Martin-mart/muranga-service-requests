import './styles/tokens.css';
import './styles/base.css';
import './styles/icons.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigErrorScreen } from './components/layout/ConfigErrorScreen';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}
const root = createRoot(container);

// The app module validates its configuration on import; a missing variable
// shows a clear screen instead of a blank page.
try {
  const { App } = await import('./App');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error(error);
  root.render(<ConfigErrorScreen />);
}
