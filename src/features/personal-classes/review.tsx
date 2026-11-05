'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MembershipPicker } from './membership-picker';
import { loadAcademicContext } from '@/lib/personal-class-context';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EntityPicker } from '@/components/ui/entity-picker';
import { ErrorState, label } from '@/components/ui/states';
import { useAccess } from '@/features/access-context/provider';
import { request as send } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { operationFor, validator } from '@/lib/api/contract';
import {
  academicFlags,
  isRowVersion,
  reviewDecisions,
  validPersonalClassCommand,
} from '@/lib/personal-class-policy';
import type { components } from '@/generated/api/schema';
type RequestDetail = components['schemas']['PersonalClassRequestDto'];
type Grant = components['schemas']['PersonalClassAcademicPermissionDto'];
const flagLabels = {
  AuthorAssignments: 'ساخت تکلیف',
  AuthorExams: 'ساخت آزمون',
  Grade: 'ارزیابی و نمره‌دهی',
};
export function PersonalClassAction({
  request,
  classId,
  grant,
}: {
  request?: RequestDetail;
  classId?: string;
  grant?: Grant;
}) {
  const { can } = useAccess();
  const [open, setOpen] = useState(false);
  const title = request ? 'ثبت تصمیم بررسی' : grant ? 'تغییر یا لغو مجوز' : 'اعطای مجوز به عضویت';
  const path = request
    ? `/api/admin/v1/personal-class-requests/${request.id}/review`
    : `/api/admin/v1/personal-classes/${classId}/academic-permissions/${grant?.membershipId ?? '00000000-0000-0000-0000-000000000001'}`;
  if (!can(path, request ? 'POST' : 'PUT')) return null;
  const memberRead = !!request || can(`/api/admin/v1/personal-classes/${classId}/memberships`);
  const reviewable =
    !request || ['Submitted', 'UnderReview', 'NeedsChanges'].includes(request.status);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!reviewable || !memberRead}>
          {title}
        </Button>
      </DialogTrigger>
      {!memberRead && (
        <p className="field-help">برای انتخاب مدیر، مجوز مشاهده اعضای کلاس نیز لازم است.</p>
      )}
      {open && (
        <DialogContent
          title={title}
          description={
            request ? request.details.title : 'تغییر مجوز فقط برای دوره عضویت مشخص‌شده ثبت می‌شود.'
          }
        >
          <ActionForm
            request={request}
            classId={classId}
            grant={grant}
            close={() => setOpen(false)}
            title={title}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
function ActionForm({
  request,
  classId,
  grant,
  close,
  title,
}: {
  request?: RequestDetail;
  classId?: string;
  grant?: Grant;
  close: () => void;
  title: string;
}) {
  const { guard, can, session } = useAccess();
  const cache = useQueryClient();
  const [decision, setDecision] = useState<string>('NeedsChanges');
  const [manager, setManager] = useState<string | null>(null);
  const [membership, setMembership] = useState(grant?.membershipId ?? '');

  const [reviewVersion, setReviewVersion] = useState(request?.version ?? '');
  const [flags, setFlags] = useState<string[]>(
    grant?.capabilities === 'None'
      ? []
      : (grant?.capabilities.split(',').map((s) => s.trim()) ?? []),
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState<unknown>();
  const [pending, setPending] = useState(false);
  const [stale, setStale] = useState(false);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const operationId = useRef(crypto.randomUUID());
  const inFlight = useRef(false);
  const formId = useRef(crypto.randomUUID());
  const context = useQuery({
    queryKey: [
      session.user.id,
      session.revision,
      'academic-context',
      classId,
      membership,
      formId.current,
    ],
    queryFn: ({ signal }) =>
      loadAcademicContext(classId!, membership, (path) =>
        send<unknown>('/api/backend' + path, { signal }, guard),
      ),
    enabled:
      !request && !!membership && can(`/api/admin/v1/personal-classes/${classId}/memberships`),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const membershipVersion = context.data?.member.membershipVersion ?? '';
  const grantVersion = context.data?.grantVersion ?? null;

  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [waitUntil]);
  const path = request
    ? `/api/admin/v1/personal-class-requests/${request.id}/review`
    : `/api/admin/v1/personal-classes/${classId}/academic-permissions/${membership}`;
  const method = request ? 'POST' : 'PUT';
  const disabledFields = pending || !!snapshot;
  const valid = request
    ? isRowVersion(reviewVersion)
    : context.isSuccess &&
      !context.isFetching &&
      validator({ type: 'string', format: 'uuid' }).safeParse(membership).success &&
      isRowVersion(membershipVersion) &&
      flags.every((f) => (academicFlags as readonly string[]).includes(f));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      inFlight.current ||
      stale ||
      Date.now() < waitUntil ||
      (!snapshot && (!valid || !reason.trim()))
    )
      return;
    const body =
      snapshot ??
      (request
        ? {
            expectedVersion: reviewVersion,
            decision,
            reason: reason.trim(),
            finalManagerUserId: decision === 'Approved' ? manager : null,
          }
        : {
            capabilities: academicFlags.filter((f) => flags.includes(f)).join(', ') || 'None',
            clientOperationId: operationId.current,
            expectedMembershipVersion: membershipVersion,
            expectedGrantVersion: grantVersion,
            reason: reason.trim(),
          });
    const op = operationFor(method, path);
    const parsed = op?.body && validator(op.body).safeParse(body);
    if (!parsed || !parsed.success || !validPersonalClassCommand(path, body)) {
      setError(new ApiError(400, { code: 'VALIDATION_ERROR' }));
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      await send('/api/backend' + path, { method, body: JSON.stringify(parsed.data) }, guard);
      await cache.invalidateQueries();
      close();
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && [409, 412].includes(e.status)) {
        setStale(true);
        void cache.invalidateQueries({
          predicate: (q) =>
            q.queryKey.some((k) => typeof k === 'string' && k.includes('/memberships')),
        });
      }
      if (e instanceof ApiError && [503, 504].includes(e.status)) setSnapshot(body);
      if (e instanceof ApiError && e.status === 429)
        setWaitUntil(Date.now() + (e.problem.retryAfter ?? 60) * 1000);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  async function reload() {
    if (inFlight.current) return;
    setPending(true);
    try {
      if (request) {
        const fresh = await send<RequestDetail>(
          '/api/backend/api/admin/v1/personal-class-requests/' + request.id,
          {},
          guard,
        );
        if (!['Submitted', 'UnderReview', 'NeedsChanges'].includes(fresh.status))
          throw new ApiError(409, { code: 'PERSONAL_CLASS_REQUEST_CONFLICT' });
        setReviewVersion(fresh.version);
      } else {
        const fresh = await context.refetch();
        if (fresh.error) throw fresh.error;
        if (!fresh.data) throw new ApiError(409, { code: 'PERSONAL_CLASS_MANAGER_REQUIRED' });
        operationId.current = crypto.randomUUID();
      }
      setStale(false);
      setSnapshot(null);
      setError(undefined);
      await cache.invalidateQueries();
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="form-grid" onSubmit={submit}>
      {request ? (
        <>
          <p className="notice">
            هدف: {request.details.title}. تصمیم بررسی، با آماده‌شدن یا فعال‌شدن کلاس یکسان نیست.
          </p>
          <label>
            تصمیم بررسی
            <select
              aria-label="تصمیم بررسی"
              value={decision}
              disabled={disabledFields}
              onChange={(e) => setDecision(e.target.value)}
            >
              {reviewDecisions.map((d) => (
                <option key={d} value={d}>
                  {label(d)}
                </option>
              ))}
            </select>
          </label>
          {decision === 'Approved' && (
            <div>
              <span className="field-title">مدیر نهایی (اختیاری)</span>
              {disabledFields ? (
                <p>
                  <bdi>{manager ?? 'انتخاب نشده'}</bdi>
                </p>
              ) : can('/api/admin/v1/users') ? (
                <EntityPicker
                  title="مدیر نهایی"
                  kind="user"
                  value={manager}
                  nullable
                  onChange={(v) => setManager(v?.value ?? null)}
                />
              ) : (
                <input
                  aria-label="شناسه مدیر نهایی"
                  dir="ltr"
                  value={manager ?? ''}
                  disabled={disabledFields}
                  onChange={(e) => setManager(e.target.value || null)}
                />
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="notice">
            <span>
              تنها اختیارهای انتخاب‌شده ثبت می‌شوند؛ برداشتن همهٔ تیک‌ها، اختیارهای این مدیر را لغو
              می‌کند.
            </span>
          </p>
          {!grant && (
            <MembershipPicker
              classId={classId!}
              value={membership}
              disabled={disabledFields}
              onChange={(id) => {
                setMembership(id);
                setError(undefined);
                setStale(false);
                operationId.current = crypto.randomUUID();
              }}
            />
          )}
          {!!membership && context.isPending && (
            <p role="status">در حال بررسی عضویت و مجوز جاری…</p>
          )}
          {context.isError && (
            <ErrorState error={context.error} onRetry={() => void context.refetch()} />
          )}
          {context.data && !context.isError && !stale && (
            <div className="notice">
              <div>
                <strong>مدیر انتخاب‌شده: {context.data.member.displayName}</strong> · عضویت فعال
                <p className="field-help">اطلاعات عضویت و مجوز جاری از سرور دریافت شده‌اند.</p>
              </div>
            </div>
          )}
          <fieldset disabled={disabledFields}>
            <legend>مجموعه نهایی مجوزهای آموزشی</legend>
            {academicFlags.map((f) => (
              <label key={f} className="feature-row">
                <span>{flagLabels[f]}</span>
                <input
                  type="checkbox"
                  aria-label={flagLabels[f]}
                  checked={flags.includes(f)}
                  onChange={(e) =>
                    setFlags((v) => (e.target.checked ? [...v, f] : v.filter((x) => x !== f)))
                  }
                />
              </label>
            ))}
          </fieldset>
          {grant && (
            <p className="field-help">
              نسخه مجوز از ردیف انتخاب‌شده خوانده شده است. سوابق قدیمی به معنی مجوز مؤثر نیستند.
            </p>
          )}
        </>
      )}
      <label>
        دلیل این اقدام
        <textarea
          aria-label="دلیل این اقدام"
          required
          maxLength={500}
          disabled={disabledFields}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {!!error && error !== context.error && <ErrorState error={error} />}
      {snapshot && (
        <p className="notice">
          نتیجه نامشخص است. ابتدا وضعیت تازه را بررسی کنید؛ تلاش مجدد این فرم دقیقاً همان درخواست
          قبلی را می‌فرستد.
        </p>
      )}
      {(stale || snapshot) && (
        <Button type="button" variant="outline" disabled={pending} onClick={() => void reload()}>
          دریافت وضعیت تازه و حفظ ورودی
        </Button>
      )}
      <div className="form-actions">
        <Button
          type="submit"
          disabled={
            pending || stale || now < waitUntil || (!snapshot && (!valid || !reason.trim()))
          }
        >
          {pending ? 'در حال ثبت…' : snapshot ? 'ارسال مجدد همین درخواست' : title}
        </Button>
      </div>
    </form>
  );
}
