import '../../styles/components/stat-card.css';
import { cx } from '../../utils/cx';
import { Icon } from '../ui/Icon';

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  hint?: string;
  tone?: 'pending' | 'in-progress' | 'resolved';
}

/** A headline number is a stat tile, not a chart. */
export function StatCard({ label, value, icon, hint, tone }: StatCardProps) {
  return (
    <div className={cx('stat-card', tone && `stat-card--${tone}`)}>
      <dt className="stat-card__label">
        <Icon name={icon} className="stat-card__icon" />
        {label}
      </dt>
      <dd className="stat-card__value">{value}</dd>
      {hint && <dd className="stat-card__hint">{hint}</dd>}
    </div>
  );
}
