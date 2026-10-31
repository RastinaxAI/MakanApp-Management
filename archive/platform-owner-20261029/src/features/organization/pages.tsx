'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, Users, GraduationCap, BookOpen, Info } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Panel, DataView, IdCopy } from '@/components/ui/data-view';
import { ListView, type ListColumn } from '@/components/ui/list-view';
import { CommandDialog } from '@/components/ui/command-dialog';
import { SectionTabs } from '@/components/ui/section-tabs';
import { LoadingSkeleton, ErrorState, EmptyState, UpdatedAt } from '@/components/ui/states';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import { ApiError } from '@/lib/api/errors';
import { number } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';
export function OrganizationGate({ children }: { children: React.ReactNode }) {
  const { session } = useAccess();
  if (session.context?.workspaceType !== 'Organization' || session.context.activeRole !== 'Manager')
    return (
      <>
        <PageHeader
          title="مدیریت سازمان"
          description="این بخش به فضای کاری سازمان و نقش Manager معتبر نیاز دارد."
        />
        <ErrorState error={new ApiError(403, { code: 'MANAGER_CONTEXT_REQUIRED' })} />
      </>
    );
  return <>{children}</>;
}
export function OrganizationDashboard() {
  const { session } = useAccess();
  const q = useApi<components['schemas']['ManagerDashboardDto']>('/api/v1/dashboards/manager');
  return (
    <>
      <PageHeader title="نمای سازمان" description="اطلاعات آموزشی و عملیاتی سازمان فعال شما" />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className="metrics">
            {[
              ['کلاس فعال', q.data.operationalCounts.activeClassCount],
              ['فراگیر ثبت‌نام‌شده', q.data.operationalCounts.enrolledLearnerCount],
              ['معلم', q.data.operationalCounts.teacherCount],
              ['دعوت در انتظار', q.data.pendingInvitationCount],
            ].map(([title, value]) => (
              <div className="metric" key={title}>
                <div className="metric-title">{title}</div>
                <div className="metric-value">{number(Number(value))}</div>
              </div>
            ))}
          </div>
          <div className="detail-grid">
            <Panel title="جلسات آینده">
              <DataView value={{ upcomingSessions: q.data.upcomingSessions }} />
            </Panel>
            <Panel title="حضور ثبت‌نشده">
              <DataView value={{ attendancePending: q.data.attendancePending }} />
            </Panel>
            <Panel title="وضعیت راه‌اندازی">
              <DataView value={q.data.onboarding} />
            </Panel>
            <Panel title="صف ارزیابی">
              <DataView
                value={{
                  assignmentGradingQueue: q.data.assignmentGradingQueue,
                  examGradingQueue: q.data.examGradingQueue,
                }}
              />
            </Panel>
          </div>
          <UpdatedAt at={q.dataUpdatedAt} />
        </>
      )}
    </>
  );
}
export function PeoplePage() {
  return (
    <>
      <PageHeader
        title="افراد سازمان"
        description="پرونده سازمانی افراد؛ اتصال حساب کاربری برای هر پرونده الزامی نیست."
        action={
          <CommandDialog title="ایجاد پرونده فرد" path="/api/v1/organization/people" resultView />
        }
      />
      <ListView
        endpoint="/api/v1/organization/people"
        title="پرونده‌های سازمان"
        columns={[
          { key: 'displayName', title: 'فرد', link: (r) => '/organization/people/' + r.id },
          { key: 'firstName', title: 'نام' },
          { key: 'lastName', title: 'نام خانوادگی' },
          { key: 'status', title: 'وضعیت' },
          { key: 'isAccountLinked', title: 'حساب متصل' },
          { key: 'personId', title: 'شناسه شخص' },
          { key: 'id', title: 'شناسه پرونده سازمانی' },
        ]}
      />
    </>
  );
}
export function PersonDetail({ id }: { id: string }) {
  const path = '/api/v1/organization/people/' + id;
  const q = useApi<components['schemas']['OrganizationPersonDto']>(path);
  const [invitation, setInvitation] = useState<unknown>(null);
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const person = q.data;
  const reload = async () => {
    const r = await q.refetch();
    return {
      expectedRowVersion: r.data?.rowVersion,
      expectedPersonRowVersion: r.data?.personRowVersion,
    };
  };
  return (
    <>
      <PageHeader
        title={person.displayName ?? `${person.firstName} ${person.lastName}`}
        description="پرونده سازمانی؛ شناسه این پرونده با UserId و PersonId متفاوت است."
        parent={{ href: '/organization/people', label: 'افراد سازمان' }}
        action={
          <CommandDialog
            title="پایان پرونده سازمانی"
            path={path + '/end'}
            defaults={{ expectedRowVersion: person.rowVersion }}
            onReload={reload}
            danger
          />
        }
      />
      <Panel title="مشخصات فرد">
        <DataView value={person} />
        <div className="row-actions mt-5">
          {person.canEditNames && (
            <CommandDialog
              title="ویرایش نام‌های مجاز"
              path={path}
              method="PATCH"
              defaults={{
                firstName: person.firstName,
                lastName: person.lastName,
                displayName: person.displayName,
                expectedRowVersion: person.rowVersion,
                expectedPersonRowVersion: person.personRowVersion,
              }}
              onReload={reload}
            />
          )}
          <CommandDialog
            title="دعوت برای اتصال حساب"
            path={path + '/invitations'}
            defaults={{
              expectedRowVersion: person.rowVersion,
              expiresAtUtc: new Date(Date.now() + 7 * 86400000).toISOString(),
            }}
            onReload={reload}
            onSuccess={setInvitation}
            resultView
          />
        </div>
      </Panel>
      <PersonInvitations organizationPersonId={id} created={invitation} />
    </>
  );
}
function PersonInvitations({
  organizationPersonId,
  created,
}: {
  organizationPersonId: string;
  created: unknown;
}) {
  const [lookup, setLookup] = useState('');
  const [version, setVersion] = useState('');
  const result =
    created && typeof created === 'object' ? (created as Record<string, unknown>) : null;
  const id = typeof result?.id === 'string' ? result.id : lookup;
  const currentVersion = typeof result?.rowVersion === 'string' ? result.rowVersion : version;
  return (
    <Panel
      title="لغو دعوت مجاز"
      description="قرارداد جاری endpoint مستقلی برای فهرست دعوت‌های پرونده ندارد؛ از رسید دعوت استفاده کنید."
    >
      <div className="form-two">
        <label>
          شناسه دعوت
          <input
            dir="ltr"
            value={id}
            onChange={(e) => setLookup(e.target.value)}
            disabled={!!result}
          />
        </label>
        <label>
          نسخه opaque دعوت
          <input
            dir="ltr"
            value={currentVersion}
            onChange={(e) => setVersion(e.target.value)}
            disabled={!!result}
          />
        </label>
      </div>
      <div className="mt-4">
        {/^[0-9a-f-]{36}$/i.test(id) && currentVersion && (
          <CommandDialog
            title="لغو دعوت"
            path={`/api/v1/organization/people/${organizationPersonId}/invitations/${id}/revoke`}
            defaults={{ expectedRowVersion: currentVersion }}
            danger
          />
        )}
      </div>
    </Panel>
  );
}
export function GuardiansPage() {
  return (
    <>
      <PageHeader
        title="روابط سرپرستی"
        description="چرخه فعال‌سازی و پایان روابط سازمانی؛ این رابطه دسترسی به چت خصوصی کودک نمی‌دهد."
        action={
          <CommandDialog
            title="ایجاد رابطه سرپرستی"
            path="/api/v1/organization/guardian-relations"
            resultView
          />
        }
      />
      <ListView
        endpoint="/api/v1/organization/guardian-relations"
        title="روابط سازمان"
        columns={[
          { key: 'id', title: 'رابطه', link: (r) => '/organization/guardians/' + r.id },
          { key: 'guardianUserId', title: 'حساب سرپرست' },
          { key: 'learnerOrganizationPersonId', title: 'پرونده فراگیر' },
          { key: 'status', title: 'وضعیت' },
          { key: 'validFromUtc', title: 'شروع اعتبار' },
          { key: 'endedAtUtc', title: 'پایان' },
        ]}
      />
    </>
  );
}
export function GuardianDetail({ id }: { id: string }) {
  const path = '/api/v1/organization/guardian-relations/' + id;
  const q = useApi<components['schemas']['SchoolGuardianRelationDto']>(path);
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} />;
  return (
    <>
      <PageHeader
        title="جزئیات رابطه سرپرستی"
        description="اطلاعات مجاز رابطه در سازمان فعال"
        parent={{ href: '/organization/guardians', label: 'روابط سرپرستی' }}
      />
      <Panel title="رابطه سرپرستی">
        <DataView value={q.data} />
        <div className="row-actions mt-5">
          {[
            ['activate', 'فعال‌سازی'],
            ['end', 'پایان رابطه'],
            ['revoke', 'لغو رابطه'],
          ].map(([action, title]) => (
            <CommandDialog
              key={action}
              title={title}
              path={path + '/' + action}
              defaults={{ expectedRowVersion: q.data.rowVersion }}
              onReload={async () => {
                const r = await q.refetch();
                return { expectedRowVersion: r.data?.rowVersion };
              }}
              danger={action !== 'activate'}
            />
          ))}
        </div>
      </Panel>
    </>
  );
}
export function OrganizationClasses() {
  return (
    <>
      <PageHeader
        title="کلاس‌های سازمان"
        description="مدیریت کلاس‌ها، انتساب معلم و ثبت‌نام فراگیر در فضای سازمان"
        action={<CommandDialog title="ایجاد کلاس" path="/api/v1/academic/classes" resultView />}
      />
      <div className="row-actions mb-5">
        <CommandDialog title="ایجاد دوره آموزشی" path="/api/v1/academic/periods" resultView />
        <CommandDialog title="ایجاد درس" path="/api/v1/academic/courses" resultView />
      </div>
      <ListView
        endpoint="/api/v1/academic/classes"
        title="کلاس‌های قابل دسترسی"
        columns={[
          { key: 'title', title: 'کلاس', link: (r) => '/organization/classes/' + r.id },
          { key: 'courseTitle', title: 'درس' },
          { key: 'academicPeriodTitle', title: 'دوره' },
          { key: 'status', title: 'وضعیت' },
          { key: 'capacity', title: 'ظرفیت' },
        ]}
      />
    </>
  );
}
export function OrganizationClassDetail({ id }: { id: string }) {
  const q = useApi<components['schemas']['ClassResult'][]>('/api/v1/academic/classes');
  const [lastEnrollment, setLastEnrollment] = useState<unknown>(null),
    [lastTeacher, setLastTeacher] = useState<unknown>(null),
    [rule, setRule] = useState<unknown>(null);
  const data = q.data?.find((c) => c.id === id);
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} />;
  if (!data) return <ErrorState error={new ApiError(404)} />;
  const path = '/api/v1/academic/classes/' + id;
  return (
    <>
      <PageHeader
        title={data.title}
        description="اقدام‌های آموزشی مجاز Manager؛ سرور مرجع نهایی دسترسی است."
        parent={{ href: '/organization/classes', label: 'کلاس‌ها' }}
      />
      <Panel title="مشخصات کلاس">
        <DataView value={data} />
        <div className="row-actions mt-5">
          <CommandDialog
            title="انتساب معلم"
            path={path + '/teachers'}
            onSuccess={setLastTeacher}
            resultView
          />
          <CommandDialog
            title="ثبت‌نام فراگیر"
            path={path + '/enrollments'}
            onSuccess={setLastEnrollment}
            resultView
          />
          <CommandDialog
            title="ایجاد جلسه"
            path={path + '/sessions'}
            defaults={{ timeZoneId: 'Asia/Tehran' }}
            resultView
          />
          <CommandDialog
            title="برنامه تکرار جلسات"
            path={path + '/schedule-rules'}
            defaults={{ timeZoneId: 'Asia/Tehran' }}
            onSuccess={setRule}
            resultView
          />
        </div>
      </Panel>
      <ClassReceipts path={path} enrollment={lastEnrollment} teacher={lastTeacher} rule={rule} />
      <ClassPerformance id={id} />
      <ListView
        endpoint="/api/v1/reports/manager/enrollments"
        fixed={{ ClassId: id }}
        title="ثبت‌نام‌های همین کلاس"
        columns={reportSections.enrollments.columns}
        actions={(r) => (
          <CommandDialog
            title="پایان ثبت‌نام"
            path={`${path}/enrollments/${r.enrollmentId}/end`}
            danger
          />
        )}
      />
    </>
  );
}
function ClassReceipts({
  path,
  enrollment,
  teacher,
  rule,
}: {
  path: string;
  enrollment: unknown;
  teacher: unknown;
  rule: unknown;
}) {
  const e =
    enrollment && typeof enrollment === 'object' ? (enrollment as Record<string, unknown>) : null;
  const t = teacher && typeof teacher === 'object' ? (teacher as Record<string, unknown>) : null;
  const r = rule && typeof rule === 'object' ? (rule as Record<string, unknown>) : null;
  return (
    <>
      {e && (
        <Panel title="رسید آخرین ثبت‌نام">
          <DataView value={e} />
          <div className="mt-4">
            <CommandDialog
              title="پایان این ثبت‌نام"
              path={`${path}/enrollments/${e.id}/end`}
              danger
            />
          </div>
        </Panel>
      )}
      {t && (
        <Panel title="رسید آخرین انتساب معلم">
          <DataView value={t} />
          <div className="mt-4">
            <CommandDialog title="پایان این انتساب" path={`${path}/teachers/${t.id}/end`} danger />
          </div>
        </Panel>
      )}
      {r && (
        <Panel title="الگوی جلسات ایجادشده">
          <DataView value={r} />
          <div className="mt-4">
            <CommandDialog
              title="اصلاح الگوی جلسات"
              path={`/api/v1/academic/schedule-rules/${r.id}`}
              method="PATCH"
              defaults={{ ...r, expectedRowVersion: r.rowVersion }}
              resultView
            />
          </div>
        </Panel>
      )}
    </>
  );
}
function ClassPerformance({ id }: { id: string }) {
  const q = useApi<components['schemas']['ManagerClassPerformanceDto']>(
    '/api/v1/reports/manager/classes/' + id,
  );
  return (
    <Panel title="خلاصه عملکرد کلاس">
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} />
      ) : (
        <DataView value={q.data} />
      )}
    </Panel>
  );
}
const reportSections: Record<string, { label: string; columns: ListColumn[] }> = {
  enrollments: {
    label: 'ثبت‌نام',
    columns: [
      { key: 'learnerDisplayName', title: 'فراگیر' },
      { key: 'classTitle', title: 'کلاس' },
      { key: 'courseTitle', title: 'درس' },
      { key: 'status', title: 'وضعیت' },
      { key: 'enrolledAtUtc', title: 'ثبت‌نام' },
      { key: 'learnerOrganizationPersonId', title: 'پرونده فراگیر' },
    ],
  },
  attendance: {
    label: 'حضور',
    columns: [
      { key: 'classTitle', title: 'کلاس' },
      { key: 'eligibleRecordCount', title: 'واجد ثبت' },
      { key: 'recordedCount', title: 'ثبت‌شده' },
      { key: 'presentCount', title: 'حاضر' },
      { key: 'absentCount', title: 'غایب' },
      { key: 'lateCount', title: 'با تأخیر' },
      { key: 'notRecordedCount', title: 'ثبت‌نشده' },
      { key: 'recordedAbsencePercentage', title: 'درصد غیبت ثبت‌شده' },
    ],
  },
  assessments: {
    label: 'ارزیابی',
    columns: [
      { key: 'title', title: 'ارزیابی' },
      { key: 'classTitle', title: 'کلاس' },
      { key: 'kind', title: 'نوع' },
      { key: 'maximumScore', title: 'نمره کل' },
      { key: 'recipientCount', title: 'گیرندگان' },
      { key: 'submittedOrFinalizedCount', title: 'تحویل یا نهایی‌شده' },
      { key: 'releasedResultCount', title: 'نتیجه منتشرشده' },
      { key: 'pendingGradingCount', title: 'در انتظار تصحیح' },
    ],
  },
  'teacher-workload': {
    label: 'بار کاری معلمان',
    columns: [
      { key: 'teacherDisplayName', title: 'معلم' },
      { key: 'activeClassCount', title: 'کلاس فعال' },
      { key: 'completedSessionCount', title: 'جلسه تکمیل‌شده' },
      { key: 'attendanceMissingCount', title: 'حضور ثبت‌نشده' },
      { key: 'assignmentPendingGradingCount', title: 'تکلیف در انتظار ارزیابی' },
      { key: 'examPendingGradingCount', title: 'آزمون در انتظار تصحیح' },
    ],
  },
};
export function ReportsPage() {
  const tab = useSearchParams().get('tab') ?? 'enrollments';
  const section = reportSections[tab] ?? reportSections.enrollments;
  return (
    <>
      <PageHeader
        title="گزارش‌های آموزشی"
        description="اطلاعات تجمیعی و گزارش‌های مدیریتی سازمان فعال"
      />
      <SectionTabs
        defaultTab="enrollments"
        tabs={Object.entries(reportSections).map(([key, v]) => ({ key, label: v.label }))}
      />
      <ListView
        key={tab}
        endpoint={'/api/v1/reports/manager/' + (reportSections[tab] ? tab : 'enrollments')}
        columns={section.columns}
        title={'گزارش ' + section.label}
      />
    </>
  );
}
