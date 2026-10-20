import '../../styles/components/skeleton.css';
import { cx } from '../../utils/cx';

type Variant = 'text' | 'title' | 'short' | 'block' | 'chart';

export function Skeleton({ variant = 'text' }: { variant?: Variant }) {
  return (
    <span
      className={cx(
        'skeleton',
        variant === 'short' ? 'skeleton--text skeleton--short' : `skeleton--${variant}`,
      )}
    />
  );
}

/** Placeholder list announced once to assistive tech as "Loading". */
export function SkeletonList({ count = 3, label = 'Loading' }: { count?: number; label?: string }) {
  return (
    <div className="skeleton-stack" role="status" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} variant="block" />
      ))}
    </div>
  );
}
