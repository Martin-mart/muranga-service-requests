import type { ReactNode } from 'react';
import '../../styles/components/badge.css';
import type { RequestStatus } from '../../types/api';
import { cx } from '../../utils/cx';
import { STATUS_META } from '../../utils/status';
import { Icon } from './Icon';

interface BadgeProps {
  tone?: 'neutral' | 'count';
  icon?: string;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', icon, className, children }: BadgeProps) {
  return (
    <span className={cx('badge', `badge--${tone}`, className)}>
      {icon && <Icon name={icon} className="badge__icon" />}
      {children}
    </span>
  );
}

/** Status is conveyed by text AND icon, never by colour alone (WCAG 1.4.1). */
export function StatusBadge({ status }: { status: RequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cx('badge', `badge--${meta.modifier}`)}>
      <Icon name={meta.icon} className="badge__icon" />
      {meta.label}
    </span>
  );
}
