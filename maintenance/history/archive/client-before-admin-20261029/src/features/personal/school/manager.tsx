'use client';
import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { usePersonalApi } from '../provider';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton, ErrorState, EmptyState, label } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import {
  base,
  Card,
  Field,
  FormDialog,
  Pager,
  SchoolHeading,
  Status,
  useSchoolAction,
} from './shared';
import s from './school.module.css';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';
type S = components['schemas'];
export function Classes({ manage }: { manage: boolean }) {
  const q = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes');
  return (
    <>
      <SchoolHeading
        title="کلاس‌های آموزشگاه"
        description={
          manage
            ? 'کلاس بسازید، دانش‌آموزان را تقسیم‌بندی کنید و معلمان کلاس را مشخص کنید.'
            : 'کلاس‌های مجاز شما؛ برنامه، تکلیف و آزمون هر کلاس در یک جا.'
        }
        action={
          manage &&
          q.data && (
            <FormDialog title="ایجاد کلاس">
              <CreateClass classes={q.data} />
            </FormDialog>
          )
        }
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length ? (
        <div className={s.grid}>
          {q.data.map((item) => (
            <Link className={s.classCard} key={item.id} href={base + '/classes/' + item.id}>
              <BookOpen size={30} />
              <h2>{item.title}</h2>
              <p>
                {item.courseTitle}
                <br />
                {item.academicPeriodTitle}
              </p>
              <footer>
                <Status>{label(item.status)}</Status>
                <span>
                  ورود به کلاس <ChevronLeft size={15} />
                </span>
              </footer>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="هنوز کلاسی وجود ندارد"
            description={
              manage
                ? 'از «ایجاد کلاس» شروع کنید؛ سپس دانش‌آموز و معلم را به کلاس اضافه کنید.'
                : 'کلاس‌های اختصاص‌یافته پس از ثبت آموزشگاه اینجا نمایش داده می‌شوند.'
            }
          />
        </Card>
      )}
    </>
  );
}
function CreateClass({ classes }: { classes: S['ClassResult'][] }) {
  const [course, setCourse] = useState(''),
    [period, setPeriod] = useState(''),
    [courseName, setCourseName] = useState(''),
    [periodName, setPeriodName] = useState(''),
    [start, setStart] = useState(''),
    [end, setEnd] = useState(''),
    [created, setCreated] = useState<S['ClassResult']>();
  const [extraCourse, setExtraCourse] = useState<S['CourseResult']>(),
    [extraPeriod, setExtraPeriod] = useState<S['AcademicPeriodResult']>();
  const a = useSchoolAction();
  const courses = new Map(classes.map((c) => [c.courseId, c.courseTitle]));
  if (extraCourse) courses.set(extraCourse.id, extraCourse.title);
  const periods = new Map(classes.map((c) => [c.academicPeriodId, c.academicPeriodTitle]));
  if (extraPeriod) periods.set(extraPeriod.id, extraPeriod.title);
  return (
    <>
      {created ? (
        <div className={s.receipt}>
          <h2>کلاس ایجاد شد</h2>
          <p>{created.title}</p>
          <Button asChild>
            <Link href={base + '/classes/' + created.id}>مدیریت دانش‌آموزان و معلمان</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className={s.hint}>
            درس و دورهٔ استفاده‌شده در کلاس‌ها را انتخاب کنید یا یک مورد جدید بسازید.
          </p>
          <Field label="درس">
            <select value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="">درس جدید…</option>
              {[...courses].map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </Field>
          {!course && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await a.run<S['CourseResult']>('/api/v1/academic/courses', {
                  title: courseName.trim(),
                });
                if (result) {
                  setExtraCourse(result);
                  setCourse(result.id);
                }
              }}
            >
              <Field label="عنوان درس جدید">
                <input
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="مثلاً ریاضی پایه هفتم"
                />
              </Field>
              <Button type="submit" disabled={a.busy}>
                ثبت درس
              </Button>
            </form>
          )}
          <Field label="دورهٔ آموزشی">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="">دورهٔ جدید…</option>
              {[...periods].map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </Field>
          {!period && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (end < start) return;
                const result = await a.run<S['AcademicPeriodResult']>('/api/v1/academic/periods', {
                  title: periodName.trim(),
                  startDate: start,
                  endDate: end,
                });
                if (result) {
                  setExtraPeriod(result);
                  setPeriod(result.id);
                }
              }}
            >
              <Field label="عنوان دوره">
                <input
                  required
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                />
              </Field>
              <div className={s.two}>
                <Field label="شروع دوره">
                  <JalaliDateInput required value={start} onValueChange={setStart} />
                </Field>
                <Field label="پایان دوره">
                  <JalaliDateInput required min={start} value={end} onValueChange={setEnd} />
                </Field>
              </div>
              <Button type="submit" disabled={a.busy}>
                ثبت دوره
              </Button>
            </form>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const result = await a.run<S['ClassResult']>('/api/v1/academic/classes', {
                courseId: course,
                academicPeriodId: period,
                title: String(data.get('title')).trim(),
                capacity: Number(data.get('capacity')),
                activateImmediately: data.get('active') === 'on',
              });
              if (result) setCreated(result);
            }}
          >
            <Field label="نام کلاس">
              <input name="title" required placeholder="مثلاً کلاس هفتم الف" />
            </Field>
            <Field label="ظرفیت کلاس">
              <input name="capacity" type="number" required min={1} step={1} />
            </Field>
            <label className={s.check}>
              <input name="active" type="checkbox" defaultChecked />
              کلاس پس از ایجاد فعال باشد
            </label>
            <Button type="submit" disabled={a.busy || !course || !period}>
              {a.busy ? 'در حال ثبت…' : 'ثبت کلاس'}
            </Button>
          </form>
        </>
      )}
      {a.feedback}
    </>
  );
}
export function People() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState('');
  const q = usePersonalApi<S['OrganizationPeoplePage']>(
    '/api/v1/organization/people?' +
      new URLSearchParams({
        page: String(page),
        pageSize: '30',
        ...(query ? { search: query } : {}),
      }),
  );
  return (
    <>
      <SchoolHeading
        title="پرونده‌های آموزشگاه"
        description="همهٔ پرونده‌ها؛ نقش آموزشی و ثبت‌نام کلاس، جداگانه مدیریت می‌شوند."
        action={
          <FormDialog title="افزودن پرونده">
            <CreatePerson />
          </FormDialog>
        }
      />
      <form
        className={s.toolbar}
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
          setPage(1);
        }}
      >
        <input
          aria-label="جستجوی پرونده‌ها"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="نام فرد…"
        />
        <Button type="submit">جستجو</Button>
      </form>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Card>
            {q.data.items.length ? (
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>نام و نام خانوادگی</th>
                      <th>وضعیت پرونده</th>
                      <th>اتصال به حساب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.items.map((p) => (
                      <tr key={p.id}>
                        <td>{p.displayName || p.firstName + ' ' + p.lastName}</td>
                        <td>
                          <Status>{label(p.status)}</Status>
                        </td>
                        <td>{p.isAccountLinked ? 'متصل' : 'هنوز متصل نشده'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="پرونده‌ای پیدا نشد" />
            )}
          </Card>
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </>
  );
}
function CreatePerson() {
  const a = useSchoolAction();
  const [operation] = useState(() => crypto.randomUUID());
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        await a.run('/api/v1/organization/people', {
          clientOperationId: operation,
          firstName: f.get('first'),
          lastName: f.get('last'),
          displayName: null,
          reason: f.get('reason'),
        });
      }}
    >
      <div className={s.two}>
        <Field label="نام">
          <input name="first" required />
        </Field>
        <Field label="نام خانوادگی">
          <input name="last" required />
        </Field>
      </div>
      <Field label="دلیل ایجاد پرونده">
        <input name="reason" required />
      </Field>
      <p className={s.hint}>ساخت پرونده حساب جدید یا نقش آموزشی ایجاد نمی‌کند.</p>
      <Button disabled={a.busy}>ثبت پرونده</Button>
      {a.feedback}
    </form>
  );
}
export function Teachers() {
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['ReportPageOfManagerTeacherWorkloadReportItem']>(
    `/api/v1/reports/manager/teacher-workload?PageNumber=${page}&PageSize=30`,
  );
  return (
    <>
      <SchoolHeading
        title="معلمان آموزشگاه"
        description="معلمان گزارش‌شدهٔ آموزشگاه و کلاس‌های فعال آن‌ها. برای انتساب، وارد کلاس موردنظر شوید."
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Card>
            {q.data.items.length ? (
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>معلم</th>
                      <th>کلاس فعال</th>
                      <th>تکلیف در انتظار بررسی</th>
                      <th>آزمون در انتظار بررسی</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.items.map((t) => (
                      <tr key={t.teacherMembershipId}>
                        <td>{t.teacherDisplayName}</td>
                        <td>{t.activeClassCount}</td>
                        <td>{t.assignmentPendingGradingCount}</td>
                        <td>{t.examPendingGradingCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="معلمی در گزارش موجود نیست" />
            )}
          </Card>
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </>
  );
}
export function Enrollments({ classId }: { classId?: string }) {
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['ReportPageOfManagerEnrollmentReportItem']>(
    `/api/v1/reports/manager/enrollments?PageNumber=${page}&PageSize=30` +
      (classId ? '&ClassId=' + classId : ''),
  );
  return (
    <Card
      title={classId ? 'دانش‌آموزان این کلاس' : 'دانش‌آموزان ثبت‌نام‌شده'}
      action={
        classId && (
          <FormDialog title="ثبت‌نام دانش‌آموز">
            <Enroll classId={classId} />
          </FormDialog>
        )
      }
    >
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {q.data.items.length ? (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>دانش‌آموز</th>
                    <th>کلاس</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((row) => (
                    <tr key={row.enrollmentId}>
                      <td>{row.learnerDisplayName}</td>
                      <td>
                        <Link href={base + '/classes/' + row.classId}>{row.classTitle}</Link>
                      </td>
                      <td>{label(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="ثبت‌نامی وجود ندارد"
              description="پس از ثبت‌نام در کلاس، دانش‌آموز اینجا نمایش داده می‌شود."
            />
          )}
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
function Enroll({ classId }: { classId: string }) {
  const [page, setPage] = useState(1),
    [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [person, setPerson] = useState('');
  const q = usePersonalApi<S['OrganizationPeoplePage']>(
    `/api/v1/organization/people?page=${page}&pageSize=30&search=${encodeURIComponent(search)}`,
  );
  const a = useSchoolAction();
  return (
    <>
      <form
        className={s.toolbar}
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query);
          setPage(1);
          setPerson('');
        }}
      >
        <input
          aria-label="جستجوی فرد برای ثبت‌نام"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={a.busy}>
          جستجو
        </Button>
      </form>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} />
      ) : (
        <>
          <Field label="پروندهٔ دانش‌آموز">
            <select value={person} onChange={(e) => setPerson(e.target.value)}>
              <option value="">انتخاب از پرونده‌های این صفحه…</option>
              {q.data.items
                .filter((p) => p.status === 'Active')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName || p.firstName + ' ' + p.lastName}
                  </option>
                ))}
            </select>
          </Field>
          <Pager
            page={page}
            total={q.data.totalCount}
            onChange={(p) => {
              setPage(p);
              setPerson('');
            }}
          />
        </>
      )}
      <Button
        disabled={a.busy || !person}
        onClick={() =>
          void a.run('/api/v1/academic/classes/' + classId + '/enrollments', {
            learnerOrganizationPersonId: person,
          })
        }
      >
        ثبت‌نام در این کلاس
      </Button>
      {a.feedback}
    </>
  );
}
export function AssignTeachers({ classId }: { classId: string }) {
  const [page, setPage] = useState(1),
    [teacher, setTeacher] = useState('');
  const q = usePersonalApi<S['ReportPageOfManagerTeacherWorkloadReportItem']>(
    `/api/v1/reports/manager/teacher-workload?PageNumber=${page}&PageSize=30`,
  );
  const assigned = usePersonalApi<S['ReportPageOfManagerTeacherWorkloadReportItem']>(
    `/api/v1/reports/manager/teacher-workload?ClassId=${classId}&PageNumber=1&PageSize=30`,
  );
  const a = useSchoolAction();
  return (
    <Card title="معلمان کلاس">
      <p className={s.hint}>برای افزودن چند معلم، انتساب را برای هر معلم انجام دهید.</p>
      {assigned.isError ? (
        <ErrorState error={assigned.error} />
      ) : assigned.isPending ? (
        <LoadingSkeleton />
      ) : (
        <>
          <div className={s.row}>
            {assigned.data.items.map((t) => (
              <Status key={t.teacherMembershipId}>{t.teacherDisplayName}</Status>
            ))}
          </div>
          {assigned.data.totalCount > 30 && (
            <p className={s.hint}>۳۰ مورد نخست گزارش معلمان کلاس نمایش داده شده است.</p>
          )}
        </>
      )}
      {q.isSuccess && (
        <>
          <Field label="معلم آموزشگاه">
            <select value={teacher} onChange={(e) => setTeacher(e.target.value)}>
              <option value="">انتخاب معلم…</option>
              {q.data.items.map((t) => (
                <option key={t.teacherMembershipId} value={t.teacherMembershipId}>
                  {t.teacherDisplayName}
                </option>
              ))}
            </select>
          </Field>
          <Pager
            page={page}
            total={q.data.totalCount}
            onChange={(p) => {
              setPage(p);
              setTeacher('');
            }}
          />
          <Button
            disabled={a.busy || !teacher}
            onClick={() =>
              void a.run('/api/v1/academic/classes/' + classId + '/teachers', {
                teacherMembershipId: teacher,
              })
            }
          >
            افزودن معلم به کلاس
          </Button>
        </>
      )}
      {q.isError && <ErrorState error={q.error} />}
      {a.feedback}
    </Card>
  );
}
export function Guardians() {
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['SchoolGuardianRelationsPage']>(
    `/api/v1/organization/guardian-relations?page=${page}&pageSize=30`,
  );
  return (
    <>
      <SchoolHeading
        title="والدین و دسترسی فرزندان"
        description="دسترسی آموزشی والد فقط برای فرزند مشخص و رابطهٔ فعال برقرار می‌شود."
        action={
          <FormDialog title="افزودن رابطهٔ والد و فرزند">
            <CreateGuardian />
          </FormDialog>
        }
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Card>
            {q.data.items.length ? (
              <div className={s.editorList}>
                {q.data.items.map((r) => (
                  <GuardianRow key={r.id} relation={r} />
                ))}
              </div>
            ) : (
              <EmptyState title="رابطهٔ والد و فرزندی ثبت نشده است" />
            )}
          </Card>
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </>
  );
}
function GuardianRow({ relation: r }: { relation: S['SchoolGuardianRelationDto'] }) {
  const person = usePersonalApi<S['OrganizationPersonDto']>(
    '/api/v1/organization/people/' + r.learnerOrganizationPersonId,
  );
  const a = useSchoolAction();
  return (
    <div className={s.question}>
      <h3>
        {person.data?.displayName ||
          [person.data?.firstName, person.data?.lastName].filter(Boolean).join(' ') ||
          'پروندهٔ فرزند'}
      </h3>
      <p className={s.hint}>
        حساب والد: <bdi>{r.guardianUserId}</bdi>
      </p>
      <Status>{label(r.status)}</Status>
      {r.status === 'Pending' && (
        <Button
          disabled={a.busy}
          onClick={() =>
            void a.run('/api/v1/organization/guardian-relations/' + r.id + '/activate', {
              expectedRowVersion: r.rowVersion,
              reason: 'فعال‌سازی رابطهٔ بررسی‌شده در آموزشگاه',
            })
          }
        >
          فعال‌سازی دسترسی والد
        </Button>
      )}
      {a.feedback}
    </div>
  );
}
function CreateGuardian() {
  const [username, setUsername] = useState(''),
    [mode, setMode] = useState<'identifier' | 'username'>('identifier'),
    [guardianId, setGuardianId] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [reason, setReason] = useState(''),
    [parent, setParent] = useState<S['MessagingPublicProfileResult2'] | null>(null),
    [learner, setLearner] = useState(''),
    [notFound, setNotFound] = useState(false),
    [page, setPage] = useState(1);
  const q = usePersonalApi<S['OrganizationPeoplePage']>(
    `/api/v1/organization/people?page=${page}&pageSize=30`,
  );
  const a = useSchoolAction();
  const selectedId = mode === 'identifier' ? guardianId.trim() : parent?.userId;
  const validId =
    !!selectedId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedId);
  return (
    <>
      <Field label="روش معرفی حساب والد">
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as typeof mode);
            setConfirmed(false);
            setNotFound(false);
          }}
        >
          <option value="identifier">شناسهٔ حساب بررسی‌شده</option>
          <option value="username">نام کاربری قابل مشاهده</option>
        </select>
      </Field>
      {mode === 'identifier' ? (
        <>
          <Field label="شناسهٔ حساب والد">
            <input
              dir="ltr"
              value={guardianId}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              onChange={(e) => {
                setGuardianId(e.target.value);
                setConfirmed(false);
              }}
            />
          </Field>
          <p className={s.hint}>
            والد می‌تواند شناسه را از «حساب من ← شناسهٔ حساب» در اختیار شما بگذارد. این شناسه باید
            متعلق به حساب موجود و هویت بررسی‌شده باشد؛ شناسهٔ پروندهٔ آموزشی را وارد نکنید.
          </p>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setNotFound(false);
            setParent(null);
            const r = await a.run<S['PeopleResolveResult']>('/api/v1/people/resolve', {
              username: username.replace(/^@/, ''),
              phoneNumber: null,
            });
            if (r) setParent(r.isDiscoverable ? r.profile : null);
            if (r && !r.isDiscoverable) setNotFound(true);
          }}
        >
          <Field label="نام کاربری حساب والد">
            <input
              dir="ltr"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setParent(null);
                setConfirmed(false);
              }}
              placeholder="@username"
            />
          </Field>
          <Button disabled={a.busy}>پیدا کردن حساب والد</Button>
        </form>
      )}
      {notFound && (
        <p role="status" className={s.hint}>
          حساب قابل مشاهده پیدا نشد. نام کاربری و اجازهٔ پیدا شدن حساب را بررسی کنید.
        </p>
      )}
      {parent && (
        <p>
          {parent.displayName} · <bdi>@{parent.username}</bdi>
        </p>
      )}
      {q.isSuccess && (
        <>
          <Field label="پروندهٔ فرزند">
            <select
              value={learner}
              onChange={(e) => {
                setLearner(e.target.value);
                setConfirmed(false);
              }}
            >
              <option value="">انتخاب فرزند…</option>
              {q.data.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName || p.firstName + ' ' + p.lastName}
                </option>
              ))}
            </select>
          </Field>
          <Pager
            page={page}
            total={q.data.totalCount}
            onChange={(p) => {
              setPage(p);
              setLearner('');
            }}
          />
        </>
      )}
      {q.isError && <ErrorState error={q.error} />}
      <p className={s.hint}>
        پیش از ثبت، هویت والد و رابطه با همین فرزند را بررسی کنید. این رابطه اجازهٔ خواندن چت خصوصی
        نمی‌دهد.
      </p>
      <Field label="دلیل و مبنای ثبت رابطه">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      </Field>
      <label className={s.hint}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        هویت حساب والد و رابطه با فرزند انتخاب‌شده را بررسی کرده‌ام.
      </label>
      <Button
        disabled={a.busy || !validId || !learner || !confirmed || !reason.trim()}
        onClick={() =>
          void a.run('/api/v1/organization/guardian-relations', {
            guardianUserId: selectedId,
            learnerOrganizationPersonId: learner,
            reason: reason.trim(),
          })
        }
      >
        ثبت رابطهٔ والد و فرزند
      </Button>
      {a.feedback}
    </>
  );
}
