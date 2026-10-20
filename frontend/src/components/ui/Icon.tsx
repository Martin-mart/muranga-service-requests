import { cx } from '../../utils/cx';

interface IconProps {
  /** Boxicons class, e.g. "bx-bulb" or "bxs-check-circle". */
  name: string;
  className?: string;
}

/** Decorative Boxicons glyph. Always pair with visible text or an aria-label on the parent. */
export function Icon({ name, className }: IconProps) {
  return <i className={cx('bx', name, className)} aria-hidden="true" />;
}
