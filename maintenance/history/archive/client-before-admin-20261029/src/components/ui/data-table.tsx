'use client';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { useSyncExternalStore } from 'react';
import { EmptyState } from './states';
const mobileQuery = '(max-width: 640px)';
function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
const mobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const serverSnapshot = () => false;
export function DataTable<T>({ data, columns }: { data: T[]; columns: ColumnDef<T>[] }) {
  const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, serverSnapshot);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });
  if (!data.length) return <EmptyState />;
  if (mobile)
    return (
      <div className="data-cards" role="list" aria-label="داده‌های فهرست">
        {table.getRowModel().rows.map((row) => (
          <div key={row.id} className="data-card" role="listitem">
            <dl>
              {row.getVisibleCells().map((cell, index) => {
                const header = table.getFlatHeaders().find((h) => h.column.id === cell.column.id)!;
                return (
                  <div
                    key={cell.id}
                    className="data-card-field"
                    data-primary={index === 0 || undefined}
                  >
                    <dt>{flexRender(cell.column.columnDef.header, header.getContext())}</dt>
                    <dd>{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </div>
    );
  return (
    <div className="table-scroll" role="region" aria-label="جدول داده‌ها" tabIndex={0}>
      <table className="data-table">
        <thead>
          {table.getHeaderGroups().map((g) => (
            <tr key={g.id}>
              {g.headers.map((h) => (
                <th key={h.id} scope="col">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id}>
              {r.getVisibleCells().map((c) => (
                <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
