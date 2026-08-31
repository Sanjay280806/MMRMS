import { cx } from '../../lib/tone.js';

/**
 * Column-driven table. Columns: { key, header, align, className, render(row, i) }.
 * Wrapped so wide tables scroll inside the card rather than the page.
 */
export function DataTable({ columns, rows, rowKey, empty, onRowClick, className }) {
  if (!rows?.length) return empty ?? null;

  const align = { right: 'text-right', center: 'text-center' };

  return (
    <div className={cx('overflow-x-auto', className)}>
      <table className="w-full min-w-[540px] border-collapse text-left">
        <thead className="table-head">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cx('table-th', align[col.align], col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey ? rowKey(row) : i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'table-row-interactive' : 'table-row'}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cx('table-td', align[col.align], col.className)}
                >
                  {col.render ? col.render(row, i) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
