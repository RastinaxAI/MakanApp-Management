'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, Circle, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import type { components } from '@/generated/api/schema';
import Link from '@/components/ui/app-link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EntityPicker, PlanVersionPicker, type Choice } from '@/components/ui/entity-picker';

import { ErrorState, StatusBadge } from '@/components/ui/states';
import { IdCopy } from '@/components/ui/data-view';
import { useAccess } from '@/features/access-context/provider';
import { useApi } from '@/lib/api/hooks';
import { request } from '@/lib/api/client';
import { validator } from '@/lib/api/contract';
import { ApiError } from '@/lib/api/errors';
import { date, number } from '@/lib/formatting';
import { provisioningStages } from './provisioning-state';

type Command = components['schemas']['ProvisionOrganizationCommand'];
type Result = components['schemas']['PlatformProvisioningResult'];
const endpoint = '/api/admin/v1/provisioning';
const commandSchema = validator({ $ref: '#/components/schemas/ProvisionOrganizationCommand' });
export function ProvisionOrganization() {
  const { can } = useAccess();
  const [open, setOpen] = useState(false);
  if (!can(endpoint, 'POST')) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Building2 size={18} />
        راه‌اندازی سازمان
      </Button>
      {open && (
        <DialogContent
          title="راه‌اندازی سازمان"
          description="سازمان، مدیر و اشتراک را مشخص کنید و پیش از ثبت، خلاصه را بررسی کنید."
        >
          <ProvisionForm />
        </DialogContent>
      )}
    </Dialog>
  );
}
function ProvisionForm() {
  const { session, guard, can } = useAccess();
  const cache = useQueryClient();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [manager, setManager] = useState<Choice | null>(null);
  const [plan, setPlan] = useState<Choice | null>(null);
  const [ends, setEnds] = useState('');
  const [expires, setExpires] = useState('');
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [submitted, setSubmitted] = useState<Command | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const [, tick] = useState(0);
  const lock = useRef(false);
  const key = 'makan-provision-pending:' + session.user.id;
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (!stored) return;
      const parsed = commandSchema.safeParse(JSON.parse(stored));
      if (parsed.success) {
        const draft = parsed.data as Command;
        setSubmitted(draft);
        setOperationId(draft.clientOperationId);
        setName(draft.organizationName);
        setReason(draft.reason);
        setStep(2);
        setMessage('یک درخواست قبلی برای پیگیری نگه‌داری شده است. ابتدا نتیجه آن را بررسی کنید.');
      } else sessionStorage.removeItem(key);
    } catch {
      /* Storage may be unavailable; the mounted form still preserves the request. */
    }
  }, [key]);
  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const timer = setInterval(() => tick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [waitUntil]);
  const similar = useApi<components['schemas']['PlatformOrganizationPage']>(
    '/api/admin/v1/organizations?search=' + encodeURIComponent(name.trim()) + '&page=1&pageSize=5',
    step === 0 && name.trim().length >= 2,
  );
  const payload: Command = submitted ?? {
    clientOperationId: operationId,
    organizationName: name.trim(),
    reason: reason.trim(),
    initialManagerUserId: manager?.value ?? null,
    planVersionId: plan?.value ?? null,
    subscriptionEndsAtUtc: plan && ends ? new Date(ends).toISOString() : null,
    invitationExpiresAtUtc: manager && expires ? new Date(expires).toISOString() : null,
  };
  async function submit() {
    if (lock.current || Date.now() < waitUntil) return;
    const valid = commandSchema.safeParse(payload);
    if (!valid.success || !payload.organizationName.trim() || !payload.reason.trim()) {
      setMessage('نام سازمان و دلیل ایجاد را تکمیل کنید.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    setMessage('');
    setSubmitted(payload);
    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {}
    try {
      const res = await request<Result>(
        '/api/backend' + endpoint,
        { method: 'POST', body: JSON.stringify(payload) },
        guard,
      );
      setResult(res);
      setStep(3);
      await cache.invalidateQueries();
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(503);
      setError(err);
      if (err.status === 429) setWaitUntil(Date.now() + (err.problem.retryAfter ?? 60) * 1000);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function checkResult() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setMessage('');
    try {
      const params = new URLSearchParams({
        clientOperationId: payload.clientOperationId.trim(),
        page: '1',
        pageSize: '30',
      });
      const res = await request<components['schemas']['PlatformProvisioningPage']>(
        '/api/backend' + endpoint + '?' + params,
        {},
        guard,
      );
      if (res.items.length === 1 && res.totalCount === 1) {
        setResult({ request: res.items[0], replayed: false });
        setStep(3);
      } else if (res.items.length === 0 && res.totalCount === 0) {
        setMessage(
          'نتیجه‌ای برای همین شناسه پیدا نشد؛ نبودن آن، اثبات شکست نیست. در صورت نیاز همان درخواست را دوباره ارسال کنید.',
        );
      } else {
        setMessage(
          'بیش از یک نتیجه برای این شناسه برگشت. پیش از ارسال دوباره، شناسه پیگیری را با پشتیبانی بررسی کنید.',
        );
      }
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(503));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <div className="provision-wizard">
      <ol className="wizard-steps" aria-label="مراحل راه‌اندازی">
        {['سازمان', 'مدیر و اشتراک', 'بازبینی', 'نتیجه'].map((s, i) => (
          <li key={s} aria-current={step === i ? 'step' : undefined}>
            <span>{i < step ? <CheckCircle2 size={18} /> : number(i + 1)}</span>
            {s}
          </li>
        ))}
      </ol>
      {step === 0 && (
        <div className="form-grid">
          <label>
            نام سازمان
            <input
              aria-label="نام سازمان"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً مدرسه مهر"
              autoFocus
            />
          </label>
          <label>
            دلیل ایجاد
            <textarea
              aria-label="دلیل ایجاد"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="دلیل راه‌اندازی این سازمان را بنویسید"
            />
          </label>
          {name.trim().length >= 2 && can('/api/admin/v1/organizations') && (
            <div className="similar-organizations">
              <strong>بررسی سازمان‌های موجود</strong>
              {similar.isPending ? (
                <p role="status">در حال جست‌وجو…</p>
              ) : similar.isError ? (
                <ErrorState error={similar.error} onRetry={() => void similar.refetch()} />
              ) : similar.data?.items.length ? (
                <>
                  <p className="field-help">پیش از ساخت سازمان جدید، این موارد را بررسی کنید.</p>
                  {similar.data.items.map((o) => (
                    <Link key={o.id} href={'/admin/organizations/' + o.id} className="quick-link">
                      {o.name}
                      <StatusBadge value={o.status} />
                    </Link>
                  ))}
                </>
              ) : (
                <p className="field-help">سازمانی با این جست‌وجو پیدا نشد.</p>
              )}
            </div>
          )}
        </div>
      )}
      {step === 1 && (
        <div className="form-grid">
          <div>
            <span className="field-title">مدیر اولیه</span>
            <EntityPicker
              kind="user"
              title="انتخاب مدیر اولیه"
              value={manager?.value ?? null}
              onChange={setManager}
            />
            <p className="field-help">
              مدیر باید حساب موجود داشته باشد و دعوت را با حساب خودش بپذیرد.
            </p>
          </div>
          <div>
            <span className="field-title">پلن و نسخه اشتراک</span>
            <PlanVersionPicker value={plan?.value ?? null} onChange={setPlan} />
          </div>
          <div className="form-two-columns">
            <label>
              پایان اشتراک
              <input
                aria-label="پایان اشتراک"
                type="datetime-local"
                disabled={!plan}
                value={ends}
                onChange={(e) => setEnds(e.target.value)}
              />
              <span className="field-help">اختیاری؛ به وقت دستگاه شما</span>
            </label>
            <label>
              انقضای دعوت
              <input
                aria-label="انقضای دعوت"
                type="datetime-local"
                disabled={!manager}
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
              />
              <span className="field-help">اختیاری؛ به وقت دستگاه شما</span>
            </label>
          </div>
          <p className="notice">
            می‌توانید سازمان را بدون مدیر یا پلن ثبت کنید؛ در این صورت مراحل راه‌اندازی ناقص باقی
            می‌ماند.
          </p>
        </div>
      )}
      {step === 2 && (
        <div className="form-grid">
          <h3>خلاصه درخواست</h3>
          <dl className="review-summary">
            <div>
              <dt>سازمان</dt>
              <dd>{payload.organizationName}</dd>
            </div>
            <div>
              <dt>مدیر اولیه</dt>
              <dd>
                {submitted
                  ? payload.initialManagerUserId
                    ? 'طبق درخواست ثبت‌شده'
                    : 'انتخاب نشده'
                  : (manager?.label ?? 'انتخاب نشده')}
              </dd>
            </div>
            <div>
              <dt>نسخه پلن</dt>
              <dd>
                {submitted
                  ? payload.planVersionId
                    ? 'طبق درخواست ثبت‌شده'
                    : 'انتخاب نشده'
                  : (plan?.label ?? 'انتخاب نشده')}
              </dd>
            </div>
            <div>
              <dt>پایان اشتراک</dt>
              <dd>
                {payload.subscriptionEndsAtUtc ? date(payload.subscriptionEndsAtUtc) : 'تعیین نشده'}
              </dd>
            </div>
            <div>
              <dt>انقضای دعوت</dt>
              <dd>
                {payload.invitationExpiresAtUtc
                  ? date(payload.invitationExpiresAtUtc)
                  : 'تعیین نشده'}
              </dd>
            </div>
            <div>
              <dt>دلیل ایجاد</dt>
              <dd>{payload.reason}</dd>
            </div>
          </dl>
          {submitted && (
            <p className="notice warning">
              این درخواست ارسال شده یا نتیجه آن نامشخص است. اطلاعات و شناسه برای جلوگیری از ثبت
              تکراری ثابت مانده‌اند.
            </p>
          )}
        </div>
      )}
      {step === 3 && result && (
        <div className="form-grid">
          <div className="result-heading">
            <h3>{result.request.organizationName}</h3>
            <StatusBadge value={result.request.status} />
          </div>
          <ul className="readiness-list">
            {provisioningStages(result.request).map((s) => (
              <li key={s.title}>
                {s.done ? (
                  <CheckCircle2 className="text-success" size={21} />
                ) : (
                  <Circle size={21} />
                )}
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="notice">
            پذیرش دعوت و عضویت فعال مدیر را در پرونده سازمان بررسی کنید. وضعیت «تکمیل‌شده» این
            درخواست به‌تنهایی آمادگی سازمان را اثبات نمی‌کند.
          </p>
          <p className="notice">
            اگر گروه یا کانال رسمی سازمان در دسترس نیست، شناسه پیگیری همین درخواست را به پشتیبانی
            بدهید؛ برای رفع آن سازمان یا گفتگوی جایگزین نسازید.
          </p>
          {result.request.failureCode && (
            <div className="form-message error">
              نیاز به پیگیری · <bdi>{result.request.failureCode}</bdi>
            </div>
          )}
          {result.replayed && (
            <p className="field-help">سرور نتیجه همان درخواست قبلی را برگرداند.</p>
          )}
          {result.request.organizationId &&
            can('/api/admin/v1/organizations/' + result.request.organizationId) && (
              <Button asChild>
                <Link href={'/admin/organizations/' + result.request.organizationId}>
                  مشاهده پرونده و آمادگی سازمان
                  <ArrowLeft size={16} />
                </Link>
              </Button>
            )}
        </div>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {error && <ErrorState error={error} />}
      {error && [400, 422].includes(error.status) && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            try {
              sessionStorage.removeItem(key);
            } catch {}
            // A rejected payload can be corrected explicitly. Ambiguous failures never take this path.
            setSubmitted(null);
            setOperationId(crypto.randomUUID());
            setError(null);
            setStep(0);
            setMessage(
              'درخواست توسط سرور رد شد. اطلاعات را اصلاح و پیش از ارسال دوباره بازبینی کنید.',
            );
          }}
        >
          اصلاح اطلاعات ردشده
        </Button>
      )}
      <div className="wizard-actions">
        {step > 0 && step < 3 && !submitted && (
          <Button variant="ghost" disabled={busy} onClick={() => setStep(step - 1)}>
            <ArrowRight size={16} />
            بازگشت
          </Button>
        )}
        {step < 2 && (
          <Button
            disabled={step === 0 && (!name.trim() || !reason.trim())}
            onClick={() => setStep(step + 1)}
          >
            ادامه
            <ArrowLeft size={16} />
          </Button>
        )}
        {submitted && can(endpoint) && (
          <Button variant="outline" disabled={busy} onClick={() => void checkResult()}>
            <RefreshCw size={15} />
            بررسی نتیجه درخواست
          </Button>
        )}
        {step === 2 && (
          <Button disabled={busy || Date.now() < waitUntil} onClick={() => void submit()}>
            {busy
              ? 'در حال بررسی…'
              : Date.now() < waitUntil
                ? 'لطفاً منتظر بمانید'
                : submitted
                  ? 'ارسال مجدد همین درخواست'
                  : 'ثبت نهایی سازمان'}
          </Button>
        )}
        {step === 3 && (
          <Button
            variant="outline"
            onClick={() => {
              try {
                sessionStorage.removeItem(key);
              } catch {}
              setSubmitted(null);
              setResult(null);
              setError(null);
              setMessage('');
              setName('');
              setReason('');
              setManager(null);
              setPlan(null);
              setEnds('');
              setExpires('');
              setOperationId(crypto.randomUUID());
              setStep(0);
            }}
          >
            راه‌اندازی سازمان دیگر
          </Button>
        )}
      </div>
      {submitted && (
        <details className="request-receipt">
          <summary>شناسه پیگیری درخواست</summary>
          <IdCopy value={submitted.clientOperationId} />
        </details>
      )}
    </div>
  );
}
