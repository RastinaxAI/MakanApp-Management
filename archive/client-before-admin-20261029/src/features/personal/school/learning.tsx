'use client';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePersonalApi } from '../provider';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton, ErrorState, EmptyState, label } from '@/components/ui/states';
import { date } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';
import {
  base,
  Card,
  Field,
  FormDialog,
  SchoolHeading,
  Status,
  safeMeetingUrl,
  toUtc,
  useSchoolAction,
  Pager,
} from './shared';
import s from './school.module.css';
type S = components['schemas'];
export function Assignments({ classId, teach }: { classId?: string; teach: boolean }) {
  const [chosen, setChosen] = useState(classId ?? '');
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes', {
    enabled: !classId,
  });
  const q = usePersonalApi<S['AssignmentResult'][]>(
    '/api/v1/academic/classes/' + chosen + '/assignments',
    { enabled: !!chosen },
  );
  return (
    <>
      <SchoolHeading
        title="تکلیف‌ها"
        description={
          teach
            ? 'تکلیف هر کلاس را آماده و منتشر کنید؛ پاسخ‌های دانش‌آموزان را از داخل تکلیف بررسی کنید.'
            : 'تکلیف را بخوانید، پاسخ را ذخیره کنید و در پایان تحویل دهید.'
        }
        action={
          teach &&
          chosen && (
            <FormDialog title="ایجاد تکلیف">
              <CreateAssignment classId={chosen} />
            </FormDialog>
          )
        }
      />
      {!classId && (
        <Card>
          <Field label="کلاس تکلیف">
            <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              <option value="">یک کلاس انتخاب کنید…</option>
              {classes.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          {classes.isError && <ErrorState error={classes.error} />}
        </Card>
      )}
      {chosen &&
        (q.isPending ? (
          <LoadingSkeleton />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.length ? (
          <div className={s.grid}>
            {q.data.map((a) => (
              <Link key={a.id} className={s.classCard} href={base + '/assignments/' + a.id}>
                <Status>{label(a.status)}</Status>
                <h2>{a.title}</h2>
                <p>
                  {a.classTitle}
                  <br />
                  مهلت: {date(a.dueAtUtc, true)}
                </p>
                <footer>مشاهدهٔ تکلیف و پاسخ‌ها</footer>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState title="تکلیفی در این کلاس موجود نیست" />
          </Card>
        ))}
    </>
  );
}
function CreateAssignment({ classId }: { classId: string }) {
  const a = useSchoolAction(),
    router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const result = await a.run<S['AssignmentResult']>(
          '/api/v1/academic/classes/' + classId + '/assignments',
          {
            title: f.get('title'),
            description: f.get('description'),
            dueAtUtc: toUtc(String(f.get('due'))),
            allowLateSubmission: f.get('late') === 'on',
            maxAttempts: Number(f.get('attempts')),
            maxScore: Number(f.get('score')),
          },
        );
        if (result) router.push(base + '/assignments/' + result.id);
      }}
    >
      <Field label="عنوان تکلیف">
        <input required name="title" />
      </Field>
      <Field label="شرح تکلیف">
        <textarea required name="description" />
      </Field>
      <Field label="مهلت تحویل">
        <JalaliDateInput required withTime name="due" />
      </Field>
      <div className={s.two}>
        <Field label="حداکثر دفعات تحویل">
          <input name="attempts" type="number" required min={1} step={1} />
        </Field>
        <Field label="نمرهٔ کل">
          <input name="score" type="number" required min={0} step="any" />
        </Field>
      </div>
      <label className={s.check}>
        <input name="late" type="checkbox" />
        تحویل با تأخیر مجاز باشد
      </label>
      <Button disabled={a.busy}>ذخیرهٔ پیش‌نویس تکلیف</Button>
      {a.feedback}
    </form>
  );
}
export function AssignmentDetail({ id, teach }: { id: string; teach: boolean }) {
  const q = usePersonalApi<S['AssignmentResult']>('/api/v1/academic/assignments/' + id);
  const a = useSchoolAction();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data;
  return (
    <>
      <SchoolHeading title={item.title} description={item.classTitle} back />
      <Card>
        <div className={s.row}>
          <Status>{label(item.status)}</Status>
          <span>مهلت: {date(item.dueAtUtc, true)}</span>
          <span>نمرهٔ کل: {item.maxScore}</span>
        </div>
        <p className={s.bodyText}>{item.description}</p>
        {teach && item.status === 'Draft' && (
          <Button
            disabled={a.busy}
            onClick={() =>
              void a.run('/api/v1/academic/assignments/' + id + '/publish', {
                expectedAssignmentRowVersion: item.assignmentRowVersion,
                expectedVersionRowVersion: item.versionRowVersion,
              })
            }
          >
            انتشار برای دانش‌آموزان کلاس
          </Button>
        )}
        {a.feedback}
      </Card>
      {teach ? <SubmittedAssignments id={id} /> : <AssignmentAnswer key={id} assignment={item} />}
    </>
  );
}
function AssignmentAnswer({ assignment }: { assignment: S['AssignmentResult'] }) {
  const q = usePersonalApi<S['SubmissionAttemptResult'][]>(
    '/api/v1/academic/assignments/' + assignment.id + '/attempts/me',
  );
  const a = useSchoolAction();
  const [attempt, setAttempt] = useState<S['SubmissionAttemptResult']>(),
    [text, setText] = useState(''),
    [receipt, setReceipt] = useState<S['SubmissionReceipt']>();
  const active = attempt ?? q.data?.find((item) => item.status === 'Draft');
  return (
    <Card title="پاسخ من">
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {q.data
            .filter((item) => item.status === 'Submitted')
            .map((item) => (
              <p key={item.id} className={s.notice}>
                پاسخ شمارهٔ {item.attemptNumber} در {date(item.submittedAtUtc, true)} تحویل شده است.
              </p>
            ))}
          {receipt ? (
            <div className={s.receipt}>
              <h2>تکلیف تحویل داده شد</h2>
              <p>زمان ثبت: {date(receipt.submittedAtUtc, true)}</p>
            </div>
          ) : active ? (
            <SubmissionEditor
              key={active.id}
              value={active}
              onSaved={setAttempt}
              onSubmitted={setReceipt}
            />
          ) : (
            <Button
              disabled={
                a.busy ||
                assignment.status !== 'Published' ||
                q.data.length >= assignment.maxAttempts
              }
              onClick={async () => {
                const result = await a.run<S['SubmissionAttemptResult']>(
                  '/api/v1/academic/assignments/' + assignment.id + '/attempts',
                );
                if (result) {
                  setAttempt(result);
                  setText(result.answerText ?? '');
                }
              }}
            >
              شروع پاسخ جدید
            </Button>
          )}
        </>
      )}
      {a.feedback}
    </Card>
  );
}
function SubmissionEditor({
  value,
  onSaved,
  onSubmitted,
}: {
  value: S['SubmissionAttemptResult'];
  onSaved: (v: S['SubmissionAttemptResult']) => void;
  onSubmitted: (r: S['SubmissionReceipt']) => void;
}) {
  const [text, setText] = useState(value.answerText ?? '');
  const a = useSchoolAction();
  const dirty = text !== (value.answerText ?? '');
  if (!value.contentVisible) return <p className={s.notice}>محتوای این پاسخ در دسترس شما نیست.</p>;
  return (
    <div className={s.form}>
      <Field label="پاسخ تکلیف">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={a.busy || value.status !== 'Draft'}
        />
      </Field>
      <div className={s.row}>
        <Button
          variant="outline"
          disabled={a.busy || !dirty}
          onClick={async () => {
            const result = await a.run<S['SubmissionAttemptResult']>(
              '/api/v1/academic/submission-attempts/' + value.id + '/draft',
              { answerText: text, expectedRowVersion: value.rowVersion },
              'PATCH',
            );
            if (result) onSaved(result);
          }}
        >
          ذخیرهٔ پاسخ
        </Button>
        <Button
          disabled={a.busy || dirty || !text.trim() || value.status !== 'Draft'}
          onClick={async () => {
            const receipt = await a.run<S['SubmissionReceipt']>(
              '/api/v1/academic/submission-attempts/' + value.id + '/submit',
              { expectedRowVersion: value.rowVersion },
            );
            if (receipt) onSubmitted(receipt);
          }}
        >
          تحویل نهایی تکلیف
        </Button>
      </div>
      <p className={s.hint}>
        {dirty ? 'پیش از تحویل، پاسخ را ذخیره کنید.' : 'تحویل نهایی، پاسخ را برای معلم ثبت می‌کند.'}
      </p>
      {a.feedback}
    </div>
  );
}
function SubmittedAssignments({ id }: { id: string }) {
  const q = usePersonalApi<S['SubmissionAttemptResult'][]>(
    '/api/v1/academic/assignments/' + id + '/submitted-attempts',
  );
  return (
    <Card title="پاسخ‌های تحویل‌شده">
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length ? (
        <div className={s.editorList}>
          {q.data.map((item) => (
            <div className={s.question} key={item.id}>
              <h3>پاسخ شمارهٔ {item.attemptNumber}</h3>
              <p className={s.hint}>{date(item.submittedAtUtc, true)}</p>
              {item.contentVisible ? (
                <p className={s.bodyText}>{item.answerText ?? 'پاسخ متنی ندارد.'}</p>
              ) : (
                <p>محتوای پاسخ در دسترس نیست.</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="پاسخی تحویل نشده است" />
      )}
    </Card>
  );
}
export function Schedule({ classId, teach }: { classId?: string; teach: boolean }) {
  const [range, setRange] = useState(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const input = (value: Date) =>
      [
        value.getFullYear(),
        String(value.getMonth() + 1).padStart(2, '0'),
        String(value.getDate()).padStart(2, '0'),
      ].join('-');
    return { from: input(start), to: input(end) };
  });
  const [from, setFrom] = useState(range.from),
    [until, setUntil] = useState(range.to);
  const q = usePersonalApi<S['SessionResult'][]>(
    '/api/v1/academic/schedule?' +
      new URLSearchParams({
        fromUtc: new Date(range.from + 'T00:00:00').toISOString(),
        toUtc: new Date(range.to + 'T23:59:59.999').toISOString(),
      }),
  );
  const items = q.data?.filter((item) => !classId || item.classId === classId);
  return (
    <Card
      title="جلسه‌ها و ورود به کلاس"
      action={
        teach &&
        classId && (
          <FormDialog title="ایجاد جلسه">
            <CreateSession classId={classId} />
          </FormDialog>
        )
      }
    >
      <form
        className={s.row}
        onSubmit={(e) => {
          e.preventDefault();
          if (from && until && from <= until) setRange({ from, to: until });
        }}
      >
        <Field label="جلسه‌ها از تاریخ">
          <JalaliDateInput required value={from} onValueChange={setFrom} />
        </Field>
        <Field label="جلسه‌ها تا تاریخ">
          <JalaliDateInput required min={from} value={until} onValueChange={setUntil} />
        </Field>
        <Button type="submit" variant="outline">
          نمایش برنامه
        </Button>
      </form>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : items?.length ? (
        <div className={s.editorList}>
          {items.map((item) => (
            <div key={item.id} className={s.question}>
              <div className={s.row}>
                <h3>{item.title}</h3>
                <Status>{label(item.status)}</Status>
              </div>
              <p className={s.hint}>
                {item.classTitle} · {date(item.startUtc, true)} تا {date(item.endUtc, true)}
              </p>
              {item.status === 'Scheduled' && safeMeetingUrl(item.meetingUrl) && (
                <Button asChild variant="outline">
                  <a
                    href={safeMeetingUrl(item.meetingUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ورود به جلسه
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="جلسه‌ای در برنامه نیست" />
      )}
    </Card>
  );
}
function CreateSession({ classId }: { classId: string }) {
  const a = useSchoolAction();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        await a.run('/api/v1/academic/classes/' + classId + '/sessions', {
          title: f.get('title'),
          startUtc: toUtc(String(f.get('start'))),
          endUtc: toUtc(String(f.get('end'))),
          timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
          meetingUrl: String(f.get('link')).trim() || null,
        });
      }}
    >
      <Field label="عنوان جلسه">
        <input name="title" required />
      </Field>
      <div className={s.two}>
        <Field label="شروع جلسه">
          <JalaliDateInput withTime name="start" required />
        </Field>
        <Field label="پایان جلسه">
          <JalaliDateInput withTime name="end" required />
        </Field>
      </div>
      <Field label="پیوند کلاس آنلاین (اختیاری)">
        <input type="url" name="link" dir="ltr" placeholder="https://…" />
      </Field>
      <Button disabled={a.busy}>ثبت جلسه</Button>
      {a.feedback}
    </form>
  );
}
export function TeacherLearners({ classId }: { classId: string }) {
  const dashboard = usePersonalApi<S['TeacherDashboardDto']>('/api/v1/dashboards/teacher');
  const assigned = dashboard.data?.assignedClasses.find((item) => item.classId === classId);
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['ReportPageOfTeacherAssignmentReportItem']>(
    `/api/v1/reports/teacher/classes/${classId}/assignments?PageNumber=${page}&PageSize=30`,
  );
  return (
    <Card title="پیگیری دانش‌آموزان">
      {assigned && (
        <p className={s.notice}>
          دانش‌آموزان فعال کلاس:{' '}
          {new Intl.NumberFormat('fa-IR').format(assigned.activeLearnerCount)} نفر
        </p>
      )}
      <p className={s.hint}>
        این فهرست، گزارش تکلیف‌های دانش‌آموزان است؛ دانش‌آموزی که هنوز تکلیفی برایش منتشر نشده ممکن
        است در گزارش نباشد.
      </p>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} />
      ) : (
        <>
          {q.data.items.length ? (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>دانش‌آموز</th>
                    <th>تکلیف</th>
                    <th>تحویل</th>
                    <th>نمرهٔ جاری</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((row) => (
                    <tr key={row.assignmentVersionId + row.enrollmentId}>
                      <td>{row.learnerDisplayName}</td>
                      <td>
                        <Link href={base + '/assignments/' + row.assignmentId}>{row.title}</Link>
                      </td>
                      <td>{row.submissionStatus ? label(row.submissionStatus) : 'تحویل نداده'}</td>
                      <td>{row.currentScore ?? 'هنوز نمره ندارد'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="فعالیتی در گزارش موجود نیست" />
          )}
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
