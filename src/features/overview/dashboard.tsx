'use client';
import { useState } from 'react';
import Link from '@/components/ui/app-link';
import {
  Activity,
  ArrowLeft,
  ArrowUpLeft,
  Building2,
  CheckCircle2,
  Flag,
  GraduationCap,
  Layers3,
  RefreshCw,
  Users,
} from 'lucide-react';
import type { components } from '@/generated/api/schema';
import { useAccess } from '@/features/access-context/provider';
import { useApi } from '@/lib/api/hooks';
import { date, number } from '@/lib/formatting';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Panel } from '@/components/ui/data-view';
import { LoadingSkeleton, ErrorState, StatusBadge, UpdatedAt } from '@/components/ui/states';
import { ProvisionOrganization } from '@/features/organizations/provisioning';

export function Dashboard() {
  const { session, can } = useAccess();
  const [refreshing, setRefreshing] = useState(false);
  const organizations = useApi<components['schemas']['PlatformOrganizationPage']>(
    '/api/admin/v1/organizations?page=1&pageSize=5',
  );
  const users = useApi<components['schemas']['PlatformUserPage']>(
    '/api/admin/v1/users?page=1&pageSize=1',
  );
  const classes = useApi<components['schemas']['PlatformClassPage']>(
    '/api/admin/v1/education/classes?page=1&pageSize=1',
  );
  const cases = useApi<components['schemas']['PlatformModerationCasePage']>(
    '/api/admin/v1/moderation/cases?page=1&pageSize=1',
  );
  const health = useApi<components['schemas']['PlatformSystemHealth']>(
    '/api/admin/v1/operations/health',
  );
  const pending = useApi<components['schemas']['PlatformProvisioningPage']>(
    '/api/admin/v1/provisioning?status=NeedsAttention&page=1&pageSize=3',
  );
  const stats = [
    {
      title: 'سازمان‌ها',
      value: organizations.data?.totalCount,
      query: organizations,
      path: '/api/admin/v1/organizations',
      href: '/admin/organizations',
      Icon: Building2,
      tone: 'blue',
      description: 'سازمان‌های ثبت‌شده',
    },
    {
      title: 'کاربران پلتفرم',
      value: users.data?.totalCount,
      query: users,
      path: '/api/admin/v1/users',
      href: '/admin/users',
      Icon: Users,
      tone: 'violet',
      description: 'حساب‌های کاربری',
    },
    {
      title: 'کلاس‌های آموزشی',
      value: classes.data?.totalCount,
      query: classes,
      path: '/api/admin/v1/education/classes',
      href: '/admin/education',
      Icon: GraduationCap,
      tone: 'teal',
      description: 'کلاس‌های ثبت‌شده',
    },
    {
      title: 'پرونده‌های رسیدگی',
      value: cases.data?.totalCount,
      query: cases,
      path: '/api/admin/v1/moderation/cases',
      href: '/admin/moderation',
      Icon: Flag,
      tone: 'amber',
      description: 'پرونده‌های گزارش‌شده',
    },
  ];
  const shortcuts = [
    {
      title: 'پیگیری حساب کاربر',
      description: 'مشخصات، عضویت‌ها و نشست‌ها',
      slug: 'users',
      Icon: Users,
      permission: '/api/admin/v1/users',
    },
    {
      title: 'مدیریت سازمان‌ها',
      description: 'اعضا، وضعیت فعالیت و اشتراک',
      slug: 'organizations',
      Icon: Building2,
      permission: '/api/admin/v1/organizations',
    },
    {
      title: 'پلن‌ها و قراردادها',
      description: 'نسخه پلن، قرارداد و سهمیه‌ها',
      slug: 'commerce',
      Icon: Layers3,
      permission: '/api/admin/v1/commerce/plans',
    },
  ];
  async function refresh() {
    setRefreshing(true);
    const jobs: Promise<unknown>[] = stats.filter((s) => can(s.path)).map((s) => s.query.refetch());
    if (can('/api/admin/v1/operations/health')) jobs.push(health.refetch());
    if (can('/api/admin/v1/provisioning')) jobs.push(pending.refetch());
    await Promise.allSettled(jobs);
    setRefreshing(false);
  }
  return (
    <>
      <PageHeader
        title="نمای کلی"
        description="آنچه برای مدیریت امروز نیاز دارید، همین‌جاست."
        action={
          <>
            <Button variant="outline" disabled={refreshing} onClick={() => void refresh()}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              تازه‌سازی
            </Button>
            <ProvisionOrganization />
          </>
        }
      />
      <section className="overview-intro">
        <div>
          <span className="eyebrow">میز کار مالک پلتفرم</span>
          <h2>
            {session.user.firstName
              ? `${session.user.firstName}، خوش آمدید`
              : 'به فضای مدیریت ماکان خوش آمدید'}
          </h2>
          <p>وضعیت پلتفرم را مرور کنید و کار بعدی را از اینجا شروع کنید.</p>
        </div>
        <div className="overview-date">
          <span>امروز</span>
          <strong>{date(new Date().toISOString())}</strong>
        </div>
      </section>
      {session.unboundOperationCount > 0 && (
        <p className="notice warning">
          بعضی امکانات این حساب هنوز آماده استفاده نیستند. دسترسی‌های فعال را در «حساب و امنیت»
          بررسی کنید.
        </p>
      )}
      <div className="metrics">
        {stats
          .filter((s) => can(s.path))
          .map((s) => (
            <Link href={s.href} key={s.title} className={'metric metric-' + s.tone}>
              <div className="metric-title">
                <span>{s.title}</span>
                <span className="metric-icon">
                  <s.Icon size={21} strokeWidth={1.7} />
                </span>
              </div>
              <div className="metric-value">
                {s.query.isError ? 'ناموجود' : s.query.isPending ? '…' : number(s.value)}
              </div>
              <div className="metric-foot">
                <span>{s.query.isError ? 'دریافت اطلاعات ناموفق بود' : s.description}</span>
                <ArrowUpLeft size={16} />
              </div>
            </Link>
          ))}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          {can('/api/admin/v1/organizations') && (
            <Panel
              title="مرور سازمان‌ها"
              description="وضعیت فعالیت و دسترسی به پرونده هر سازمان"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/organizations">
                    همه سازمان‌ها
                    <ArrowLeft size={15} />
                  </Link>
                </Button>
              }
            >
              {organizations.isPending ? (
                <LoadingSkeleton />
              ) : organizations.isError ? (
                <ErrorState
                  error={organizations.error}
                  onRetry={() => void organizations.refetch()}
                />
              ) : (
                <DataTable
                  mobileLimit={3}
                  data={organizations.data?.items ?? []}
                  columns={[
                    {
                      header: 'سازمان',
                      accessorKey: 'name',
                      cell: ({ row }) => (
                        <Link
                          className="table-link"
                          href={'/admin/organizations/' + row.original.id}
                        >
                          <span className="table-initial">{row.original.name.slice(0, 1)}</span>
                          {row.original.name}
                        </Link>
                      ),
                    },
                    {
                      header: 'وضعیت',
                      accessorKey: 'status',
                      cell: ({ row }) => <StatusBadge value={row.original.status} />,
                    },
                    {
                      header: 'عضو فعال',
                      accessorKey: 'activeMemberCount',
                      cell: ({ row }) => number(row.original.activeMemberCount),
                    },
                    {
                      header: 'کلاس فعال',
                      accessorKey: 'activeClassCount',
                      cell: ({ row }) => number(row.original.activeClassCount),
                    },
                  ]}
                />
              )}
              <UpdatedAt at={organizations.dataUpdatedAt} />
            </Panel>
          )}
          <Panel title="کار را از اینجا شروع کنید" description="دسترسی مستقیم به کارهای پرکاربرد">
            <div className="shortcut-grid">
              {shortcuts
                .filter((s) => can(s.permission))
                .map((s) => (
                  <Link className="shortcut-card" href={'/admin/' + s.slug} key={s.slug}>
                    <span className="shortcut-icon">
                      <s.Icon size={21} />
                    </span>
                    <strong>{s.title}</strong>
                    <p>{s.description}</p>
                    <ArrowUpLeft size={17} />
                  </Link>
                ))}
              <Link className="shortcut-card" href="/admin/account">
                <span className="shortcut-icon">
                  <CheckCircle2 size={21} />
                </span>
                <strong>حساب و امنیت</strong>
                <p>دسترسی‌ها، نشست‌ها و اعلان‌های من</p>
                <ArrowUpLeft size={17} />
              </Link>
            </div>
          </Panel>
        </div>
        <div className="dashboard-aside">
          {can('/api/admin/v1/provisioning') && (
            <Panel title="نیازمند پیگیری" description="درخواست‌های راه‌اندازی سازمان">
              {pending.isPending ? (
                <LoadingSkeleton />
              ) : pending.isError ? (
                <ErrorState error={pending.error} onRetry={() => void pending.refetch()} />
              ) : (
                <>
                  <div className="attention-count">
                    {number(pending.data?.totalCount)}
                    <small>درخواست برای بررسی</small>
                  </div>
                  {pending.data?.items.length ? (
                    pending.data.items.map((item) => (
                      <div className="feature-row" key={item.id}>
                        <div>
                          <strong>{item.organizationName}</strong>
                          <p>{item.failureCode || 'نتیجه مراحل را بررسی کنید.'}</p>
                        </div>
                        <StatusBadge value={item.status} />
                      </div>
                    ))
                  ) : (
                    <div className="inline-empty">
                      <CheckCircle2 size={21} />
                      <p>درخواستی در وضعیت نیازمند پیگیری ثبت نشده است.</p>
                    </div>
                  )}
                  <Button asChild variant="outline" className="wide-button">
                    <Link href="/admin/commerce?tab=provisioning&status=NeedsAttention">
                      بررسی درخواست‌ها
                      <ArrowLeft size={16} />
                    </Link>
                  </Button>
                </>
              )}
            </Panel>
          )}
          {can('/api/admin/v1/operations/health') && (
            <Panel title="وضعیت سرویس‌ها" action={<Activity size={18} className="text-muted" />}>
              {health.isPending ? (
                <LoadingSkeleton />
              ) : health.isError ? (
                <ErrorState error={health.error} onRetry={() => void health.refetch()} />
              ) : (
                <>
                  {health.data?.dependencies.length ? (
                    health.data.dependencies.map((dependency, i) => (
                      <div className="service-row" key={i}>
                        <span>{dependency.name}</span>
                        <StatusBadge value={dependency.status} />
                      </div>
                    ))
                  ) : (
                    <p className="field-help">جزئیات سرویس‌ها گزارش نشده است.</p>
                  )}
                  <Link className="panel-more" href="/admin/operations">
                    جزئیات عملیات
                    <ArrowLeft size={15} />
                  </Link>
                  <UpdatedAt at={health.dataUpdatedAt} />
                </>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
