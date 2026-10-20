import type { ReactNode } from 'react';
import '../../styles/components/alert.css';
import { Icon } from './Icon';

type Tone = 'error' | 'success' | 'info' | 'warning';

const ICONS: Record<Tone, string> = {
  error: 'bx-error-circle',
  success: 'bx-check-circle',
  info: 'bx-info-circle',
  warning: 'bx-error',
};

interface AlertProps {
  tone: Tone;
  title?: string;
  children?: ReactNode;
}

export function Alert({ tone, title, children }: AlertProps) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={ICONS[tone]} className="alert__icon" />
      <div>
        {title && <p className="alert__title">{title}</p>}
        {children}
      </div>
    </div>
  );
}
