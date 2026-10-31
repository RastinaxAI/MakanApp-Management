'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Layers, Search, RefreshCw, ShieldCheck } from 'lucide-react';
import Link from '@/components/ui/app-link';
import { useApi } from '@/lib/api/hooks';
import type { components } from '@/generated/api/schema';
import { useAccess } from '@/features/access-context/provider';
import { number, date } from '@/lib/formatting';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton, UpdatedAt } from '@/components/ui/states';
import s from './atlas-plan-catalog.module.css';

export function AtlasPlanCatalog() {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const search = params.get('search') ?? '';
  const requestedPage = Number(params.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 20;
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) query.set('search', search);
  const endpoint = '/api/admin/v1/commerce/plans';
  const { can } = useAccess();
  const q = useApi<components['schemas']['PlatformPlanPage']>(endpoint + '?' + query);
  function navigate(nextSearch: string, nextPage = 1) {
    const next = new URLSearchParams(params);
    next.set('tab', 'plans');
    next.set('page', String(nextPage));
    if (nextSearch) next.set('search', nextSearch);
    else next.delete('search');
    router.push(pathname + '?' + next, { scroll: false });
  }
  if (!can(endpoint)) return <ErrorState error={new ApiError(403)} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const data = q.data;
  return (
    <div className={s.catalogPage}>
      <div className={s.summary} aria-label="خلاصهٔ کاتالوگ">
        <div>
          <Layers size={22} />
          <p>
            پلن‌های نتیجهٔ جستجو<strong>{data ? number(data.totalCount) : '—'}</strong>
          </p>
        </div>
        <div>
          <p>
            در این صفحه
            <strong>
              {data ? number(data.items.length) : '—'} <small>پلن</small>
            </strong>
          </p>
        </div>
        <div>
          <p>
            صفحهٔ جاری<strong>{number(page)}</strong>
          </p>
        </div>
      </div>
      <section className={s.catalog} aria-label="کاتالوگ پلن‌ها">
        <header className={s.header}>
          <div>
            <h2>کاتالوگ پلن‌ها</h2>
            <p>هر پلن، نسخه‌ها و شرایط مستقل خود را دارد.</p>
          </div>
          <form
            className={s.search}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(draft.trim());
            }}
          >
            <Search size={18} />
            <input
              aria-label="جستجوی نام یا کد پلن"
              placeholder="نام یا کد پلن…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button size="sm" type="submit" variant="ghost">
              جستجو
            </Button>
          </form>
          <Button
            size="icon"
            variant="ghost"
            aria-label="تازه‌سازی پلن‌ها"
            disabled={q.isFetching}
            onClick={() => void q.refetch()}
          >
            <RefreshCw size={18} />
          </Button>
        </header>
        {q.isPending ? (
          <LoadingSkeleton />
        ) : !data?.items.length ? (
          <>
            <EmptyState
              title="پلنی پیدا نشد"
              description={
                search
                  ? 'جستجو را تغییر دهید یا همهٔ پلن‌ها را ببینید.'
                  : 'برای شروع، یک پلن ایجاد کنید.'
              }
            />
            {search && (
              <div className={s.clear}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft('');
                    navigate('');
                  }}
                >
                  نمایش همهٔ پلن‌ها
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={s.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>نام و شناسهٔ پلن</th>
                    <th>نسخه‌های ثبت‌شده</th>
                    <th>آخرین نسخهٔ منتشرشده</th>
                    <th>تاریخ ایجاد</th>
                    <th>جزئیات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((plan) => (
                    <tr key={plan.planId}>
                      <td>
                        <Link className={s.planLink} href={'/admin/commerce/' + plan.planId}>
                          <span className={s.planIcon}>
                            <Layers size={20} />
                          </span>
                          <span>
                            <strong>{plan.displayName}</strong>
                            <bdi dir="ltr">{plan.code}</bdi>
                          </span>
                        </Link>
                      </td>
                      <td>{number(plan.versionCount)}</td>
                      <td>
                        {plan.latestPublishedVersion === null ? (
                          <span className={s.muted}>هنوز منتشر نشده</span>
                        ) : (
                          <span className={s.published}>
                            نسخهٔ {number(plan.latestPublishedVersion)}
                          </span>
                        )}
                      </td>
                      <td className={s.muted}>{date(plan.createdAtUtc)}</td>
                      <td>
                        <Button asChild size="icon" variant="ghost">
                          <Link
                            href={'/admin/commerce/' + plan.planId}
                            aria-label={'جزئیات ' + plan.displayName}
                          >
                            <ChevronLeft size={18} />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className={s.footer}>
              <span>
                {number(data.totalCount)} پلن{search ? ' در نتیجهٔ جستجو' : ''}
              </span>
              <div className={s.paging}>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="صفحهٔ قبلی پلن‌ها"
                  disabled={page <= 1 || q.isFetching}
                  onClick={() => navigate(search, page - 1)}
                >
                  <ChevronRight size={18} />
                </Button>
                <span>صفحهٔ {number(page)}</span>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="صفحهٔ بعدی پلن‌ها"
                  disabled={page * pageSize >= data.totalCount || q.isFetching}
                  onClick={() => navigate(search, page + 1)}
                >
                  <ChevronLeft size={18} />
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>
      <div className={s.note}>
        <ShieldCheck size={18} />
        <p>
          انتشار نسخهٔ جدید با اشتراک‌های خریداری‌شده تفاوت دارد. جزئیات هر نسخه را پیش از انتشار
          بررسی کنید.
        </p>
      </div>
      <UpdatedAt at={q.dataUpdatedAt} />
    </div>
  );
}
