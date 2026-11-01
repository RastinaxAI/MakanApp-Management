'use client';
import { useSearchParams } from 'next/navigation';
import { Info } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Panel, DataView, IdCopy } from '@/components/ui/data-view';
import { CommandDialog } from '@/components/ui/command-dialog';
import { ListView } from '@/components/ui/list-view';
import { SectionTabs } from '@/components/ui/section-tabs';
import { LoadingSkeleton, ErrorState } from '@/components/ui/states';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { NotificationSettings } from '@/features/pwa/notifications';
export function RolesPage() {
  const { can } = useAccess();
  const defaultTab = can('/api/admin/v1/roles') ? 'catalog' : 'assignments';
  const tab = useSearchParams().get('tab') ?? defaultTab;
  const q = useApi<components['schemas']['PlatformRoleCatalogItem'][]>('/api/admin/v1/roles');
  if (!can('/api/admin/v1/roles') && tab === 'catalog')
    return <ErrorState error={new ApiError(403)} />;
  return (
    <>
      <PageHeader
        title="نقش‌ها و دسترسی‌ها"
        description="کاتالوگ نقش‌های Backend و انتساب‌های مجاز پلتفرم"
        action={
          <CommandDialog title="انتساب نقش" path="/api/admin/v1/role-assignments" resultView />
        }
      />
      <SectionTabs
        defaultTab={defaultTab}
        tabs={[
          ...(can('/api/admin/v1/roles') ? [{ key: 'catalog', label: 'کاتالوگ نقش‌ها' }] : []),
          ...(can('/api/admin/v1/role-assignments')
            ? [{ key: 'assignments', label: 'انتساب نقش‌ها' }]
            : []),
        ]}
      />
      {tab === 'catalog' &&
        (q.isPending ? (
          <LoadingSkeleton />
        ) : q.isError ? (
          <ErrorState error={q.error} />
        ) : (
          q.data?.map((role) => (
            <Panel key={role.roleId} title={role.displayName} description={role.key}>
              <IdCopy value={role.roleId} />
              <div className="permission-list mt-4">
                {role.permissions.map((p) => (
                  <code key={p}>{p}</code>
                ))}
              </div>
            </Panel>
          ))
        ))}
      {tab === 'assignments' && (
        <ListView
          endpoint="/api/admin/v1/role-assignments"
          title="انتساب‌های نقش"
          columns={[
            { key: 'displayName', title: 'حساب', link: (r) => '/admin/users/' + r.userId },
            { key: 'roleDisplayName', title: 'نقش' },
            { key: 'isActive', title: 'فعال' },
            { key: 'grantedAtUtc', title: 'تاریخ انتساب' },
            { key: 'endedAtUtc', title: 'پایان انتساب' },
          ]}
          actions={(row) => (
            <CommandDialog
              title="پایان انتساب"
              method="DELETE"
              path={'/api/admin/v1/role-assignments/' + row.assignmentId}
              disabled={row.isActive !== true}
              danger
            />
          )}
        />
      )}
    </>
  );
}
export function AccountPage() {
  const { session, logout } = useAccess();
  const requestedTab = useSearchParams().get('tab');
  const tab = ['profile', 'sessions', 'notifications', 'permissions'].includes(requestedTab ?? '')
    ? requestedTab
    : 'profile';
  return (
    <>
      <PageHeader title="حساب و امنیت" description="مشخصات حساب، نشست‌های فعال و مجوزهای دسترسی" />
      <SectionTabs
        defaultTab="profile"
        tabs={[
          { key: 'profile', label: 'حساب کاربری' },
          { key: 'sessions', label: 'نشست‌های من' },
          { key: 'notifications', label: 'نصب و اعلان‌ها' },
          ...(session.platform ? [{ key: 'permissions', label: 'مجوزهای واقعی حساب' }] : []),
        ]}
      />
      {tab === 'profile' && (
        <Panel title="اطلاعات حساب">
          <DataView value={session.user} />
          <div className="mt-5">
            <CommandDialog
              title="ویرایش پروفایل مجاز"
              path="/api/v1/me/profile"
              method="PATCH"
              defaults={{
                firstName: session.user.firstName,
                lastName: session.user.lastName,
                displayName: session.user.displayName,
                username: session.user.username,
              }}
            />
          </div>
        </Panel>
      )}
      {tab === 'sessions' && (
        <ListView
          endpoint="/api/v1/auth/sessions"
          columns={[
            { key: 'deviceName', title: 'دستگاه' },
            { key: 'createdAtUtc', title: 'ایجاد' },
            { key: 'expiresAtUtc', title: 'انقضا' },
            { key: 'isCurrent', title: 'نشست جاری' },
          ]}
          title="نشست‌های حساب من"
          actions={(row) => (
            <CommandDialog
              title="ابطال نشست"
              method="DELETE"
              path={'/api/v1/auth/sessions/' + row.id}
              danger
              onSuccess={() => {
                if (row.isCurrent) void logout();
              }}
            />
          )}
        />
      )}{' '}
      {tab === 'sessions' && (
        <div className="mt-5">
          <CommandDialog
            title="ابطال نشست‌های دیگر"
            path="/api/v1/auth/sessions/revoke-others"
            danger
          />
        </div>
      )}
      {tab === 'notifications' && <NotificationSettings />}
      {tab === 'permissions' && session.platform && (
        <Panel
          title="مجوزهای جاری تأییدشده سرور"
          description="نام این مجوزها مستقیماً از حساب پلتفرم خوانده شده است."
        >
          <div className="permission-list">
            {session.platform.permissions.map((p) => (
              <code key={p}>{p}</code>
            ))}
          </div>
          {session.unboundOperationCount > 0 && (
            <div className="notice mt-5">
              <Info size={18} />
              اتصال هر permission به عملیات باید با تیم Backend تأیید و در پیکربندی سرور ثبت شود.
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
