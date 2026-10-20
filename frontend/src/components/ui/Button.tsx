import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import '../../styles/components/button.css';
import { cx } from '../../utils/cx';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: string;
}

function buttonClass(
  { variant = 'primary', size = 'md', block }: StyleProps,
  iconOnly: boolean,
  extra?: string,
) {
  return cx(
    'button',
    `button--${variant}`,
    size !== 'md' && `button--${size}`,
    block && 'button--block',
    iconOnly && 'button--icon',
    extra,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  StyleProps & {
    loading?: boolean;
    children?: ReactNode;
  };

export function Button({
  variant,
  size,
  block,
  icon,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconOnly = !children;
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block }, iconOnly, className)}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="button__spinner" aria-hidden="true" />
      ) : (
        icon && <Icon name={icon} className="button__icon" />
      )}
      {children}
    </button>
  );
}

type ButtonLinkProps = LinkProps & StyleProps;

/** Navigation that looks like a button (keeps link semantics for a11y). */
export function ButtonLink({
  variant,
  size,
  block,
  icon,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, size, block }, !children, className)} {...rest}>
      {icon && <Icon name={icon} className="button__icon" />}
      {children}
    </Link>
  );
}
