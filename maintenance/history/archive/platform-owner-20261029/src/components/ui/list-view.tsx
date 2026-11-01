'use client';
import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from '@/components/ui/app-link';
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, RefreshCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import { operationFor, resolve } from '@/lib/api/contract';
import { ApiError, isRecord } from '@/lib/api/errors';
import { number } from '@/lib/formatting';
import { Value } from './data-view';
import { Button } from './button';
import { DataTable } from './data-table';
import { LoadingSkeleton, ErrorState, UpdatedAt, label } from './states';
import { Dialog, DialogContent } from './dialog';
import { EntityPicker, referenceKind } from './entity-picker';
export type Row = Record<string, unknown>;
export type ListColumn = {
  key: string;
  title: string;
  link?: (row: Row) => string;
  sub?: string;
  render?: (row: Row) => React.ReactNode;
};
export function nested(row: Row, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>((value, part) => (isRecord(value) ? value[part] : undefined), row);
}
export function ListView({
  endpoint,
  columns,
  title,
  fixed = {},
  statusEnum,
  actions,
}: {
  endpoint: string;
  columns: ListColumn[];
  title?: string;
  fixed?: Record<string, string>;
  statusEnum?: string;
  actions?: (row: Row) => React.ReactNode;
}) {
  const { can } = useAccess();
  const router = useRouter(),
    pathname = usePathname(),
    search = useSearchParams();
  const [expanded, setExpanded] = useState(false);
  const operation = operationFor('GET', endpoint);
  const queryNames = operation?.parameters.filter((p) => p.in === 'query').map((p) => p.name) ?? [];
  const params = new URLSearchParams();
  for (const key of queryNames) {
    const value = fixed[key] ?? search.get(key);
    if (value) params.set(key, value);
  }
  if (queryNames.includes('page') && !params.has('page')) params.set('page', '1');
  if (queryNames.includes('pageNumber') && !params.has('pageNumber')) params.set('pageNumber', '1');
  if (queryNames.includes('pageSize') && !params.has('pageSize')) params.set('pageSize', '20');
  if (queryNames.includes('PageNumber') && !params.has('PageNumber')) params.set('PageNumber', '1');
  if (queryNames.includes('PageSize') && !params.has('PageSize')) params.set('PageSize', '20');
  const query = useApi<unknown>(endpoint + (params.size ? '?' + params : ''));
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in values) && !('pageNumber' in values) && !('PageNumber' in values)) {
      next.delete('page');
      next.delete('pageNumber');
      next.delete('PageNumber');
    }
    router.push(pathname + (next.size ? '?' + next : ''), { scroll: false });
  }
  const result = query.data;
  const pageData = isRecord(result) ? result : null;
  const items = Array.isArray(result)
    ? result
    : pageData && Array.isArray(pageData.items)
      ? pageData.items
      : [];
  const rows = items.filter(isRecord);
  const total =
    pageData && typeof pageData.totalCount === 'number' ? pageData.totalCount : undefined;
  const pageName = queryNames.includes('PageNumber')
    ? 'PageNumber'
    : queryNames.includes('pageNumber')
      ? 'pageNumber'
      : 'page';
  const sizeName = queryNames.includes('PageSize') ? 'PageSize' : 'pageSize';
  const page = Math.max(1, Number(params.get(pageName) ?? 1) || 1);
  const size = Math.max(1, Number(params.get(sizeName) ?? 20) || 20);
  const defs = useMemo<ColumnDef<Row>[]>(
    () => [
      ...columns.map(
        (column): ColumnDef<Row> => ({
          id: column.key,
          header: column.title,
          cell: ({ row }) => {
            const v = nested(row.original, column.key);
            if (column.render) return column.render(row.original);
            return column.link ? (
              <Link className="table-link" href={column.link(row.original)}>
                <span className="table-initial" aria-hidden="true">
                  {typeof v === 'string' ? v.slice(0, 1) : 'م'}
                </span>
                <span>
                  <Value value={v} name={column.key} />
                  {column.sub && (
                    <span className="cell-sub">
                      <Value value={nested(row.original, column.sub)} name={column.sub} />
                    </span>
                  )}
                </span>
              </Link>
            ) : (
              <Value value={v} name={column.key} />
            );
          },
        }),
      ),
      ...(actions
        ? [
            {
              id: 'actions',
              header: 'عملیات',
              cell: ({ row }: { row: { original: Row } }) => (
                <div className="row-actions">{actions(row.original)}</div>
              ),
            },
          ]
        : []),
    ],
    [columns, actions],
  );
  if (!can(endpoint))
    return <ErrorState error={new ApiError(403, { code: 'PERMISSION_MAPPING_UNVERIFIED' })} />;
  const statusValues = statusEnum
    ? (resolve({ $ref: '#/components/schemas/' + statusEnum }).enum ?? [])
    : [];
  const extraNames = queryNames.filter(
    (k) =>
      ![
        'page',
        'pageNumber',
        'pageSize',
        'PageNumber',
        'PageSize',
        'search',
        'sortBy',
        'sortDirection',
        'status',
      ].includes(k) && !(k in fixed),
  );
  return (
    <>
      <div className="panel">
        {title && (
          <div className="panel-heading">
            <h2>{title}</h2>
            <Button
              size="icon"
              variant="ghost"
              aria-label="به‌روزرسانی فهرست"
              onClick={() => void query.refetch()}
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        )}
        <form
          key={search.toString()}
          className="filter-bar"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const values: Record<string, string> = {};
            for (const [key, value] of data) if (typeof value === 'string') values[key] = value;
            update(values);
          }}
        >
          {queryNames.includes('search') && (
            <div className="search-input">
              <Search size={17} />
              <input
                name="search"
                aria-label="جست‌وجو"
                defaultValue={search.get('search') ?? ''}
                placeholder="جست‌وجو در فهرست…"
              />
            </div>
          )}
          {queryNames.includes('status') && (
            <select name="status" aria-label="وضعیت" defaultValue={search.get('status') ?? ''}>
              <option value="">همه وضعیت‌ها</option>
              {statusValues.map((v) => (
                <option key={v} value={v}>
                  {label(v)}
                </option>
              ))}
            </select>
          )}
          {queryNames.includes('sortDirection') && (
            <select
              name="sortDirection"
              aria-label="ترتیب زمانی"
              defaultValue={search.get('sortDirection') ?? 'desc'}
            >
              <option value="desc">جدیدترین ابتدا</option>
              <option value="asc">قدیمی‌ترین ابتدا</option>
            </select>
          )}
          {(extraNames.length > 0 || queryNames.includes('status')) && (
            <Button
              className="filters-mobile-trigger"
              type="button"
              variant="outline"
              aria-label="نمایش فیلترهای بیشتر"
              onClick={() => setExpanded(true)}
            >
              <SlidersHorizontal size={16} />
            </Button>
          )}
          {(queryNames.includes('search') ||
            queryNames.includes('status') ||
            extraNames.length > 0) && (
            <Button type="submit" variant="outline" size="sm">
              اعمال فیلتر
            </Button>
          )}
          {params.size > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = new URLSearchParams();
                const tab = search.get('tab');
                if (tab) next.set('tab', tab);
                router.push(pathname + (next.size ? '?' + next : ''));
              }}
            >
              پاک کردن
            </Button>
          )}
          {extraNames.length > 0 && (
            <div className="filters-extra">
              {extraNames.map((key) => {
                const definition = operation?.parameters.find((p) => p.name === key);
                const kind = endpoint.startsWith('/api/admin/') ? referenceKind(key) : undefined;
                if (kind)
                  return (
                    <ReferenceFilter
                      key={key}
                      kind={kind}
                      name={key}
                      title={filterLabels[key] ?? key}
                      initial={search.get(key) ?? ''}
                    />
                  );
                return (
                  <label key={key}>
                    {filterLabels[key] ?? key}
                    {definition?.schema.type === 'boolean' ? (
                      <select name={key} defaultValue={search.get(key) ?? ''}>
                        <option value="">همه</option>
                        <option value="true">بله</option>
                        <option value="false">خیر</option>
                      </select>
                    ) : (
                      <input
                        name={key}
                        defaultValue={search.get(key) ?? ''}
                        type={definition?.schema.type === 'integer' ? 'number' : 'text'}
                        placeholder={
                          definition?.schema.format === 'date-time'
                            ? '2026-10-18T00:00:00Z'
                            : undefined
                        }
                        dir={/Id|Utc/.test(key) ? 'ltr' : undefined}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </form>
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent
            title="فیلترهای فهرست"
            description="فیلترها در نشانی صفحه ذخیره می‌شوند."
            side
          >
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const values: Record<string, string> = {};
                for (const [key, value] of new FormData(e.currentTarget))
                  if (typeof value === 'string') values[key] = value;
                update(values);
                setExpanded(false);
              }}
            >
              {queryNames.includes('status') && (
                <label>
                  وضعیت
                  <select name="status" defaultValue={search.get('status') ?? ''}>
                    <option value="">همه وضعیت‌ها</option>
                    {statusValues.map((v) => (
                      <option key={v} value={v}>
                        {label(v)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {extraNames.map((key) => {
                const field = operation?.parameters.find((p) => p.name === key);
                const kind = endpoint.startsWith('/api/admin/') ? referenceKind(key) : undefined;
                if (kind)
                  return (
                    <ReferenceFilter
                      key={key}
                      kind={kind}
                      name={key}
                      title={filterLabels[key] ?? key}
                      initial={search.get(key) ?? ''}
                    />
                  );
                return (
                  <label key={key}>
                    {filterLabels[key] ?? key}
                    {field?.schema.type === 'boolean' ? (
                      <select name={key} defaultValue={search.get(key) ?? ''}>
                        <option value="">همه</option>
                        <option value="true">بله</option>
                        <option value="false">خیر</option>
                      </select>
                    ) : (
                      <input
                        name={key}
                        defaultValue={search.get(key) ?? ''}
                        dir={/Id|Utc/.test(key) ? 'ltr' : undefined}
                        placeholder={
                          field?.schema.format === 'date-time' ? '2026-10-18T00:00:00Z' : undefined
                        }
                      />
                    )}
                  </label>
                );
              })}
              <Button type="submit">اعمال فیلتر</Button>
            </form>
          </DialogContent>
        </Dialog>
        {query.isPending ? (
          <LoadingSkeleton />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <DataTable data={rows} columns={defs} />
        )}
        <div className="pagination">
          <span>
            {query.isPending || query.isError
              ? '—'
              : total === undefined
                ? `${number(rows.length)} مورد در این پاسخ`
                : `${number(total)} مورد در مجموع`}
          </span>
          {total !== undefined && (
            <div className="pagination-controls">
              <select
                aria-label="تعداد در صفحه"
                value={size}
                onChange={(e) => update({ [sizeName]: e.target.value })}
              >
                {[10, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>
                    {number(n)} در صفحه
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="icon"
                aria-label="صفحه قبل"
                disabled={page <= 1 || query.isFetching}
                onClick={() => update({ [pageName]: String(page - 1) })}
              >
                <ChevronRight size={16} />
              </Button>
              <span>
                صفحه {number(page)} از {number(Math.max(1, Math.ceil(total / size)))}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="صفحه بعد"
                disabled={page * size >= total || query.isFetching}
                onClick={() => update({ [pageName]: String(page + 1) })}
              >
                <ChevronLeft size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="list-foot">
        <UpdatedAt at={query.dataUpdatedAt} />
        {query.isFetching && !query.isPending && (
          <span className="updated" role="status">
            در حال به‌روزرسانی…
          </span>
        )}
      </div>
    </>
  );
}
function ReferenceFilter({
  kind,
  name,
  title,
  initial,
}: {
  kind: NonNullable<ReturnType<typeof referenceKind>>;
  name: string;
  title: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <span className="field-title">{title.replace('شناسه ', '')}</span>
      <EntityPicker
        kind={kind}
        title={title.replace('شناسه ', '')}
        name={name}
        value={value || null}
        onChange={(c) => setValue(c?.value ?? '')}
      />
    </div>
  );
}
const filterLabels: Record<string, string> = {
  organizationId: 'شناسه سازمان',
  classId: 'شناسه کلاس',
  activeOnly: 'فقط فعال‌ها',
  userId: 'شناسه حساب',
  roleKey: 'کلید نقش',
  priority: 'اولویت',
  actorUserId: 'شناسه عامل',
  action: 'اقدام',
  targetType: 'نوع منبع',
  targetId: 'شناسه منبع',
  result: 'نتیجه',
  fromUtc: 'از زمان UTC',
  toUtc: 'تا زمان UTC',
  type: 'نوع',
  scope: 'محدوده',
  visibility: 'نمایانی',
  personId: 'شناسه شخص',
  isAccountLinked: 'اتصال حساب',
  from: 'شروع بازه UTC',
  to: 'پایان بازه UTC',
  academicPeriodId: 'شناسه دوره',
  teacherMembershipId: 'شناسه عضویت معلم',
  learnerOrganizationPersonId: 'شناسه پرونده فراگیر',
};
