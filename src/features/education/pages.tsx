'use client';
import { useSearchParams } from 'next/navigation';
import { Info } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ListView, type ListColumn } from '@/components/ui/list-view';
import { SectionTabs } from '@/components/ui/section-tabs';
import { Panel, DataView } from '@/components/ui/data-view';
import { LoadingSkeleton, ErrorState } from '@/components/ui/states';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
const sections: Record<
  string,
  { label: string; endpoint: string; columns: ListColumn[]; status?: string }
> = {
  classes: {
    label: 'کلاس‌ها',
    endpoint: 'classes',
    status: 'ClassStatus',
    columns: [
      {
        key: 'title',
        title: 'کلاس',
        sub: 'courseTitle',
        link: (r) => '/admin/education/' + r.classId,
      },
      { key: 'organization.name', title: 'سازمان' },
      { key: 'academicPeriodTitle', title: 'دوره' },
      { key: 'status', title: 'وضعیت' },
      { key: 'activeTeacherCount', title: 'معلم فعال' },
      { key: 'activeLearnerCount', title: 'فراگیر فعال' },
      { key: 'capacity', title: 'ظرفیت' },
    ],
  },
  teachers: {
    label: 'معلمان',
    endpoint: 'teachers',
    columns: [
      { key: 'displayName', title: 'معلم' },
      { key: 'classTitle', title: 'کلاس', link: (r) => '/admin/education/' + r.classId },
      { key: 'organization.name', title: 'سازمان' },
      { key: 'status', title: 'وضعیت' },
      { key: 'assignedAtUtc', title: 'زمان انتساب' },
      { key: 'teacherAssignmentId', title: 'شناسه انتساب' },
    ],
  },
  enrollments: {
    label: 'ثبت‌نام‌ها',
    endpoint: 'enrollments',
    columns: [
      { key: 'displayName', title: 'فراگیر' },
      { key: 'classTitle', title: 'کلاس', link: (r) => '/admin/education/' + r.classId },
      { key: 'organization.name', title: 'سازمان' },
      { key: 'status', title: 'وضعیت' },
      { key: 'organizationPersonId', title: 'شناسه پرونده سازمانی' },
      { key: 'userId', title: 'شناسه حساب متصل' },
      { key: 'enrolledAtUtc', title: 'ثبت‌نام' },
    ],
  },
  assignments: {
    label: 'تکالیف',
    endpoint: 'assignments',
    columns: [
      { key: 'currentTitle', title: 'تکلیف' },
      { key: 'classTitle', title: 'کلاس' },
      { key: 'organization.name', title: 'سازمان' },
      { key: 'status', title: 'وضعیت' },
      { key: 'currentVersionNumber', title: 'نسخه' },
      { key: 'currentMaxScore', title: 'نمره کل' },
      { key: 'publishedAtUtc', title: 'انتشار' },
    ],
  },
  exams: {
    label: 'آزمون‌ها',
    endpoint: 'exams',
    columns: [
      { key: 'currentTitle', title: 'آزمون' },
      { key: 'classTitle', title: 'کلاس' },
      { key: 'organization.name', title: 'سازمان' },
      { key: 'status', title: 'وضعیت' },
      { key: 'currentVersionNumber', title: 'نسخه' },
      { key: 'currentMaxScore', title: 'نمره کل' },
      { key: 'createdAtUtc', title: 'ایجاد' },
    ],
  },
};
export function EducationPage() {
  const { can } = useAccess();
  const available = Object.entries(sections).filter(([, v]) =>
    can('/api/admin/v1/education/' + v.endpoint),
  );
  const defaultTab = available[0]?.[0] ?? 'classes';
  const tab = useSearchParams().get('tab') ?? defaultTab;
  const section = sections[tab] ?? sections.classes;
  return (
    <>
      <PageHeader
        title="آموزش"
        description="مدل‌های خواندنی آموزش در سطح پلتفرم؛ تغییرات آموزشی از فضای مجاز سازمان انجام می‌شوند."
      />
      <SectionTabs
        defaultTab={defaultTab}
        tabs={available.map(([key, value]) => ({ key, label: value.label }))}
      />
      <ListView
        key={tab}
        endpoint={'/api/admin/v1/education/' + section.endpoint}
        columns={section.columns}
        title={section.label}
        statusEnum={section.status}
      />
    </>
  );
}
export function ClassDetail({ id }: { id: string }) {
  const path = '/api/admin/v1/education/classes/' + id;
  const { can } = useAccess();
  const q = useApi<components['schemas']['PlatformClassDetail']>(path);
  const tab = useSearchParams().get('tab') ?? 'overview';
  if (!can(path)) return <ErrorState error={new ApiError(403)} />;
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const data = q.data;
  return (
    <>
      <PageHeader
        title={data.class.title}
        description="مشخصات کلاس و خلاصه اطلاعات آموزشی"
        parent={{ href: '/admin/education', label: 'آموزش' }}
      />
      <SectionTabs
        defaultTab="overview"
        tabs={[
          { key: 'overview', label: 'مشخصات و خلاصه' },
          ...(can('/api/admin/v1/education/teachers')
            ? [{ key: 'teachers', label: 'معلمان' }]
            : []),
          ...(can('/api/admin/v1/education/enrollments')
            ? [{ key: 'learners', label: 'ثبت‌نام فراگیران' }]
            : []),
        ]}
      />
      {tab === 'overview' && (
        <div className="detail-grid">
          <Panel title="مشخصات کلاس">
            <DataView value={data.class} />
          </Panel>
          <Panel
            title="فراگیران فعال در خلاصه پاسخ"
            description={
              data.activeLearnersTruncated
                ? 'فهرست محدود شده؛ فهرست کامل در تب فراگیران است.'
                : 'خلاصه فراگیران فعال همین کلاس'
            }
          >
            {data.activeLearners.length ? (
              <ul className="readiness-list">
                {data.activeLearners.map((person) => (
                  <li key={person.referenceId}>
                    <div>
                      <strong>{person.displayName}</strong>
                      <p className="field-help">
                        {person.userId ? 'حساب کاربری متصل دارد' : 'بدون حساب کاربری متصل'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="field-help">فراگیر فعالی در خلاصه پاسخ وجود ندارد.</p>
            )}
          </Panel>
          <Panel title="خلاصه جلسات">
            <DataView value={data.sessions} />
          </Panel>
          <Panel title="خلاصه ارزیابی">
            <DataView value={data.assessments} />
          </Panel>
          <Panel title="خلاصه حضور">
            <DataView value={data.attendance} />
          </Panel>
          <Panel
            title="معلمان فعال در خلاصه پاسخ"
            description={
              data.activeTeachersTruncated
                ? 'فهرست محدود شده؛ برای مرور کامل، تب معلمان را بررسی کنید.'
                : 'اطلاعات خلاصه معلمان فعال'
            }
          >
            <DataView value={{ teachers: data.activeTeachers }} />
          </Panel>
        </div>
      )}
      {(data.activeLearnersTruncated || data.activeTeachersTruncated) && (
        <div className="notice">
          <Info size={18} />
          فهرست‌های خلاصه پاسخ محدود شده‌اند؛ این خلاصه، فهرست کامل اعضای کلاس نیست.
        </div>
      )}
      {tab === 'teachers' && (
        <ListView
          endpoint="/api/admin/v1/education/teachers"
          fixed={{ classId: id, organizationId: data.class.organization.id }}
          columns={sections.teachers.columns}
          title="انتساب‌های معلم همین کلاس"
        />
      )}
      {tab === 'learners' && (
        <>
          <div className="notice">
            <Info size={18} />
            اطلاعات از قرارداد نوع‌دار ثبت‌نام‌ها دریافت می‌شود. حساب متصل برای هر فراگیر الزامی
            نیست.
          </div>
          <ListView
            endpoint="/api/admin/v1/education/enrollments"
            fixed={{ classId: id, organizationId: data.class.organization.id }}
            columns={sections.enrollments.columns}
            title="ثبت‌نام‌های همین کلاس"
          />
        </>
      )}
    </>
  );
}
