'use client';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePersonalApi } from '../provider';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingSkeleton, ErrorState, label } from '@/components/ui/states';
import { date } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';
import {
  base,
  Card,
  Field,
  FormDialog,
  SchoolHeading,
  Status,
  toUtc,
  useSchoolAction,
} from './shared';
import s from './school.module.css';
import { isMissingActiveAttempt } from './policy';
type S = components['schemas'];
export function Exams({ classId, teach }: { classId?: string; teach: boolean }) {
  const q = usePersonalApi<S['StudentExamSummary'][]>('/api/v1/academic/exams');
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes', {
    enabled: teach && !classId,
  });
  const [chosen, setChosen] = useState(classId ?? '');
  const rows = q.data?.filter((exam) => !chosen || exam.classId === chosen);
  return (
    <>
      <SchoolHeading
        title="آزمون‌ها"
        description="آزمون‌های منتشرشدهٔ کلاس‌های مجاز شما"
        action={
          teach &&
          chosen && (
            <FormDialog title="ایجاد آزمون">
              <CreateExam classId={chosen} />
            </FormDialog>
          )
        }
      />
      {teach && !classId && (
        <Card>
          <Field label="کلاس آزمون">
            <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              <option value="">انتخاب کلاس برای ساخت آزمون…</option>
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
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : rows?.length ? (
        <div className={s.grid}>
          {rows.map((exam) => (
            <Link
              key={exam.versionId}
              className={s.classCard}
              href={base + '/exams/' + exam.id + (teach ? '/edit' : '')}
            >
              <Status>{label(exam.publicationState)}</Status>
              <h2>{exam.title}</h2>
              <p>
                {exam.classTitle}
                <br />
                {exam.rules.durationMinutes} دقیقه · {exam.rules.maxScore} نمره
                <br />
                {date(exam.rules.availableFromUtc, true)} تا{' '}
                {date(exam.rules.availableUntilUtc, true)}
              </p>
              <footer>{teach ? 'مدیریت آزمون' : 'مشاهده و شرکت در آزمون'}</footer>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="آزمون منتشرشده‌ای موجود نیست"
            description={
              teach
                ? 'پیش‌نویس جدید پس از ایجاد، مستقیماً در ویرایشگر باز می‌شود.'
                : 'پس از انتشار آزمون توسط معلم، آن را اینجا می‌بینید.'
            }
          />
        </Card>
      )}
    </>
  );
}
function CreateExam({ classId }: { classId: string }) {
  const a = useSchoolAction(),
    router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const result = await a.run<S['ExamEditorDto']>(
          '/api/v1/academic/classes/' + classId + '/exams',
          {
            title: f.get('title'),
            description: String(f.get('description')).trim() || null,
            availableFromUtc: toUtc(String(f.get('start'))),
            availableUntilUtc: toUtc(String(f.get('end'))),
            durationMinutes: Number(f.get('duration')),
            maxAttempts: Number(f.get('attempts')),
            maxScore: Number(f.get('score')),
            randomizationPolicy: f.get('random') === 'on' ? 'QuestionOrder' : 'None',
          },
        );
        if (result) router.push(base + '/exams/' + result.id + '/edit');
      }}
    >
      <Field label="عنوان آزمون">
        <input name="title" required />
      </Field>
      <Field label="توضیحات آزمون">
        <textarea name="description" />
      </Field>
      <div className={s.two}>
        <Field label="آغاز دسترسی">
          <JalaliDateInput withTime name="start" required />
        </Field>
        <Field label="پایان دسترسی">
          <JalaliDateInput withTime name="end" required />
        </Field>
        <Field label="مدت آزمون (دقیقه)">
          <input name="duration" type="number" min={1} step={1} required />
        </Field>
        <Field label="دفعات مجاز شرکت">
          <input name="attempts" type="number" min={1} step={1} required />
        </Field>
        <Field label="نمرهٔ کل">
          <input name="score" type="number" min={0} step="any" required />
        </Field>
      </div>
      <label className={s.check}>
        <input name="random" type="checkbox" />
        ترتیب پرسش‌ها تصادفی باشد
      </label>
      <Button disabled={a.busy}>ایجاد پیش‌نویس آزمون</Button>
      {a.feedback}
    </form>
  );
}
export function ExamEditor({ id }: { id: string }) {
  const q = usePersonalApi<S['ExamEditorDto']>('/api/v1/academic/exams/' + id + '/editor');
  const a = useSchoolAction();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data;
  return (
    <>
      <SchoolHeading title={item.title} description={item.classTitle + ' · ویرایشگر آزمون'} back />
      <Card>
        <div className={s.row}>
          <Status>{label(item.versionStatus)}</Status>
          <span>{item.durationMinutes} دقیقه</span>
          <span>{item.maxScore} نمره</span>
          <span>{item.questions.length} پرسش</span>
        </div>
        <p className={s.bodyText}>{item.description}</p>
        {item.versionStatus === 'Draft' && (
          <div className={s.row}>
            <FormDialog title="افزودن پرسش">
              <AddQuestion key={item.versionRowVersion} exam={item} />
            </FormDialog>
            <Button
              disabled={a.busy || !item.questions.length}
              onClick={() =>
                void a.run('/api/v1/academic/exams/' + id + '/publish', {
                  expectedExamRowVersion: item.examRowVersion,
                  expectedVersionRowVersion: item.versionRowVersion,
                })
              }
            >
              انتشار آزمون برای کلاس
            </Button>
          </div>
        )}
        {a.feedback}
      </Card>
      <Card title="پرسش‌های آزمون">
        {item.questions.length ? (
          item.questions.map((question) => (
            <div className={s.question} key={question.id}>
              <div className={s.row}>
                <strong>
                  پرسش {question.order} · {question.score} نمره
                </strong>
                <Status>{label(question.type)}</Status>
              </div>
              <p className={s.bodyText}>{question.prompt}</p>
              {question.options.map((option) => (
                <p key={option.id} className={s.option}>
                  {option.text}
                  {option.isCorrect ? ' · پاسخ درست' : ''}
                </p>
              ))}
            </div>
          ))
        ) : (
          <EmptyState title="هنوز پرسشی اضافه نشده است" />
        )}
      </Card>
    </>
  );
}
function AddQuestion({ exam }: { exam: S['ExamEditorDto'] }) {
  const [type, setType] = useState<'Descriptive' | 'ObjectiveSingleChoice'>('Descriptive');
  const a = useSchoolAction();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const result = await a.run('/api/v1/academic/exams/' + exam.id + '/questions', {
          order: exam.questions.length + 1,
          type,
          prompt: f.get('prompt'),
          score: Number(f.get('score')),
          options:
            type === 'Descriptive'
              ? null
              : [1, 2, 3, 4].map((order) => ({
                  order,
                  text: String(f.get('option' + order)),
                  isCorrect: Number(f.get('correct')) === order,
                })),
          expectedVersionRowVersion: exam.versionRowVersion,
        });
        if (result) e.currentTarget?.reset();
      }}
    >
      <Field label="نوع پرسش">
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="Descriptive">تشریحی</option>
          <option value="ObjectiveSingleChoice">چهارگزینه‌ای</option>
        </select>
      </Field>
      <Field label="متن پرسش">
        <textarea name="prompt" required />
      </Field>
      <Field label="نمرهٔ پرسش">
        <input type="number" name="score" min={0} step="any" required />
      </Field>
      {type === 'ObjectiveSingleChoice' && (
        <>
          {[1, 2, 3, 4].map((n) => (
            <Field label={'گزینهٔ ' + n} key={n}>
              <input name={'option' + n} required />
            </Field>
          ))}
          <Field label="گزینهٔ صحیح">
            <select name="correct" required>
              <option value="">انتخاب پاسخ صحیح…</option>
              {[1, 2, 3, 4].map((n) => (
                <option value={n} key={n}>
                  گزینهٔ {n}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
      <Button disabled={a.busy}>ثبت پرسش</Button>
      {a.feedback}
    </form>
  );
}
export function StudentExam({ id }: { id: string }) {
  const q = usePersonalApi<S['StudentSafeExamPreview']>(
    '/api/v1/academic/exams/' + id + '/student-preview',
  );
  const current = usePersonalApi<S['StudentExamAttemptDto']>(
    '/api/v1/academic/exams/' + id + '/attempts/me/active',
  );
  const past = usePersonalApi<S['StudentExamAttemptSummaryDto'][]>(
    '/api/v1/academic/exams/' + id + '/attempts/me',
  );
  const [started, setStarted] = useState<S['StudentExamAttemptDto']>();
  const [operation] = useState(() => crypto.randomUUID());
  const a = useSchoolAction();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const active = started ?? current.data;
  return (
    <>
      <SchoolHeading title={q.data.exam.title} description="آزمون دانش‌آموز" back />
      {active ? (
        <ExamAttempt key={active.examAttemptId} attempt={active} />
      ) : (
        <Card>
          <p className={s.bodyText}>{q.data.exam.description}</p>
          <p className={s.hint}>
            {q.data.exam.rules.durationMinutes} دقیقه · حداکثر {q.data.exam.rules.maxAttempts} بار ·{' '}
            {q.data.exam.rules.maxScore} نمره
          </p>
          <p className={s.hint}>
            {date(q.data.exam.rules.availableFromUtc, true)} تا{' '}
            {date(q.data.exam.rules.availableUntilUtc, true)}
          </p>
          {current.isError && !isMissingActiveAttempt(current.error) && (
            <ErrorState error={current.error} />
          )}
          <Button
            disabled={
              a.busy ||
              current.isPending ||
              !past.isSuccess ||
              past.data.length >= q.data.exam.rules.maxAttempts ||
              (current.isError && !isMissingActiveAttempt(current.error))
            }
            onClick={async () => {
              const result = await a.run<S['StudentExamAttemptDto']>(
                '/api/v1/academic/exams/' + id + '/attempts/start',
                { clientOperationId: operation },
              );
              if (result) setStarted(result);
            }}
          >
            شروع آزمون
          </Button>
          {a.feedback}
        </Card>
      )}
      {past.isError && <ErrorState error={past.error} onRetry={() => void past.refetch()} />}
      {past.data
        ?.filter((item) => item.status === 'Finalized')
        .map((item) => (
          <PastExam key={item.examAttemptId} attempt={item} />
        ))}
    </>
  );
}
function PastExam({ attempt }: { attempt: S['StudentExamAttemptSummaryDto'] }) {
  const a = useSchoolAction();
  const [receipt, setReceipt] = useState<S['ExamFinalReceiptDto']>();
  return (
    <Card title={'آزمون ثبت‌شده · نوبت ' + attempt.attemptNumber}>
      <p className={s.hint}>شروع: {date(attempt.startedAtUtc, true)}</p>
      <Button
        variant="outline"
        disabled={a.busy}
        onClick={async () => {
          const result = await a.run<S['ExamFinalReceiptDto']>(
            '/api/v1/academic/exam-attempts/' + attempt.examAttemptId + '/receipt',
            undefined,
            'GET',
          );
          if (result) setReceipt(result);
        }}
      >
        مشاهدهٔ رسید ثبت آزمون
      </Button>
      {receipt && (
        <p role="status">
          ثبت نهایی در {date(receipt.finalizedAtUtc, true)} · {receipt.answeredQuestionCount} پاسخ
          از {receipt.totalQuestionCount} پرسش
        </p>
      )}
      {a.feedback}
    </Card>
  );
}
export function ExamAttempt({ attempt }: { attempt: S['StudentExamAttemptDto'] }) {
  const answers = usePersonalApi<S['StudentExamAnswersDto']>(
    '/api/v1/academic/exam-attempts/' + attempt.examAttemptId + '/answers',
  );
  const [receipt, setReceipt] = useState<S['ExamFinalReceiptDto']>(),
    [lease, setLease] = useState<S['ExamWriteLeaseDto']>(),
    [dirty, setDirty] = useState<Record<string, boolean>>({}),
    [sync, setSync] = useState(0),
    [finalizing, setFinalizing] = useState(false),
    [seconds, setSeconds] = useState(0);
  const a = useSchoolAction(),
    finalCommand = useRef<S['FinalizeExamCommand'] | undefined>(undefined),
    clock = useRef({ at: Date.now(), server: Date.parse(attempt.serverNowUtc) });
  const writer = lease ?? answers.data?.writeLease;
  useEffect(() => {
    const update = () =>
      setSeconds(
        Math.max(
          0,
          Math.ceil(
            (Date.parse(attempt.effectiveDeadlineUtc) -
              (clock.current.server + Date.now() - clock.current.at)) /
              1000,
          ),
        ),
      );
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [attempt.effectiveDeadlineUtc]);
  const hasDirty = Object.values(dirty).some(Boolean);
  if (receipt)
    return (
      <div className={s.receipt}>
        <h2>آزمون ثبت نهایی شد</h2>
        <p>
          {receipt.answeredQuestionCount} پاسخ از {receipt.totalQuestionCount} پرسش
        </p>
        <p>{date(receipt.finalizedAtUtc, true)}</p>
        <Link href={base + '/exams'}>بازگشت به آزمون‌ها</Link>
      </div>
    );
  return (
    <>
      <Card>
        <div className={s.row}>
          <Status>{label(attempt.status)}</Status>
          <strong aria-live="off">
            زمان باقی‌مانده: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </strong>
        </div>
        {!seconds && (
          <p className={s.notice}>
            زمان پاسخ‌دهی به پایان رسیده است. وضعیت نهایی را از سرور بازخوانی کنید.
          </p>
        )}
        {answers.isPending ? (
          <LoadingSkeleton />
        ) : answers.isError ? (
          <ErrorState error={answers.error} onRetry={() => void answers.refetch()} />
        ) : (
          <>
            {!writer?.isCurrentSessionWriter && (
              <>
                <p className={s.notice}>
                  برای پاسخ‌دادن، نوشتن در همین دستگاه باید فعال باشد. کنترل پاسخ‌دهی دستگاه دیگر
                  خودکار منتقل نمی‌شود.
                </p>
                <Button
                  disabled={a.busy || !seconds || attempt.status !== 'InProgress'}
                  onClick={async () => {
                    const result = await a.run<S['ExamWriteLeaseDto']>(
                      '/api/v1/academic/exam-attempts/' + attempt.examAttemptId + '/write-lease',
                    );
                    if (result) setLease(result);
                  }}
                >
                  فعال‌کردن پاسخ‌دهی در این دستگاه
                </Button>
              </>
            )}
            <Button
              variant="outline"
              disabled={a.busy || finalizing}
              onClick={async () => {
                await answers.refetch();
                setLease(undefined);
                setDirty({});
                setSync((n) => n + 1);
              }}
            >
              بازخوانی پاسخ‌های ثبت‌شده
            </Button>
          </>
        )}
        {a.feedback}
      </Card>
      {answers.data &&
        attempt.questions.map((question) => (
          <ExamQuestion
            key={question.attemptQuestionId + ':' + sync}
            question={question}
            attemptId={attempt.examAttemptId}
            saved={answers.data.answers.find(
              (answer) => answer.examAttemptQuestionId === question.attemptQuestionId,
            )}
            lease={writer}
            disabled={
              !seconds ||
              !writer?.isCurrentSessionWriter ||
              attempt.status !== 'InProgress' ||
              finalizing
            }
            onDirty={(value) =>
              setDirty((old) =>
                old[question.attemptQuestionId] === value
                  ? old
                  : { ...old, [question.attemptQuestionId]: value },
              )
            }
            onSaved={async () => {
              setLease(undefined);
              await answers.refetch();
            }}
          />
        ))}
      {answers.data && (
        <Card title="پایان آزمون">
          <p className={s.hint}>
            فقط پاسخ‌هایی که ذخیره شده‌اند ثبت نهایی می‌شوند. پس از ثبت نهایی امکان تغییر پاسخ وجود
            ندارد.
          </p>
          {hasDirty && (
            <p role="status" className={s.notice}>
              پاسخ ذخیره‌نشده دارید؛ ابتدا آن‌ها را ذخیره کنید.
            </p>
          )}
          <Button
            disabled={
              a.busy ||
              hasDirty ||
              !writer?.isCurrentSessionWriter ||
              attempt.status !== 'InProgress'
            }
            onClick={async () => {
              if (!answers.data || !writer) return;
              setFinalizing(true);
              finalCommand.current ??= {
                clientOperationId: crypto.randomUUID(),
                expectedAnswerSetVersion: answers.data.answerSetVersion,
                writeLeaseVersion: writer.writeLeaseVersion,
              };
              const result = await a.run<S['ExamFinalReceiptDto']>(
                '/api/v1/academic/exam-attempts/' + attempt.examAttemptId + '/finalize',
                finalCommand.current,
              );
              if (result) setReceipt(result);
            }}
          >
            {finalizing ? 'تلاش مجدد برای ثبت نهایی' : 'ثبت نهایی آزمون'}
          </Button>
          <Button
            variant="outline"
            disabled={a.busy}
            onClick={async () => {
              const result = await a.run<S['ExamFinalReceiptDto']>(
                '/api/v1/academic/exam-attempts/' + attempt.examAttemptId + '/receipt',
                undefined,
                'GET',
              );
              if (result) setReceipt(result);
            }}
          >
            بررسی رسید نهایی
          </Button>
        </Card>
      )}
    </>
  );
}
function ExamQuestion({
  question,
  attemptId,
  saved,
  lease,
  disabled,
  onSaved,
  onDirty,
}: {
  question: S['StudentExamAttemptQuestionDto'];
  attemptId: string;
  saved?: S['StudentCurrentExamAnswerDto'];
  lease?: S['ExamWriteLeaseDto'];
  disabled: boolean;
  onSaved: () => Promise<void>;
  onDirty: (value: boolean) => void;
}) {
  const [text, setText] = useState(saved?.textAnswer ?? ''),
    [option, setOption] = useState(saved?.selectedOptionId ?? ''),
    [uncertain, setUncertain] = useState(false);
  const command = useRef<S['SaveExamAnswerCommand'] | undefined>(undefined);
  const a = useSchoolAction();
  const dirty =
    question.questionType === 'Descriptive'
      ? text !== (saved?.textAnswer ?? '')
      : option !== (saved?.selectedOptionId ?? '');
  useEffect(() => {
    onDirty(dirty || a.busy || uncertain);
  }, [dirty, a.busy, uncertain]);
  return (
    <Card title={'پرسش ' + question.displayOrder + ' · ' + question.score + ' نمره'}>
      <p className={s.bodyText}>{question.prompt}</p>
      {question.questionType === 'Descriptive' ? (
        <Field label={'پاسخ پرسش ' + question.displayOrder}>
          <textarea
            disabled={disabled || a.busy || uncertain}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
      ) : (
        <fieldset className={s.question}>
          <legend>یک گزینه انتخاب کنید</legend>
          {question.options.map((item) => (
            <label className={s.option} key={item.id}>
              <input
                name={question.attemptQuestionId}
                type="radio"
                value={item.id}
                checked={option === item.id}
                disabled={disabled || a.busy || uncertain}
                onChange={() => setOption(item.id)}
              />
              {item.text}
            </label>
          ))}
        </fieldset>
      )}
      <Button
        disabled={disabled || a.busy || (!dirty && !uncertain)}
        onClick={async () => {
          if (!lease) return;
          command.current ??= {
            clientOperationId: crypto.randomUUID(),
            writeLeaseVersion: lease.writeLeaseVersion,
            expectedRevisionNumber: saved?.revisionNumber ?? null,
            selectedOptionId:
              question.questionType === 'ObjectiveSingleChoice' ? option || null : null,
            textAnswer: question.questionType === 'Descriptive' ? text : null,
          };
          const result = await a.run<S['ExamAnswerReceiptDto']>(
            '/api/v1/academic/exam-attempts/' +
              attemptId +
              '/answers/' +
              question.attemptQuestionId,
            command.current,
            'PUT',
          );
          if (result) {
            command.current = undefined;
            setUncertain(false);
            await onSaved();
          } else setUncertain(true);
        }}
      >
        {uncertain ? 'تلاش مجدد برای همین پاسخ' : 'ذخیرهٔ پاسخ ' + question.displayOrder}
      </Button>
      {uncertain && (
        <p className={s.hint}>
          نتیجهٔ ذخیره تأیید نشد؛ همین درخواست را تکرار کنید یا پاسخ‌های ثبت‌شده را بازخوانی کنید.
        </p>
      )}
      {a.feedback}
    </Card>
  );
}
