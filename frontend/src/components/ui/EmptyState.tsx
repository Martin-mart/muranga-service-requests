import type { ReactNode } from 'react';
import '../../styles/components/empty-state.css';
import { cx } from '../../utils/cx';
import { Button } from './Button';
import { Icon } from './Icon';

interface EmptyStateProps {
  icon: string;
  title: string;
  text?: string;
  action?: ReactNode;
  tone?: 'default' | 'error';
}

export function EmptyState({ icon, title, text, action, tone = 'default' }: EmptyStateProps) {
  return (
    <div className={cx('empty-state', tone === 'error' && 'empty-state--error')}>
      <span className="empty-state__icon">
        <Icon name={icon} />
      </span>
      <h2 className="empty-state__title">{title}</h2>
      {text && <p className="empty-state__text">{text}</p>}
      {action}
    </div>
  );
}

/** Standard error state with a retry action for failed queries. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert">
      <EmptyState
        tone="error"
        icon="bx-error-alt"
        title="We could not load this"
        text={message}
        action={
          onRetry && (
            <Button variant="secondary" icon="bx-refresh" onClick={onRetry}>
              Try again
            </Button>
          )
        }
      />
    </div>
  );
}
