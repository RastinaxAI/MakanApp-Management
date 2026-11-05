'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from '@/components/ui/app-link';
import { PageHeader } from '@/components/layout/page-header';
import { Panel, DataView, IdCopy } from '@/components/ui/data-view';
import { ListView } from '@/components/ui/list-view';
import { SectionTabs } from '@/components/ui/section-tabs';
import { LoadingSkeleton, ErrorState, StatusBadge } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import { ApiError } from '@/lib/api/errors';
import { validator } from '@/lib/api/contract';
import type { components } from '@/generated/api/schema';
import { PersonalClassAction } from './review';

const requests = '/api/admin/v1/personal-class-requests';
const uuid = validator({ type: 'string', format: 'uuid' });
type RequestDetail = components['schemas']['PersonalClassRequestDto'];
type Grant = components['schemas']['PersonalClassAcademicPermissionDto'];
export function PersonalClassesPage() {
  const { can } = useAccess();
  const router = useRouter();
  const [id, setId] = useState('');
  return (
    <>
      <PageHeader
        title="کلاس‌های شخصی"
        description="بررسی تشکیل کلاس، روند آماده‌سازی و مجوزهای آموزشی مستقل"
      />
      <Panel title="رفتن به پرونده کلاس">
        <form
          className="filter-bar"
          onSubmit={(e) => {
            e.preventDefault();
            if (uuid.safeParse(id.trim()).success)
              router.push('/admin/personal-classes/' + id.trim());
          }}
        >
          <label>
            شناسه کلاس
            <input
              dir="ltr"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="off"
            />
          </label>
          <Button type="submit" disabled={!uuid.safeParse(id.trim()).success}>
            مشاهده مجوزها و سوابق
          </Button>
        </form>
        <p className="field-help">
          از درخواست تأییدشده نیز می‌توانید مستقیماً پرونده کلاس را باز کنید.
        </p>
      </Panel>
      {can(requests) && (
        <ListView
          endpoint={requests}
          title="درخواست‌های تشکیل کلاس"
          statusEnum="PersonalClassRequestStatus"
          columns={[
            {
              key: 'details.title',
              title: 'عنوان کلاس',
              sub: 'details.purpose',
              link: (r) => '/admin/personal-class-requests/' + r.id,
            },
            { key: 'status', title: 'وضعیت بررسی' },
            { key: 'details.suggestedCapacity', title: 'ظرفیت پیشنهادی' },
            { key: 'createdAtUtc', title: 'ثبت درخواست' },
            { key: 'submittedAtUtc', title: 'ارسال برای بررسی' },
            { key: 'requesterUserId', title: 'شناسه درخواست‌کننده' },
          ]}
        />
      )}
    </>
  );
}
export function PersonalClassRequestDetail({ id }: { id: string }) {
  const path = requests + '/' + id;
  const { can } = useAccess();
  const q = useApi<RequestDetail>(path);
  const tab = useSearchParams().get('tab') ?? 'overview';
  if (!can(path)) return <ErrorState error={new ApiError(403)} />;
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const data = q.data;
  return (
    <>
      <PageHeader
        title={data.details.title}
        description="بررسی درخواست تشکیل کلاس شخصی"
        parent={{ href: '/admin/personal-classes', label: 'کلاس‌های شخصی' }}
        action={<StatusBadge value={data.status} />}
      />
      <IdCopy value={id} />
      <SectionTabs
        defaultTab="overview"
        tabs={[
          { key: 'overview', label: 'درخواست و پیشرفت' },
          { key: 'history', label: 'سوابق تصمیم‌ها' },
        ]}
      />
      {tab === 'history' ? (
        <ListView
          endpoint={path + '/history'}
          title="سوابق تصمیم‌ها"
          columns={[
            { key: 'action', title: 'تصمیم' },
            { key: 'reason', title: 'دلیل' },
            { key: 'occurredAtUtc', title: 'زمان' },
            { key: 'actorUserId', title: 'عامل' },
          ]}
        />
      ) : (
        <>
          <div className="detail-grid">
            <Panel title="جزئیات درخواست">
              <DataView value={data.details} />
            </Panel>
            <Panel title="بررسی و تصمیم">
              <DataView
                value={data}
                fields={[
                  'status',
                  'createdAtUtc',
                  'submittedAtUtc',
                  'decidedAtUtc',
                  'decisionReason',
                  'requesterUserId',
                  'finalManagerUserId',
                ]}
              />
              {can(path + '/review', 'POST') && (
                <div className="mt-4">
                  <PersonalClassAction request={data} />
                </div>
              )}
            </Panel>
            <Panel title="پیشرفت آماده‌سازی">
              <DataView value={data.progress} />
              {data.status === 'Approved' && (
                <p className="notice">
                  درخواست تأیید شده است. آماده‌بودن کلاس، پذیرش مدیر و وضعیت گروه و کانال را جداگانه
                  بررسی کنید.
                </p>
              )}
              {data.createdClassId && (
                <Button asChild variant="outline">
                  <Link href={'/admin/personal-classes/' + data.createdClassId}>
                    پرونده کلاس و مجوزهای آموزشی
                  </Link>
                </Button>
              )}
            </Panel>
          </div>
          <p className="notice">
            مدیر و معلم پیشنهادی، به‌تنهایی پذیرش یا اختیار آموزشی ایجاد نمی‌کنند.
          </p>
        </>
      )}
    </>
  );
}
export function PersonalClassDetail({ id }: { id: string }) {
  const path = '/api/admin/v1/personal-classes/' + id;
  const { can } = useAccess();
  const permissions = can(path + '/academic-permissions');
  const history = can(path + '/history');
  const memberships = can(path + '/memberships');
  const tab = useSearchParams().get('tab') ?? (permissions ? 'permissions' : 'history');
  if (!permissions && !history) return <ErrorState error={new ApiError(403)} />;
  return (
    <>
      <PageHeader
        title="پرونده کلاس شخصی"
        description="مجوزهای متصل به دوره عضویت و سوابق مدیریتی مجاز"
        parent={{ href: '/admin/personal-classes', label: 'کلاس‌های شخصی' }}
      />
      <IdCopy value={id} />
      <SectionTabs
        defaultTab={permissions ? 'permissions' : 'history'}
        tabs={[
          ...(permissions ? [{ key: 'permissions', label: 'مجوزهای آموزشی' }] : []),
          ...(memberships ? [{ key: 'members', label: 'اعضای کلاس' }] : []),
          ...(history ? [{ key: 'history', label: 'سوابق کلاس' }] : []),
        ]}
      />
      {tab === 'members' && memberships && (
        <ListView
          endpoint={path + '/memberships'}
          title="اعضای کلاس شخصی"
          columns={[
            { key: 'displayName', title: 'عضو', sub: 'username' },
            { key: 'localRoles', title: 'نقش در کلاس' },
            { key: 'status', title: 'وضعیت عضویت' },
            { key: 'canReceivePlatformAcademicGrant', title: 'امکان دریافت مجوز پایه' },
            { key: 'joinedAtUtc', title: 'شروع عضویت' },
            { key: 'endedAtUtc', title: 'پایان عضویت' },
          ]}
        />
      )}
      {tab === 'permissions' && permissions && (
        <>
          <p className="notice">
            مجوز پایه فقط به مدیر فعال تعلق می‌گیرد؛ معلم اختیار خود را از مدیر دریافت می‌کند. نقش
            مدیر به‌تنهایی مجوز آموزشی نیست. مجوز به همین دوره عضویت تعلق دارد؛ لغو مجوز مبنا یا
            پایان عضویت، تفویض وابسته را بی‌اثر می‌کند.
          </p>
          {can(path + '/academic-permissions/00000000-0000-0000-0000-000000000001', 'PUT') && (
            <Panel title="ثبت مجوز برای عضویت">
              <PersonalClassAction classId={id} />
            </Panel>
          )}
          <ListView
            endpoint={path + '/academic-permissions'}
            title="تاریخچه مجوزها"
            columns={[
              { key: 'membershipId', title: 'دوره عضویت' },
              { key: 'capabilities', title: 'مجوزها' },
              { key: 'isEffective', title: 'مؤثر است' },
              { key: 'createdAtUtc', title: 'زمان اعطا' },
              { key: 'revokedAtUtc', title: 'زمان لغو' },
              { key: 'parentGrantId', title: 'مجوز مبنا' },
            ]}
            actions={(row) =>
              !row.revokedAtUtc &&
              !row.parentGrantId && <PersonalClassAction classId={id} grant={row as Grant} />
            }
          />
        </>
      )}
      {tab === 'history' && history && (
        <ListView
          endpoint={path + '/history'}
          title="سوابق کلاس"
          columns={[
            { key: 'action', title: 'اقدام' },
            { key: 'resourceType', title: 'نوع منبع' },
            { key: 'occurredAtUtc', title: 'زمان' },
            { key: 'actorUserId', title: 'عامل' },
            { key: 'correlationId', title: 'شناسه پیگیری' },
          ]}
        />
      )}
      {can('/api/admin/v1/audit-logs') && (
        <Button asChild variant="outline">
          <Link href={'/admin/audit?targetType=PersonalClass&targetId=' + id}>
            رویدادهای مدیریتی همین کلاس
          </Link>
        </Button>
      )}
    </>
  );
}
