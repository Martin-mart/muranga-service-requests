import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import '../../styles/components/toast.css';
import { Button } from './Button';
import { Icon } from './Icon';
import { ToastContext, type ToastInput } from './toast-context';

interface ToastItem extends ToastInput {
  id: number;
}

const ICONS = { success: 'bx-check-circle', error: 'bx-error-circle', info: 'bx-bell' } as const;
const AUTO_DISMISS_MS = 6000;

/**
 * Two live regions: errors are assertive (interrupt), everything else is
 * polite, so screen-reader users hear outcomes without losing their place.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (toast: ToastInput) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      window.setTimeout(() => {
        dismiss(id);
      }, AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  const render = (tone: 'polite' | 'assertive') =>
    toasts
      .filter((toast) => (toast.tone === 'error') === (tone === 'assertive'))
      .map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <Icon name={ICONS[toast.tone]} className="toast__icon" />
          <div className="toast__content">
            <p className="toast__title">{toast.title}</p>
            {toast.message && <p>{toast.message}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon="bx-x"
            aria-label="Dismiss notification"
            onClick={() => {
              dismiss(toast.id);
            }}
          />
        </div>
      ));

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region">
        <div aria-live="polite" role="status">
          {render('polite')}
        </div>
        <div aria-live="assertive" role="alert">
          {render('assertive')}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
