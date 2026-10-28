'use client';
import { BrandMark } from '@/components/ui/brand';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  GraduationCap,
  LockKeyhole,
  Smartphone,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { InstallPanel } from '@/features/pwa/install';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { latinDigits, number } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';
import { phoneInputSchema } from '@/lib/auth-input';

const schema = z.object({
  phoneNumber: phoneInputSchema,
  code: z.string().optional(),
});
export function LoginForm({ accessTesting = false }: { accessTesting?: boolean }) {
  const router = useRouter();
  const [accessNotice, setAccessNotice] = useState('');
  const [challenge, setChallenge] = useState<components['schemas']['RequestOtpResult'] | null>(
      null,
    ),
    [now, setNow] = useState(Date.now()),
    [error, setError] = useState<ApiError | null>(null),
    [rateUntil, setRateUntil] = useState(0),
    [busy, setBusy] = useState(false);
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { phoneNumber: '', code: '' },
  });
  useEffect(() => {
    const access = new URLSearchParams(window.location.search).get('access');
    if (access === 'owner-required')
      setAccessNotice('این پنل فقط برای مالک پلتفرم است. دسترسی این حساب تأیید نشد.');
    if (access === 'unavailable')
      setAccessNotice('تأیید دسترسی مالک فعلاً ممکن نیست. کمی بعد دوباره تلاش کنید.');
  }, []);
  useEffect(() => {
    if (!challenge && rateUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge, rateUntil]);
  const remaining = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.expiresAtUtc) - now) / 1000))
    : 0;
  const resendAt = Math.max(rateUntil, challenge ? Date.parse(challenge.resendAvailableAtUtc) : 0);
  async function submit(values: z.output<typeof schema>) {
    setBusy(true);
    setError(null);
    try {
      if (!challenge) {
        const result = await request<components['schemas']['RequestOtpResult']>(
          '/api/auth/challenge',
          { method: 'POST', body: JSON.stringify({ phoneNumber: values.phoneNumber }) },
        );
        setChallenge(result);
        setNow(Date.now());
        setTimeout(() => document.getElementById('otp-code')?.focus(), 50);
      } else {
        const code = latinDigits(values.code ?? '').replace(/\s/g, '');
        if (!/^\d{4,8}$/.test(code)) {
          form.setError('code', { message: 'کد ورود را با ارقام معتبر وارد کنید.' });
          return;
        }
        await request<{ authenticated: true }>('/api/auth/verify', {
          method: 'POST',
          body: JSON.stringify({
            challengeId: challenge.challengeId,
            phoneNumber: values.phoneNumber,
            code,
            deviceName: 'Makan Management Web',
          }),
        });
        router.replace('/admin');
      }
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(503);
      setError(err);
      if (err.status === 429) setRateUntil(Date.now() + (err.problem.retryAfter ?? 60) * 1000);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (now < resendAt || busy) return;
    setBusy(true);
    setError(null);
    try {
      setChallenge(
        await request('/api/auth/challenge', {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: latinDigits(form.getValues('phoneNumber')).replace(/[\s-]/g, ''),
          }),
        }),
      );
      form.setValue('code', '');
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(503);
      setError(err);
      if (err.status === 429) setRateUntil(Date.now() + (err.problem.retryAfter ?? 60) * 1000);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <aside className="login-brand-panel">
        <div className="brand">
          <BrandMark />
          <span>
            ماکان<span className="brand-sub">مدیریت یکپارچه آموزش</span>
          </span>
        </div>
        <div className="login-hero">
          <div className="login-eyebrow">MAKAN MANAGEMENT</div>
          <h1>
            نگاهی روشن‌تر،
            <br />
            مدیریتی یکپارچه‌تر.
          </h1>
          <p>فضایی منظم برای مدیریت سازمان‌ها، همراهی با افراد و نظارت بر جریان آموزش.</p>
          <div className="login-hero-features">
            <div>
              <Building2 size={20} />
              مدیریت متمرکز سازمان‌ها
            </div>
            <div>
              <GraduationCap size={20} />
              اطلاعات آموزشی در یک نگاه
            </div>
            <div>
              <ShieldCheck size={20} />
              ورود اختصاصی مالک پلتفرم
            </div>
          </div>
        </div>
        <div className="login-brand-footer">ماکان · پنل مالک پلتفرم</div>
      </aside>
      <main className="login-main">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <BrandMark />
            ماکان
          </div>
          <div className="login-lock">
            <LockKeyhole size={24} />
          </div>
          <h2>{challenge ? 'کد ورود را وارد کنید' : 'ورود مالک پلتفرم'}</h2>
          <p className="login-intro">
            {challenge ? (
              <>
                کد ارسال‌شده به <bdi dir="ltr">{form.getValues('phoneNumber')}</bdi> را وارد کنید.
              </>
            ) : (
              'شماره همراه حساب مالک پلتفرم را وارد کنید. سایر نقش‌ها اجازه ورود به این پنل را ندارند.'
            )}
          </p>
          {accessTesting && (
            <div className="form-message" role="status">
              آزمون کد ورود روی سرور واقعی فعال است. نقش مالک هنوز پیکربندی نشده؛ تأیید کد به‌تنهایی
              اجازه ورود به پنل نمی‌دهد.
            </div>
          )}
          {accessNotice && (
            <div className="form-message error" role="alert">
              {accessNotice}
            </div>
          )}
          <form className="form-grid login-form" onSubmit={form.handleSubmit(submit)} noValidate>
            {!challenge ? (
              <label htmlFor="phone-number">
                شماره همراه
                <input
                  id="phone-number"
                  aria-label="شماره همراه"
                  dir="ltr"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="0912 345 6789"
                  autoFocus
                  aria-invalid={!!form.formState.errors.phoneNumber}
                  {...form.register('phoneNumber')}
                />
                {form.formState.errors.phoneNumber && (
                  <span className="field-error">{form.formState.errors.phoneNumber.message}</span>
                )}
                <span className="field-help">
                  داشتن نقش مدیر مدرسه، معلم، والد یا دانش‌آموز مجوز ورود نیست.
                </span>
                <span className="field-help">
                  شماره همراه ۱۱ رقمی، مانند 09100000000، وارد کنید.
                </span>
              </label>
            ) : (
              <>
                <label htmlFor="otp-code">
                  کد ورود
                  <input
                    id="otp-code"
                    className="otp-input"
                    dir="ltr"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={8}
                    aria-invalid={!!form.formState.errors.code}
                    {...form.register('code')}
                  />
                  {form.formState.errors.code && (
                    <span className="field-error">{form.formState.errors.code.message}</span>
                  )}
                </label>
                <div className="timer">
                  <span>
                    {remaining > 0
                      ? `اعتبار کد: ${number(Math.floor(remaining / 60))}:${String(remaining % 60).padStart(2, '0')}`
                      : 'اعتبار کد تمام شده است'}
                  </span>
                  <button
                    type="button"
                    className="button button-ghost button-sm"
                    disabled={busy || now < resendAt}
                    onClick={() => void resend()}
                  >
                    {now < resendAt
                      ? `${number(Math.ceil((resendAt - now) / 1000))} ثانیه تا ارسال مجدد`
                      : 'ارسال دوباره کد'}
                  </button>
                </div>
              </>
            )}
            {error && (
              <div className="form-message error" role="alert">
                {error.message}
                {error.problem.traceId && (
                  <small className="block mt-2">
                    کد پیگیری: <bdi dir="ltr">{error.problem.traceId}</bdi>
                  </small>
                )}
              </div>
            )}
            <Button
              type="submit"
              disabled={busy || now < rateUntil || (!!challenge && remaining <= 0)}
            >
              {busy ? 'لطفاً صبر کنید…' : challenge ? 'تأیید و ورود' : 'دریافت کد ورود'}
              <ArrowLeft size={17} />
            </Button>
            {challenge && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setChallenge(null);
                  setError(null);
                  form.setValue('code', '');
                }}
              >
                <ArrowRight size={16} />
                تغییر شماره همراه
              </Button>
            )}
          </form>
          <InstallPanel compact />
          <div className="login-security">
            <ShieldCheck size={17} />
            <span>
              پس از تأیید کد، مالک‌بودن حساب در سرور بررسی می‌شود. هر عملیات به مجوز اختصاصی خود
              نیاز دارد.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
