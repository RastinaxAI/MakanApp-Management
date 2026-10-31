'use client';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Info } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ListView, type ListColumn } from '@/components/ui/list-view';
import { CommandDialog } from '@/components/ui/command-dialog';
import { Panel, DataView, IdCopy } from '@/components/ui/data-view';
import { SectionTabs } from '@/components/ui/section-tabs';
import { ErrorState, LoadingSkeleton, StatusBadge, UpdatedAt } from '@/components/ui/states';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { number } from '@/lib/formatting';
import { ProvisionOrganization } from './provisioning';
import { subscriptionReady } from './provisioning-state';
import { CheckCircle2, Circle } from 'lucide-react';
import Link from '@/components/ui/app-link';
import { CommercialSummary } from '@/features/commerce/commercial-contracts';
export const organizationColumns: ListColumn[] = [
  { key: 'name', title: 'سازمان', link: (r) => '/admin/organizations/' + r.id },
  { key: 'status', title: 'وضعیت' },
  { key: 'activeMemberCount', title: 'اعضای فعال' },
  { key: 'activeClassCount', title: 'کلاس فعال' },
  { key: 'activeManagerCount', title: 'مدیر فعال' },
  { key: 'subscription.planName', title: 'پلن اشتراک' },
  { key: 'subscription.status', title: 'وضعیت اشتراک' },
  { key: 'subscription.endsAtUtc', title: 'پایان اشتراک' },
  { key: 'createdAtUtc', title: 'تاریخ ایجاد' },
];
export function OrganizationsPage() {
  return (
    <>
      <PageHeader
        title="سازمان‌ها"
        description="مدیریت سازمان‌ها، اعضا و وضعیت فعالیت آن‌ها"
        action={<ProvisionOrganization />}
      />
      <ListView
        endpoint="/api/admin/v1/organizations"
        columns={organizationColumns}
        statusEnum="OrganizationStatus"
        title="فهرست سازمان‌ها"
      />
    </>
  );
}
export function OrganizationDetail({ id }: { id: string }) {
  const endpoint = '/api/admin/v1/organizations/' + id;
  const { can } = useAccess();
  const q = useApi<components['schemas']['PlatformOrganizationDetail']>(endpoint);
  const tab = useSearchParams().get('tab') ?? 'overview';
  if (!can(endpoint)) return <ErrorState error={new ApiError(403)} />;
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const org = q.data;
  return (
    <>
      <PageHeader
        title={org.name}
        description="پرونده سازمان، اعضا و اطلاعات آموزشی"
        parent={{ href: '/admin/organizations', label: 'سازمان‌ها' }}
        action={
          <>
            <StatusBadge value={org.status} />
            {org.status === 'Active' ? (
              <SuspendOrganization id={id} />
            ) : org.status === 'Suspended' ? (
              <CommandDialog title="فعال‌سازی دوباره" path={endpoint + '/reactivate'} />
            ) : null}
          </>
        }
      />
      <div className="mb-5">
        <IdCopy value={org.id} />
      </div>
      <div className="metrics">
        {[
          ['اعضای فعال', org.activeMemberCount],
          ['کلاس فعال', org.classes.activeCount],
          ['ظرفیت کل کلاس‌ها', org.classes.totalCapacity],
          ['مدیران سازمان', org.managers.length],
        ].map(([title, value]) => (
          <div className="metric" key={title}>
            <div className="metric-title">{title}</div>
            <div className="metric-value">{number(Number(value))}</div>
          </div>
        ))}
      </div>
      <SectionTabs
        defaultTab="overview"
        tabs={[
          { key: 'overview', label: 'اطلاعات سازمان' },
          ...(can(endpoint + '/memberships') ? [{ key: 'members', label: 'اعضا و عضویت‌ها' }] : []),
          ...(can('/api/admin/v1/education/classes') ? [{ key: 'classes', label: 'کلاس‌ها' }] : []),
          ...(can(`/api/admin/v1/commerce/organizations/${id}/subscription`)
            ? [{ key: 'commercial', label: 'قرارداد و سهمیه‌ها' }]
            : []),
        ]}
      />
      {tab === 'commercial' && <CommercialSummary kind="organization" id={id} name={org.name} />}
      {tab === 'overview' && (
        <>
          <OrganizationReadiness org={org} />
          <div className="detail-grid">
            <Panel title="مشخصات سازمان">
              <DataView
                value={org}
                fields={['name', 'status', 'createdAtUtc', 'activeRoles', 'version']}
              />
            </Panel>
            <Panel title="اشتراک">
              <DataView value={org.subscription} />
              <div className="mt-5">
                <CommandDialog
                  title="تغییر مجاز اشتراک"
                  path={`/api/admin/v1/commerce/organizations/${id}/subscription-override`}
                  resultView
                />
              </div>
            </Panel>
            <Panel title="مدیران سازمان">
              <DataView value={{ managers: org.managers }} />
            </Panel>
            <Panel
              title="خلاصه آخرین فعالیت‌ها"
              description="این اطلاعات، تاریخچه کامل سازمان نیست."
            >
              <DataView value={org.activity} />
            </Panel>
          </div>
          <UpdatedAt at={q.dataUpdatedAt} />
        </>
      )}
      {tab === 'members' && (
        <>
          <div className="page-actions mb-4">
            <CommandDialog
              title="دعوت عضو"
              path={endpoint + '/invitations'}
              defaults={{ expiresAtUtc: new Date(Date.now() + 7 * 86400000).toISOString() }}
              resultView
            />
          </div>
          <ListView
            endpoint={endpoint + '/memberships'}
            columns={[
              { key: 'displayName', title: 'عضو', link: (r) => '/admin/users/' + r.userId },
              { key: 'status', title: 'وضعیت' },
              { key: 'activeRoles', title: 'نقش‌ها' },
              { key: 'createdAtUtc', title: 'تاریخ عضویت' },
            ]}
            title="عضویت‌های سازمان"
            actions={(row) => (
              <>
                <CommandDialog
                  title="تغییر نقش"
                  path={`${endpoint}/memberships/${row.membershipId}/role`}
                  method="PUT"
                  defaults={{
                    fromRole: Array.isArray(row.activeRoles) ? row.activeRoles[0] : undefined,
                  }}
                />
                <CommandDialog
                  title="پایان عضویت"
                  path={`${endpoint}/memberships/${row.membershipId}`}
                  method="DELETE"
                  danger
                />
              </>
            )}
          />
        </>
      )}
      {tab === 'classes' && (
        <ListView
          endpoint="/api/admin/v1/education/classes"
          fixed={{ organizationId: id }}
          columns={[
            { key: 'title', title: 'کلاس', link: (r) => '/admin/education/' + r.classId },
            { key: 'courseTitle', title: 'درس' },
            { key: 'academicPeriodTitle', title: 'دوره' },
            { key: 'status', title: 'وضعیت' },
            { key: 'activeTeacherCount', title: 'معلم فعال' },
            { key: 'activeLearnerCount', title: 'فراگیر فعال' },
          ]}
          statusEnum="ClassStatus"
          title="کلاس‌های همین سازمان"
        />
      )}
    </>
  );
}
function OrganizationReadiness({
  org,
}: {
  org: components['schemas']['PlatformOrganizationDetail'];
}) {
  const path = `/api/admin/v1/organizations/${org.id}/memberships`;
  const { can } = useAccess();
  const q = useApi<components['schemas']['PlatformMembershipPage']>(path + '?page=1&pageSize=30');
  const manager = q.data?.items.some(
    (m) => m.status === 'Active' && m.activeRoles.includes('Manager'),
  );
  const partial = !!q.data && q.data.totalCount > q.data.items.length;
  const checks = [
    {
      title: 'فعال بودن سازمان',
      done: org.status === 'Active',
      detail: org.status === 'Active' ? 'سازمان فعال است.' : 'سازمان در وضعیت فعال نیست.',
    },
    {
      title: 'عضویت فعال مدیر',
      done: manager === true,
      detail: !can(path)
        ? 'مجوز بررسی عضویت‌ها وجود ندارد.'
        : q.isPending
          ? 'در حال بررسی عضویت‌ها…'
          : q.isError
            ? 'دریافت عضویت‌ها ناموفق بود؛ دوباره بررسی کنید.'
            : manager
              ? 'عضویت فعال با نقش مدیر تأیید شد.'
              : partial
                ? 'در صفحه اول مدیر فعال دیده نشد؛ فهرست اعضا را بررسی کنید.'
                : 'عضویت فعال مدیر مشاهده نشد؛ وضعیت دعوت را با مدیر پیگیری کنید.',
    },
    {
      title: 'اعتبار اشتراک',
      done: subscriptionReady(org.subscription),
      detail: !org.subscription
        ? 'اشتراکی تخصیص نیافته است.'
        : subscriptionReady(org.subscription)
          ? `${org.subscription.planName}؛ فعال و در بازه اعتبار`
          : 'اشتراک فعال در بازه اعتبار تأیید نشد؛ وضعیت و تاریخ‌ها را بررسی کنید.',
    },
  ];
  return (
    <Panel
      title="چک‌لیست راه‌اندازی سازمان"
      description="این بررسی، وضعیت پایه سازمان را نشان می‌دهد؛ آماده‌بودن محتوای آموزشی جداگانه بررسی می‌شود."
    >
      <ul className="readiness-list readiness-grid">
        {checks.map((c) => (
          <li key={c.title}>
            {c.done ? (
              <CheckCircle2 className="text-success" size={22} />
            ) : (
              <Circle className="text-muted" size={22} />
            )}
            <div>
              <strong>{c.title}</strong>
              <p>{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="readiness-actions">
        <p className="field-help">
          این بررسی، آماده‌بودن گروه و کانال رسمی را تأیید نمی‌کند. در صورت دسترس‌نبودن آن‌ها، موضوع
          را با پشتیبانی پیگیری کنید؛ سازمان را دوباره نسازید.
        </p>
        {can(path) && (
          <Link className="text-primary" href={`/admin/organizations/${org.id}?tab=members`}>
            بررسی اعضا و دعوت مدیر ←
          </Link>
        )}
        {q.isError && (
          <button className="button button-ghost button-sm" onClick={() => void q.refetch()}>
            بررسی دوباره عضویت‌ها
          </button>
        )}
      </div>
    </Panel>
  );
}
function SuspendOrganization({ id }: { id: string }) {
  const { can } = useAccess();
  const endpoint = `/api/admin/v1/organizations/${id}/suspension-impact`;
  const q = useApi<components['schemas']['PlatformOrganizationImpactPreview']>(
    endpoint,
    can(`/api/admin/v1/organizations/${id}/suspend`, 'POST'),
  );
  return (
    <CommandDialog
      title="تعلیق سازمان"
      path={`/api/admin/v1/organizations/${id}/suspend`}
      danger
      disabled={!q.data || q.isError}
      description="ابتدا اثر تعلیق را بررسی کنید. دلیل این اقدام ثبت می‌شود."
      preview={
        <div className="notice warning">
          <AlertTriangle size={19} />
          <div>
            <h3>اثر تعلیق سازمان</h3>
            {q.data && <DataView value={q.data} hide={['organizationId']} />}
          </div>
        </div>
      }
    />
  );
}
