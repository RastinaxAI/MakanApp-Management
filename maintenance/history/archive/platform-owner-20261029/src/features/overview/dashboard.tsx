'use client';
import Link from '@/components/ui/app-link';
import {
  Building2,
  Users,
  GraduationCap,
  ShieldCheck,
  ArrowLeft,
  Flag,
  Activity,
  Info,
  ArrowUpLeft,
} from 'lucide-react';
import type { components } from '@/generated/api/schema';
import { useAccess } from '@/features/access-context/provider';
import { useApi } from '@/lib/api/hooks';
import { date, number } from '@/lib/formatting';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Panel, DataView } from '@/components/ui/data-view';
import { LoadingSkeleton, ErrorState, StatusBadge, UpdatedAt } from '@/components/ui/states';
import { ProvisionOrganization } from '@/features/organizations/provisioning';
export function Dashboard() {
  const { session, can } = useAccess();
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
      Icon: Building2,
    },
    {
      title: 'کاربران پلتفرم',
      value: users.data?.totalCount,
      query: users,
      path: '/api/admin/v1/users',
      Icon: Users,
    },
    {
      title: 'کلاس‌های آموزشی',
      value: classes.data?.totalCount,
      query: classes,
      path: '/api/admin/v1/education/classes',
      Icon: GraduationCap,
    },
    {
      title: 'پرونده‌های رسیدگی',
      value: cases.data?.totalCount,
      query: cases,
      path: '/api/admin/v1/moderation/cases',
      Icon: Flag,
    },
  ];
  const links = [
    [
      'سازمان‌ها',
      'مدیریت اعضا، کلاس‌ها و اشتراک',
      'organizations',
      Building2,
      '/api/admin/v1/organizations',
    ],
    ['کاربران', 'حساب‌ها، عضویت‌ها و نشست‌ها', 'users', Users, '/api/admin/v1/users'],
    [
      'آموزش',
      'مرور کلاس‌ها و اطلاعات آموزشی',
      'education',
      GraduationCap,
      '/api/admin/v1/education/classes',
    ],
    [
      'عملیات سامانه',
      'سلامت سرویس‌ها و پردازش‌ها',
      'operations',
      Activity,
      '/api/admin/v1/operations/health',
    ],
  ] as const;
  return (
    <>
      <PageHeader
        title="نمای کلی"
        description="اطلاعات معتبر پلتفرم، در یک نگاه"
        action={<span className="updated">{date(new Date().toISOString())}</span>}
      />
      <div className="welcome">
        <span className="welcome-icon">
          <ShieldCheck size={25} />
        </span>
        <div>
          <h2>
            {session.user.firstName
              ? `${session.user.firstName}، خوش آمدید`
              : 'به پنل مدیریت ماکان خوش آمدید'}
          </h2>
          <p>وضعیت مشتری‌ها را ببینید، سازمانی راه‌اندازی کنید یا مشکل یک حساب را پیگیری کنید.</p>
        </div>
        <div className="welcome-date">
          <ProvisionOrganization />
        </div>
      </div>
      {!session.platform && (
        <div className="notice">
          <Info size={18} />
          <div>
            این حساب دسترسی مدیریت پلتفرم ندارد.
            <p>برای استفاده از این پنل، دسترسی مالک پلتفرم لازم است.</p>
          </div>
        </div>
      )}
      {session.platform && session.unboundOperationCount > 0 && (
        <div className="notice warning">
          <Info size={18} />
          <div>
            مجوزهای عملیات نیازمند تأیید قرارداد هستند.
            <p>
              دسترسی‌های تأییدنشده پنهان‌اند. مجوزهای واقعی حساب در بخش حساب و امنیت قابل مشاهده
              است.
            </p>
          </div>
        </div>
      )}
      <div className="metrics">
        {stats
          .filter((s) => can(s.path))
          .map((s) => (
            <div className="metric" key={s.title}>
              <div className="metric-title">
                {s.title}
                <s.Icon size={20} />
              </div>
              <div className="metric-value">
                {s.query.isError ? 'ناموجود' : s.query.isPending ? '…' : number(s.value)}
              </div>
              <div className="metric-foot">
                {s.query.isError ? 'دریافت اطلاعات ناموفق بود' : 'تعداد کل گزارش‌شده توسط سرور'}
              </div>
              {s.query.isError && (
                <button className="text-primary text-xs" onClick={() => void s.query.refetch()}>
                  تلاش دوباره
                </button>
              )}
            </div>
          ))}
      </div>
      <div className="dashboard-grid">
        <div>
          {can('/api/admin/v1/organizations') && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>تازه‌ترین سازمان‌ها</h2>
                  <p>مرور وضعیت و دسترسی به پرونده سازمان</p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/organizations">
                    همه سازمان‌ها
                    <ArrowLeft size={14} />
                  </Link>
                </Button>
              </div>
              {organizations.isPending ? (
                <LoadingSkeleton />
              ) : organizations.isError ? (
                <ErrorState
                  error={organizations.error}
                  onRetry={() => void organizations.refetch()}
                />
              ) : (
                <DataTable
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
                          <span className="table-initial" aria-hidden="true">
                            {row.original.name.slice(0, 1)}
                          </span>
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
            </section>
          )}
          {can('/api/admin/v1/operations/health') && (
            <Panel title="سلامت سامانه" description="آخرین وضعیت گزارش‌شده سرویس‌ها و پردازش‌ها">
              {health.isPending ? (
                <LoadingSkeleton />
              ) : health.isError ? (
                <ErrorState error={health.error} onRetry={() => void health.refetch()} />
              ) : (
                <>
                  <DataTable
                    data={health.data?.dependencies ?? []}
                    columns={[
                      { header: 'سرویس', accessorKey: 'name' },
                      {
                        header: 'وضعیت گزارش‌شده',
                        accessorKey: 'status',
                        cell: ({ row }) => <StatusBadge value={row.original.status} />,
                      },
                    ]}
                  />
                  <div className="mt-4">
                    <Link href="/admin/operations" className="text-primary text-xs">
                      مشاهده جزئیات عملیات ←
                    </Link>
                  </div>
                  <UpdatedAt at={health.dataUpdatedAt} />
                </>
              )}
            </Panel>
          )}
        </div>
        <div>
          <Panel title="دسترسی سریع" description="مسیرهای در دسترس حساب شما">
            {links
              .filter((l) => can(l[4]))
              .map(([title, description, slug, Icon]) => (
                <Link href={'/admin/' + slug} key={slug} className="quick-link">
                  <span>
                    <Icon size={18} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <p>{description}</p>
                  </div>
                  <ArrowUpLeft size={16} />
                </Link>
              ))}
            <Link className="quick-link" href="/admin/account">
              <span>
                <ShieldCheck size={18} />
              </span>
              <div>
                <strong>حساب و امنیت</strong>
                <p>نشست‌ها و دسترسی‌های حساب</p>
              </div>
              <ArrowUpLeft size={16} />
            </Link>
          </Panel>
          {can('/api/admin/v1/provisioning') && (
            <Panel
              title="راه‌اندازی‌های نیازمند پیگیری"
              description="درخواست‌هایی که سرور در وضعیت نیازمند توجه ثبت کرده است"
            >
              {pending.isPending ? (
                <LoadingSkeleton />
              ) : pending.isError ? (
                <ErrorState error={pending.error} onRetry={() => void pending.refetch()} />
              ) : (
                <>
                  <div className="attention-count">
                    {number(pending.data?.totalCount)}
                    <small>درخواست نیازمند پیگیری</small>
                  </div>
                  {pending.data?.items.length ? (
                    pending.data.items.map((item) => (
                      <div className="feature-row" key={item.id}>
                        <div>
                          <strong>{item.organizationName}</strong>
                          <p>{item.failureCode ?? 'نتیجه مراحل را بررسی کنید.'}</p>
                        </div>
                        <StatusBadge value={item.status} />
                      </div>
                    ))
                  ) : (
                    <p className="field-help">درخواستی با این وضعیت ثبت نشده است.</p>
                  )}
                  <Link
                    className="quick-link"
                    href="/admin/commerce?tab=provisioning&status=NeedsAttention"
                  >
                    بررسی درخواست‌ها
                    <ArrowLeft size={15} />
                  </Link>
                </>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
