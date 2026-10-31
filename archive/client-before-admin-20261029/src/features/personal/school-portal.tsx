'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  BookOpen,
  Users,
  ClipboardList,
  GraduationCap,
  CalendarDays,
  Library,
  ShieldCheck,
} from 'lucide-react';
import { usePersonal, usePersonalApi } from './provider';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton, ErrorState, EmptyState, label } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { base, Card, SchoolHeading, Pager } from './school/shared';
import {
  Classes,
  People,
  Teachers,
  Enrollments,
  AssignTeachers,
  Guardians,
} from './school/manager';
import { Assignments, AssignmentDetail, Schedule, TeacherLearners } from './school/learning';
import { Exams, ExamEditor, StudentExam } from './school/exams';
import s from './school/school.module.css';
type S = components['schemas'];
export function PersonalEducation({ section = [] }: { section?: string[] }) {
  const { session } = usePersonal();
  const active = session.context.workspaceType === 'Organization';
  const role = session.context.activeRole;
  const manager = role === 'Manager',
    teacher = role === 'Teacher',
    parent = role === 'Parent';
  const spaces = usePersonalApi<S['WorkspaceResult'][]>('/api/v1/workspaces/me');
  const current = spaces.data?.find(
    (item) => item.membershipId === session.context.membershipId && item.role === role,
  );
  const page = section[0] ?? 'overview';
  const tabs = parent
    ? [
        ['overview', 'فرزندان من', Users],
        ['assignments', 'تکلیف‌های فرزند', ClipboardList],
        ['exams', 'آزمون‌های فرزند', BookOpen],
      ]
    : [
        ['overview', 'نمای آموزشگاه', Building2],
        ['classes', 'کلاس‌ها', BookOpen],
        ...(manager
          ? [
              ['people', 'پرونده‌ها', Users],
              ['teachers', 'معلمان', GraduationCap],
              ['students', 'دانش‌آموزان', Users],
              ['guardians', 'والدین', ShieldCheck],
            ]
          : []),
        ...(!manager
          ? [
              ['assignments', 'تکلیف‌ها', ClipboardList],
              ['exams', 'آزمون‌ها', BookOpen],
            ]
          : []),
        ['schedule', 'برنامهٔ کلاس', CalendarDays],
        ['resources', 'درس و جزوه', Library],
      ];
  if (!active)
    return (
      <div className={s.portal}>
        <SchoolHeading
          title="آموزشگاه‌های من"
          description="آموزشگاه و نقش خود را انتخاب کنید؛ فعالیت آموزشی در همان فضای مجاز انجام می‌شود."
        />
        <WorkspaceList />
      </div>
    );
  if (!['Manager', 'Teacher', 'Student', 'Parent'].includes(role ?? ''))
    return <ErrorState error={new ApiError(403)} />;
  const allowed =
    tabs.some(([key]) => key === page) ||
    (['classes', 'assignments', 'exams'].includes(page) && !parent);
  return (
    <div className={s.portal} key={session.revision}>
      <div className={s.context}>
        <Building2 size={30} />
        <div>
          <strong>{current?.organizationName ?? 'آموزشگاه فعال'}</strong>
          <small>{label(role ?? '')} · فضای آموزشی</small>
        </div>
      </div>
      <nav className={s.tabs} aria-label="بخش‌های آموزشگاه">
        {tabs.map(([key, title, Icon]) => {
          const Component = Icon as typeof Users;
          return (
            <Link
              key={String(key)}
              href={key === 'overview' ? base : base + '/' + key}
              aria-current={page === key ? 'page' : undefined}
            >
              <Component size={18} />
              {String(title)}
            </Link>
          );
        })}
      </nav>
      {!allowed ? (
        <ErrorState error={new ApiError(403)} />
      ) : parent ? (
        <ParentSchool page={page} />
      ) : page === 'overview' ? (
        <SchoolOverview manager={manager} />
      ) : page === 'classes' && section[1] ? (
        <ClassDetail id={section[1]} manager={manager} teacher={teacher} />
      ) : page === 'classes' ? (
        <Classes manage={manager} />
      ) : page === 'people' && manager ? (
        <People />
      ) : page === 'teachers' && manager ? (
        <Teachers />
      ) : page === 'students' && manager ? (
        <>
          <SchoolHeading
            title="دانش‌آموزان آموزشگاه"
            description="ثبت‌نام‌های کلاس‌ها؛ برای افزودن دانش‌آموز، وارد کلاس مقصد شوید."
          />
          <Enrollments />
        </>
      ) : page === 'guardians' && manager ? (
        <Guardians />
      ) : page === 'assignments' && section[1] ? (
        <AssignmentDetail id={section[1]} teach={teacher || manager} />
      ) : page === 'assignments' ? (
        <Assignments teach={teacher} />
      ) : page === 'exams' && section[1] ? (
        section[2] === 'edit' ? (
          teacher || manager ? (
            <ExamEditor id={section[1]} />
          ) : (
            <ErrorState error={new ApiError(403)} />
          )
        ) : (
          <StudentExam id={section[1]} />
        )
      ) : page === 'exams' ? (
        <Exams teach={teacher} />
      ) : page === 'schedule' ? (
        <>
          <SchoolHeading title="برنامهٔ کلاس‌ها" />
          <Schedule teach={teacher || manager} />
        </>
      ) : (
        <>
          <SchoolHeading title="درس‌ها و جزوه‌های کلاس" />
          <Card>
            <EmptyState
              title="محتوای کلاسی هنوز فعال نشده است"
              description="محل درس، جزوه و فایل آموزشی هر کلاس اینجا خواهد بود. فعلاً جلسه‌ها و تکلیف‌های منتشرشده از صفحهٔ کلاس در دسترس‌اند."
            />
            <Button asChild variant="outline">
              <Link href={base + '/classes'}>رفتن به کلاس‌ها</Link>
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
function WorkspaceList() {
  const { selectWorkspace } = usePersonal();
  const q = usePersonalApi<S['WorkspaceResult'][]>('/api/v1/workspaces/me');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const organizations = q.data.filter((w) => w.workspaceType === 'Organization');
  return (
    <>
      {organizations.length ? (
        <div className={s.grid}>
          {organizations.map((w) => (
            <div key={w.membershipId + ':' + w.role} className={s.classCard}>
              <Building2 size={28} />
              <h2>{w.organizationName}</h2>
              <p>{label(w.role ?? '')}</p>
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await selectWorkspace({
                      workspaceType: 'Organization',
                      membershipId: w.membershipId,
                      role: w.role,
                    });
                  } catch (e) {
                    setError(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                ورود به این آموزشگاه
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="هنوز عضو آموزشگاهی نیستید"
            description="پس از عضویت معتبر، آموزشگاه اینجا نمایش داده می‌شود. امکانات شخصی شما مستقل باقی می‌ماند."
          />
        </Card>
      )}
      {!!error && <ErrorState error={error} />}
    </>
  );
}
function SchoolOverview({ manager }: { manager: boolean }) {
  const { session } = usePersonal();
  const q = usePersonalApi<
    S['ManagerDashboardDto'] | S['TeacherDashboardDto'] | S['StudentDashboardDto']
  >('/api/v1/dashboards/' + session.context.activeRole!.toLowerCase());
  return (
    <>
      <SchoolHeading
        title={
          manager
            ? 'مدیریت آموزشگاه'
            : session.context.activeRole === 'Teacher'
              ? 'میز کار معلم'
              : 'مسیر یادگیری من'
        }
        description={
          manager
            ? 'از ساخت کلاس تا پیگیری اعضا؛ کارهای اصلی آموزشگاه در دسترس شماست.'
            : 'کلاس، برنامه، تکلیف و آزمون؛ فعالیت‌های آموزشی شما در یک جا.'
        }
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.organizationId !== session.context.organizationId ? (
        <ErrorState error={new ApiError(409)} />
      ) : (
        <>
          {'operationalCounts' in q.data && (
            <div className={s.stats}>
              <div>
                <strong>{q.data.operationalCounts.activeClassCount}</strong>
                <small>کلاس فعال</small>
              </div>
              <div>
                <strong>{q.data.operationalCounts.enrolledLearnerCount}</strong>
                <small>دانش‌آموز ثبت‌نام‌شده</small>
              </div>
              <div>
                <strong>{q.data.operationalCounts.teacherCount}</strong>
                <small>معلم</small>
              </div>
            </div>
          )}
          <div className={s.grid}>
            {(manager
              ? [
                  [
                    'classes',
                    'کلاس‌ها و تقسیم‌بندی',
                    'ساخت کلاس، ثبت‌نام دانش‌آموز و انتخاب معلمان',
                  ],
                  ['people', 'پرونده‌های آموزشگاه', 'فهرست افراد و افزودن پرونده'],
                  ['guardians', 'دسترسی والدین', 'رابطهٔ والد و فرزند و فعال‌سازی دسترسی'],
                ]
              : [
                  ['classes', 'کلاس‌های من', 'جلسه‌ها و فعالیت‌های هر کلاس'],
                  ['assignments', 'تکلیف‌ها', 'مشاهده، آماده‌سازی و تحویل تکلیف'],
                  ['exams', 'آزمون‌ها', 'آماده‌سازی یا شرکت در آزمون'],
                ]
            ).map(([key, title, detail]) => (
              <Link key={key} className={s.classCard} href={base + '/' + key}>
                <BookOpen size={28} />
                <h2>{title}</h2>
                <p>{detail}</p>
                <footer>مشاهده و مدیریت</footer>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <Schedule teach={false} />
          </div>
        </>
      )}
    </>
  );
}
function ClassDetail({ id, manager, teacher }: { id: string; manager: boolean; teacher: boolean }) {
  const q = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes');
  const [tab, setTab] = useState('sessions');
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data.find((c) => c.id === id);
  if (!item) return <ErrorState error={new ApiError(404)} />;
  return (
    <>
      <SchoolHeading
        title={item.title}
        description={item.courseTitle + ' · ' + item.academicPeriodTitle}
        back
      />
      <nav className={s.tabs} aria-label="بخش‌های کلاس">
        {[
          ['sessions', 'جلسه‌ها'],
          ['assignments', 'تکلیف‌ها'],
          ['exams', 'آزمون‌ها'],
          ...(manager || teacher ? [['learners', 'دانش‌آموزان']] : []),
          ...(manager ? [['teachers', 'معلمان']] : []),
        ].map(([key, title]) => (
          <Button
            variant={tab === key ? 'default' : 'outline'}
            key={key}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
          >
            {title}
          </Button>
        ))}
      </nav>
      {tab === 'sessions' ? (
        <Schedule classId={id} teach={teacher || manager} />
      ) : tab === 'assignments' ? (
        <Assignments classId={id} teach={teacher || manager} />
      ) : tab === 'exams' ? (
        <Exams classId={id} teach={teacher || manager} />
      ) : tab === 'learners' ? (
        manager ? (
          <Enrollments classId={id} />
        ) : (
          <TeacherLearners classId={id} />
        )
      ) : (
        <AssignTeachers classId={id} />
      )}
    </>
  );
}
function ParentSchool({ page }: { page: string }) {
  const { session, call, reload } = usePersonal();
  const children = usePersonalApi<S['AuthorizedChildResult'][]>('/api/v1/guardian/children', {
    poll: 5000,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const active = children.isSuccess
    ? children.data?.find(
        (child) =>
          child.organizationId === session.context.organizationId &&
          child.learnerOrganizationPersonId === session.context.subjectOrganizationPersonId &&
          child.relationStatus === 'Active',
      )
    : undefined;
  return (
    <>
      <SchoolHeading
        title={
          page === 'overview'
            ? 'فرزندان من'
            : page === 'assignments'
              ? 'تکلیف‌های فرزند'
              : 'آزمون‌های فرزند'
        }
        description="اطلاعات فقط برای فرزند انتخاب‌شده و رابطهٔ معتبر نمایش داده می‌شود."
      />
      <Card title="انتخاب فرزند">
        {children.isPending ? (
          <LoadingSkeleton />
        ) : children.isError ? (
          <ErrorState error={children.error} />
        ) : children.data.length ? (
          <div className={s.row}>
            {children.data
              .filter((child) => child.organizationId === session.context.organizationId)
              .map((child) => (
                <Button
                  key={child.learnerOrganizationPersonId}
                  variant={
                    active?.learnerOrganizationPersonId === child.learnerOrganizationPersonId
                      ? 'default'
                      : 'outline'
                  }
                  disabled={busy || child.relationStatus !== 'Active'}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await call(
                        '/api/v1/guardian/children/' +
                          child.learnerOrganizationPersonId +
                          '/select',
                        { method: 'POST' },
                      );
                      await reload();
                    } catch (e) {
                      setError(e);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {child.displayName} · {label(child.relationStatus)}
                </Button>
              ))}
          </div>
        ) : (
          <EmptyState
            title="رابطهٔ فعالی برای نمایش موجود نیست"
            description="مدیر آموزشگاه باید رابطهٔ معتبر شما و فرزندتان را ثبت و فعال کند."
          />
        )}
        {!!error && <ErrorState error={error} />}
      </Card>
      {active &&
        (page === 'overview' ? (
          <>
            <p className={s.notice}>
              {active.displayName} انتخاب شده است. تکلیف‌ها و آزمون‌ها از گزینه‌های بالا قابل
              پیگیری‌اند.
            </p>
            <ParentReports kind="assignments" />
          </>
        ) : (
          <ParentReports
            key={session.revision + page}
            kind={page === 'assignments' ? 'assignments' : 'exams'}
          />
        ))}
    </>
  );
}
function ParentReports({ kind }: { kind: 'assignments' | 'exams' }) {
  const [page, setPage] = useState(1);
  const q = usePersonalApi<
    S['ReportPageOfParentAssignmentReportItem'] | S['ReportPageOfParentExamReportItem']
  >(`/api/v1/reports/parent/${kind}?PageNumber=${page}&PageSize=30`);
  return (
    <Card title={kind === 'assignments' ? 'وضعیت تکلیف‌های فرزند' : 'وضعیت آزمون‌های فرزند'}>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {q.data.items.length ? (
            <div className={s.editorList}>
              {q.data.items.map((item, index) => (
                <div className={s.question} key={index}>
                  <h3>{item.title}</h3>
                  <p className={s.hint}>{item.classTitle}</p>
                  <p>
                    {'submissionStatus' in item
                      ? item.submissionStatus
                        ? label(item.submissionStatus)
                        : 'تحویل نداده'
                      : item.latestAttemptStatus
                        ? label(item.latestAttemptStatus)
                        : 'هنوز شرکت نکرده'}
                  </p>
                  <p>
                    نمرهٔ منتشرشده:{' '}
                    {item.releasedScore === null
                      ? 'هنوز منتشر نشده'
                      : item.releasedScore + ' از ' + item.maximumScore}
                  </p>
                  {item.guardianVisibleFeedback && (
                    <p className={s.bodyText}>{item.guardianVisibleFeedback}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="موردی برای فرزند انتخاب‌شده موجود نیست" />
          )}
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
