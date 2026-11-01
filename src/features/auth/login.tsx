'use client';
import { BrandMark } from '@/components/ui/brand';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  GraduationCap,
  Smartphone,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { InstallPanel } from '@/features/pwa/install';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { number } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';
import {
  mobilePattern,
  codePattern,
  mobileError,
  codeError,
  normalizeMobile,
  normalizeCode,
} from '@/lib/login-input';
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [fieldError, setFieldError] = useState<{ phone?: string; code?: string }>({});
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
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || now < rateUntil || (challenge && remaining <= 0)) return;
    const phone = normalizeMobile(phoneNumber);
    const code = normalizeCode(codeInput);
    if (!mobilePattern.test(phone)) {
      setFieldError({ phone: mobileError });
      return;
    }
    if (challenge && !codePattern.test(code)) {
      setFieldError({ code: codeError });
      return;
    }
    setFieldError({});
    setBusy(true);
    setError(null);
    try {
      if (!challenge) {
        const result = await request<components['schemas']['RequestOtpResult']>(
          '/api/auth/challenge',
          { method: 'POST', body: JSON.stringify({ phoneNumber: phone }) },
        );
        setChallenge(result);
        setNow(Date.now());
        setTimeout(() => document.getElementById('otp-code')?.focus(), 50);
      } else {
        await request<{ authenticated: true }>('/api/auth/verify', {
          method: 'POST',
          body: JSON.stringify({
            challengeId: challenge.challengeId,
            phoneNumber: phone,
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
            phoneNumber: normalizeMobile(phoneNumber),
          }),
        }),
      );
      setCodeInput('');
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(503);
      setError(err);
      if (err.status === 429) setRateUntil(Date.now() + (err.problem.retryAfter ?? 60) * 1000);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page" data-application="makan-management-panel" data-screen="owner-login">
      <aside className="login-brand-panel">
        <div className="brand">
          <BrandMark />
          <span>
            ماکان<span className="brand-sub">مدیریت یکپارچه آموزش</span>
          </span>
        </div>
        <div className="login-hero">
          <div className="login-eyebrow">فضای مدیریت ماکان</div>
          <h1>
            مدیریت یکپارچه
            <br />
            پلتفرم ماکان
          </h1>
          <p>سازمان‌ها، حساب‌ها و خدمات آموزشی را در یک فضای منظم مدیریت کنید.</p>
          <div className="login-hero-features">
            <div>
              <Building2 size={20} />
              <span>
                <strong>سازمان‌ها</strong>
                <small>مدیریت، راه‌اندازی و پیگیری</small>
              </span>
            </div>
            <div>
              <GraduationCap size={20} />
              <span>
                <strong>آموزش</strong>
                <small>مرور وضعیت کلاس‌ها و فعالیت‌ها</small>
              </span>
            </div>
            <div>
              <ShieldCheck size={20} />
              <span>
                <strong>دسترسی‌ها</strong>
                <small>کنترل نقش‌ها و امنیت حساب‌ها</small>
              </span>
            </div>
          </div>
        </div>
        <div className="login-brand-footer">
          <ShieldCheck size={16} /> ویژه مالک پلتفرم
        </div>
      </aside>
      <main className="login-main">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <BrandMark />
            ماکان
          </div>
          <div className="login-progress" aria-label="مراحل ورود">
            <span
              className={!challenge ? 'current' : 'complete'}
              aria-current={!challenge ? 'step' : undefined}
            >
              ۱<span>شماره همراه</span>
            </span>
            <i />
            <span
              className={challenge ? 'current' : ''}
              aria-current={challenge ? 'step' : undefined}
            >
              ۲<span>کد ورود</span>
            </span>
          </div>
          <h2>{challenge ? 'کد ورود را وارد کنید' : 'ورود به پنل مدیریت'}</h2>
          <p className="login-intro">
            {challenge ? (
              <>
                کد ارسال‌شده به <bdi dir="ltr">{normalizeMobile(phoneNumber)}</bdi> را وارد کنید.
              </>
            ) : (
              'با شماره همراه حساب مالک پلتفرم وارد شوید.'
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
          <form className="form-grid login-form" onSubmit={submit} noValidate>
            {!challenge ? (
              <label htmlFor="phone-number">
                شماره همراه
                <input
                  id="phone-number"
                  aria-label="شماره همراه"
                  dir="ltr"
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength={11}
                  pattern="09[0-9]{9}"
                  placeholder="09123456789"
                  autoFocus
                  name="phoneNumber"
                  aria-invalid={!!fieldError.phone}
                  value={phoneNumber}
                  onChange={(event) => {
                    setPhoneNumber(event.target.value);
                    setFieldError({});
                  }}
                />
                {fieldError.phone && <span className="field-error">{fieldError.phone}</span>}
                <span className="field-help">
                  شماره همراه باید ۱۱ رقم باشد و با 09 شروع شود؛ مانند 09100000000.
                </span>
              </label>
            ) : (
              <>
                <label htmlFor="otp-code">
                  کد ورود
                  <input
                    id="otp-code"
                    aria-label="کد ورود"
                    className="otp-input"
                    dir="ltr"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    aria-describedby="otp-help"
                    name="code"
                    aria-invalid={!!fieldError.code}
                    value={codeInput}
                    onChange={(event) => {
                      setCodeInput(event.target.value);
                      setFieldError({});
                    }}
                  />
                  {fieldError.code && <span className="field-error">{fieldError.code}</span>}
                  <span id="otp-help" className="field-help">
                    کد ۶ رقمی ارسال‌شده را وارد کنید.
                  </span>
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
                  setCodeInput('');
                  setFieldError({});
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
            <span>ورود به این فضا فقط برای مالک پلتفرم مجاز است.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
