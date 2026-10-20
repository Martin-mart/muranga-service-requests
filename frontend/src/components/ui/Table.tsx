import type { ReactNode } from 'react';
import '../../styles/components/table.css';
import { cx } from '../../utils/cx';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  captionVisible?: boolean;
}

export function Table<T>({
  caption,
  columns,
  rows,
  rowKey,
  captionVisible = false,
}: TableProps<T>) {
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className={cx('table__caption', !captionVisible && 'sr-only')}>{caption}</caption>
        <thead className="table__head">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="table__th">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="table__row">
              {columns.map((column) => (
                <td key={column.key} className={cx('table__td', column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
