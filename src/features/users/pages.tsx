'use client';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { ListView } from '@/components/ui/list-view';
import { Panel, DataView, IdCopy } from '@/components/ui/data-view';
import { CommandDialog } from '@/components/ui/command-dialog';
import { SectionTabs } from '@/components/ui/section-tabs';
import { LoadingSkeleton, ErrorState, StatusBadge } from '@/components/ui/states';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { CommercialSummary } from '@/features/commerce/commercial-contracts';
export function UsersPage() {
  return (
    <>
      <PageHeader
        title="کاربران"
        description="حساب‌های سراسری پلتفرم و دسترسی به پرونده مجاز هر کاربر"
      />
      <ListView
        title="فهرست کاربران"
        endpoint="/api/admin/v1/users"
        statusEnum="UserAccountStatus"
        columns={[
          {
            key: 'displayName',
            title: 'کاربر',
            sub: 'maskedPhone',
            link: (r) => '/admin/users/' + r.userId,
          },
          { key: 'accountStatus', title: 'وضعیت حساب' },
          { key: 'activeOrganizationMembershipCount', title: 'عضویت سازمانی فعال' },
          { key: 'platformRoles', title: 'نقش‌های پلتفرم' },
          { key: 'createdAtUtc', title: 'تاریخ ثبت‌نام' },
          { key: 'lastSessionActivityAtUtc', title: 'آخرین فعالیت نشست' },
        ]}
      />
    </>
  );
}
export function UserDetail({ id }: { id: string }) {
  const path = '/api/admin/v1/users/' + id;
  const { can } = useAccess();
  const q = useApi<components['schemas']['PlatformUserDetail']>(path);
  const tab = useSearchParams().get('tab') ?? 'profile';
  if (!can(path)) return <ErrorState error={new ApiError(403)} />;
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const user = q.data;
  return (
    <>
      <PageHeader
        title={user.displayName}
        description="حساب کاربری سراسری؛ مجوز هر اقدام مستقل بررسی می‌شود."
        parent={{ href: '/admin/users', label: 'کاربران' }}
        action={
          <>
            <StatusBadge value={user.accountStatus} />
            {user.accountStatus === 'Active' ? (
              <CommandDialog title="تعلیق حساب" danger path={path + '/suspend'} />
            ) : user.accountStatus === 'Suspended' ? (
              <CommandDialog title="فعال‌سازی حساب" path={path + '/reactivate'} />
            ) : null}
          </>
        }
      />
      <div className="mb-5">
        <IdCopy value={user.userId} />
      </div>
      <SectionTabs
        defaultTab="profile"
        tabs={[
          { key: 'profile', label: 'مشخصات و عضویت‌ها' },
          { key: 'sessions', label: 'نشست‌ها' },
          { key: 'history', label: 'سوابق مدیریتی' },
          { key: 'security', label: 'بررسی اطلاعات سن' },
          ...(can(`/api/admin/v1/commerce/users/${id}/subscription`)
            ? [{ key: 'commercial', label: 'قرارداد و سهمیه‌ها' }]
            : []),
        ]}
      />
      {tab === 'commercial' && <CommercialSummary kind="user" id={id} name={user.displayName} />}
      {tab === 'profile' && (
        <div className="detail-grid">
          <Panel title="اطلاعات مجاز حساب">
            <DataView
              value={user}
              fields={[
                'displayName',
                'username',
                'maskedPhone',
                'mobileVerified',
                'accountStatus',
                'createdAtUtc',
                'suspendedAtUtc',
                'personId',
                'platformRoles',
              ]}
            />
          </Panel>
          <Panel title="خلاصه روابط سرپرستی">
            <DataView value={user.guardianRelations} />
          </Panel>
          <div className="col-span-full">
            <Panel title="عضویت‌های سازمانی">
              <DataView value={{ memberships: user.memberships }} />
            </Panel>
          </div>
        </div>
      )}
      {tab === 'sessions' && (
        <Panel
          title="نشست‌های حساب"
          action={
            <CommandDialog title="ابطال همه نشست‌ها" path={path + '/sessions/revoke'} danger />
          }
        >
          {user.sessions.map((s) => (
            <div className="nested-block" key={s.sessionId}>
              <DataView value={s} />
              <div className="mt-4">
                <CommandDialog
                  title="ابطال این نشست"
                  path={`${path}/sessions/${s.sessionId}/revoke`}
                  danger
                  disabled={!s.isActive}
                />
              </div>
            </div>
          ))}
        </Panel>
      )}
      {tab === 'history' && (
        <Panel title="سوابق مدیریتی موجود در پاسخ">
          <DataView value={{ administrativeHistory: user.administrativeHistory }} />
        </Panel>
      )}
      {tab === 'security' && (
        <>
          <CommunicationAge id={id} />
        </>
      )}
    </>
  );
}
function CommunicationAge({ id }: { id: string }) {
  const path = `/api/admin/v1/users/${id}/communication-age`;
  const q = useApi<components['schemas']['CommunicationAgeResult']>(path);
  const { can } = useAccess();
  if (!can(path)) return null;
  return (
    <Panel
      title="بررسی اطلاعات سن"
      description="اطلاعات سن و بررسی هویت، مجوز پیام‌رسانی ایجاد یا محدود نمی‌کند. این اطلاعات فقط در جریان مستقل بررسی سرور استفاده می‌شود."
    >
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <DataView value={q.data} />
          <div className="row-actions mt-5">
            <CommandDialog
              title="ثبت بررسی سن"
              path={path + '/verifications'}
              onReload={async () => {
                const r = await q.refetch();
                return { expectedVersion: r.data?.version };
              }}
              defaults={{ expectedVersion: q.data?.version }}
            />
            <CommandDialog
              title="حل وضعیت سن"
              path={path + '/resolve'}
              defaults={{ expectedVersion: q.data?.version }}
            />
          </div>
        </>
      )}
    </Panel>
  );
}
