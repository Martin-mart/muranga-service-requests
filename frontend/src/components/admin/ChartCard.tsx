import type { ReactNode } from 'react';
import '../../styles/components/card.css';
import '../../styles/components/chart.css';
import { cx } from '../../utils/cx';
import { Table, type Column } from '../ui/Table';

export interface LegendEntry {
  label: string;
  swatch: 1 | 2;
  line?: boolean;
}

interface ChartCardProps<T> {
  title: string;
  subtitle: string;
  legend?: LegendEntry[];
  tall?: boolean;
  wide?: boolean;
  /** Same data as an accessible table (also the fallback for colour-blind and print readers). */
  table: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string };
  children: ReactNode;
}

export function ChartCard<T>({
  title,
  subtitle,
  legend,
  tall,
  wide,
  table,
  children,
}: ChartCardProps<T>) {
  return (
    <figure className={cx('card', 'chart-card', wide && 'dashboard-charts__wide')}>
      <figcaption className="chart-card__header">
        <h2 className="chart-card__title">{title}</h2>
        <p className="chart-card__subtitle">{subtitle}</p>
      </figcaption>
      {legend && legend.length > 1 && (
        <ul className="chart-legend" aria-label="Legend">
          {legend.map((entry) => (
            <li key={entry.label} className="chart-legend__item">
              <span
                className={cx(
                  'chart-legend__swatch',
                  `chart-legend__swatch--${entry.swatch}`,
                  entry.line && 'chart-legend__swatch--line',
                )}
                aria-hidden="true"
              />
              {entry.label}
            </li>
          ))}
        </ul>
      )}
      {/* The SVG is decorative for screen readers; the table below carries the data. */}
      <div className={cx('chart-card__plot', tall && 'chart-card__plot--tall')} aria-hidden="true">
        {children}
      </div>
      <details className="chart-table">
        <summary className="chart-table__summary">Show data as a table</summary>
        <Table caption={title} columns={table.columns} rows={table.rows} rowKey={table.rowKey} />
      </details>
    </figure>
  );
}
