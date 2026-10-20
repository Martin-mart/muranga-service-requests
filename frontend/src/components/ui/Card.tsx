import type { HTMLAttributes, ReactNode } from 'react';
import '../../styles/components/card.css';
import { cx } from '../../utils/cx';

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: 'section' | 'article' | 'div';
  padded?: boolean;
  interactive?: boolean;
  title?: ReactNode;
  titleId?: string;
  actions?: ReactNode;
}

export function Card({
  as: Tag = 'section',
  padded = false,
  interactive = false,
  title,
  titleId,
  actions,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cx(
        'card',
        padded && 'card--padded',
        interactive && 'card--interactive',
        className,
      )}
      aria-labelledby={title ? titleId : undefined}
      {...rest}
    >
      {title && (
        <header className="card__header">
          <h2 className="card__title" id={titleId}>
            {title}
          </h2>
          {actions}
        </header>
      )}
      {title ? <div className="card__body">{children}</div> : children}
    </Tag>
  );
}
