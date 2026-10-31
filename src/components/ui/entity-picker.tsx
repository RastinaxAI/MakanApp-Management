'use client';
import { useEffect, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import { operationFor } from '@/lib/api/contract';
import { isRecord } from '@/lib/api/errors';
import { number } from '@/lib/formatting';
import { Button } from './button';
import { ErrorState, label } from './states';

export type ReferenceKind = 'user' | 'organization' | 'class' | 'role' | 'plan';
export type Choice = { value: string; label: string; description?: string };
const references = {
  user: ['/api/admin/v1/users', 'userId', 'displayName', 'maskedPhone', 'کاربر'],
  organization: ['/api/admin/v1/organizations', 'id', 'name', 'status', 'سازمان'],
  class: ['/api/admin/v1/education/classes', 'classId', 'title', 'courseTitle', 'کلاس'],
  role: ['/api/admin/v1/roles', 'key', 'displayName', 'key', 'نقش'],
  plan: ['/api/admin/v1/commerce/plans', 'planId', 'displayName', 'code', 'پلن'],
} as const;

export function referenceKind(field: string): ReferenceKind | undefined {
  if (['userId', 'initialManagerUserId', 'actorUserId'].includes(field)) return 'user';
  if (field === 'organizationId') return 'organization';
  if (field === 'classId') return 'class';
  if (field === 'roleKey') return 'role';
  return undefined;
}

export function EntityPicker({
  kind,
  value,
  onChange,
  title,
  name,
  nullable = true,
  initialChoice,
}: {
  kind: ReferenceKind;
  value: string | null;
  onChange: (choice: Choice | null) => void;
  title: string;
  name?: string;
  nullable?: boolean;
  initialChoice?: Choice;
}) {
  const { can } = useAccess();
  const [endpoint, id, display, sub, noun] = references[kind];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<Choice | undefined>(initialChoice);
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);
  const names = operationFor('GET', endpoint)?.parameters.map((p) => p.name) ?? [];
  const params = new URLSearchParams();
  if (names.includes('search') && term) params.set('search', term);
  if (names.includes('page')) params.set('page', String(page));
  if (names.includes('pageSize')) params.set('pageSize', '10');
  const q = useApi<unknown>(
    endpoint + (params.size ? '?' + params : ''),
    open || (kind === 'role' && !!value && chosen?.value !== value),
  );
  const detail = useApi<unknown>(
    endpoint + '/' + (value ?? ''),
    kind !== 'role' && !!value && chosen?.value !== value,
  );
  const data = q.data;
  const rows = (
    Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.items) ? data.items : []
  ).filter(isRecord);
  const choices = rows.map((row) => ({
    value: String(row[id]),
    label: String(row[display]),
    description: typeof row[sub] === 'string' ? label(String(row[sub])) : undefined,
  }));
  const detailRow =
    kind === 'class' && isRecord(detail.data) && isRecord(detail.data.class)
      ? detail.data.class
      : detail.data;
  const selectedLabel =
    chosen?.value === value
      ? chosen.label
      : (choices.find((c) => c.value === value)?.label ??
        (isRecord(detailRow) && typeof detailRow[display] === 'string'
          ? String(detailRow[display])
          : 'مورد انتخاب‌شده؛ برای تغییر باز کنید'));
  const filtered = names.includes('search')
    ? choices
    : choices.filter((c) =>
        `${c.label} ${c.description ?? ''}`.toLowerCase().includes(term.toLowerCase()),
      );
  const total =
    isRecord(data) && typeof data.totalCount === 'number' ? data.totalCount : choices.length;
  return (
    <div className="entity-picker">
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      <button
        type="button"
        className="entity-trigger"
        aria-label={title}
        aria-expanded={open}
        disabled={!can(endpoint)}
        onClick={() => setOpen(!open)}
      >
        <span>{value ? selectedLabel : `انتخاب ${noun}`}</span>
        <ChevronDown size={16} />
      </button>
      {!can(endpoint) && (
        <p className="field-help">مجوز مشاهده فهرست {noun} در این حساب وجود ندارد.</p>
      )}
      {open && (
        <div className="entity-options">
          <div className="entity-search">
            <Search size={16} />
            <input
              aria-label={`جست‌وجوی ${noun}`}
              placeholder={`جست‌وجوی ${noun}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {q.isPending ? (
            <p role="status">در حال دریافت…</p>
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => void q.refetch()} />
          ) : (
            <>
              {nullable && (
                <button
                  type="button"
                  className="entity-option"
                  onClick={() => {
                    setChosen(undefined);
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  بدون انتخاب
                </button>
              )}
              {filtered.map((c) => (
                <button
                  type="button"
                  className="entity-option"
                  key={c.value}
                  onClick={() => {
                    setChosen(c);
                    onChange(c);
                    setOpen(false);
                  }}
                >
                  <span>
                    <strong>{c.label}</strong>
                    {c.description && <small>{c.description}</small>}
                  </span>
                  {value === c.value && <Check size={16} />}
                </button>
              ))}
              {!filtered.length && (
                <p className="field-help">موردی پیدا نشد. عبارت جست‌وجو را تغییر دهید.</p>
              )}
              {names.includes('page') && (
                <div className="entity-pagination">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={page === 1 || q.isFetching}
                    onClick={() => setPage(page - 1)}
                  >
                    قبلی
                  </Button>
                  <small>
                    صفحه {number(page)} · {number(total)} مورد
                  </small>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={page * 10 >= total || q.isFetching}
                    onClick={() => setPage(page + 1)}
                  >
                    بعدی
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function PlanVersionPicker({
  value,
  onChange,
  title = 'نسخه پلن',
  nullable = true,
  audience,
}: {
  value: string | null;
  onChange: (choice: Choice | null) => void;
  title?: string;
  nullable?: boolean;
  audience?: 'Individual' | 'Organization';
}) {
  const [plan, setPlan] = useState<Choice | null>(null);
  const { can } = useAccess();
  const path = '/api/admin/v1/commerce/plans/' + (plan?.value ?? '');
  const q = useApi<unknown>(path, !!plan);
  const rows =
    isRecord(q.data) && Array.isArray(q.data.versions) ? q.data.versions.filter(isRecord) : [];
  const matchesAudience = !audience || (isRecord(q.data) && q.data.audience === audience);
  return (
    <div className="plan-picker">
      <EntityPicker
        kind="plan"
        title="انتخاب پلن"
        value={plan?.value ?? null}
        onChange={(c) => {
          setPlan(c);
          onChange(null);
        }}
      />
      {plan && !can(path) && <p className="field-help">مجوز مشاهده نسخه‌های این پلن وجود ندارد.</p>}
      {plan &&
        can(path) &&
        (q.isPending ? (
          <p role="status">در حال دریافت نسخه‌ها…</p>
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : (
          <>
            <select
              aria-label={title}
              value={value ?? ''}
              onChange={(e) => {
                const row = rows.find((r) => r.planVersionId === e.target.value);
                onChange(
                  row
                    ? {
                        value: String(row.planVersionId),
                        label: `${plan.label} · نسخه ${number(Number(row.versionNumber))}`,
                      }
                    : null,
                );
              }}
            >
              <option value="">{nullable ? 'بدون انتخاب نسخه' : 'نسخه را انتخاب کنید'}</option>
              {rows
                .filter(() => matchesAudience)
                .filter((r) => r.status === 'Published')
                .map((r) => (
                  <option key={String(r.planVersionId)} value={String(r.planVersionId)}>
                    نسخه {number(Number(r.versionNumber))} · منتشرشده
                  </option>
                ))}
            </select>
            {audience && !matchesAudience && (
              <p className="field-error">
                مخاطب این پلن با قرارداد {label(audience)} مطابقت ندارد؛ پلن دیگری انتخاب کنید.
              </p>
            )}
            {!rows.some((r) => r.status === 'Published') && (
              <p className="field-help">این پلن نسخه منتشرشده‌ای ندارد.</p>
            )}
            {isRecord(q.data) && q.data.versionsTruncated === true && (
              <p className="field-help">سرور فقط بخشی از نسخه‌ها را برگردانده است.</p>
            )}
          </>
        ))}
      {value && !plan && (
        <p className="field-help">نسخه فعلی حفظ شده است؛ برای تغییر، پلن را انتخاب کنید.</p>
      )}
    </div>
  );
}
