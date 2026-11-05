'use client';
import { useState, useEffect } from 'react';
import { AlertCircle, Inbox, LockKeyhole, RefreshCw, WifiOff } from 'lucide-react';
import Link from '@/components/ui/app-link';
import { ApiError } from '@/lib/api/errors';
import { Button } from './button';
import { date } from '@/lib/formatting';
export function LoadingSkeleton() {
  return (
    <div className="skeleton-wrap" role="status" aria-label="در حال دریافت اطلاعات">
      <div className="skeleton h-12" />
      {[0, 1, 2, 3, 4].map((n) => (
        <div key={n} className="skeleton h-16" />
      ))}
    </div>
  );
}
export function EmptyState({
  title = 'موردی پیدا نشد',
  description = 'فیلترها را تغییر دهید یا بعداً دوباره بررسی کنید.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="state">
      <Inbox />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const err = error instanceof ApiError ? error : new ApiError(503);
  const [retryAt, setRetryAt] = useState(0),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const at = err.problem.retryAfter ? Date.now() + err.problem.retryAfter * 1000 : 0;
    setRetryAt(at);
    if (at <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [error]);
  const Icon =
    err.status === 403 ? LockKeyhole : err.problem.code === 'NETWORK_ERROR' ? WifiOff : AlertCircle;
  return (
    <div className="state error-state" role="alert">
      <Icon />
      <h3>
        {err.status === 403
          ? 'دسترسی محدود است'
          : err.status === 401
            ? 'ورود مجدد لازم است'
            : 'اطلاعات دریافت نشد'}
      </h3>
      <p>{err.message}</p>
      {err.problem.code && <small dir="ltr">{err.problem.code}</small>}
      {err.problem.code === 'PERMISSION_MAPPING_UNVERIFIED' && (
        <p>نگاشت مجوز این عملیات هنوز توسط تیم Backend تأیید نشده است.</p>
      )}
      {err.problem.retryAfter && <p>زمان انتظار: {err.problem.retryAfter} ثانیه</p>}
      {err.problem.traceId && <small dir="ltr">شناسه پیگیری: {err.problem.traceId}</small>}
      {err.status === 401 ? (
        <Button asChild>
          <Link href="/login">ورود به حساب</Link>
        </Button>
      ) : (
        onRetry &&
        err.status !== 403 && (
          <Button variant="outline" disabled={now < retryAt} onClick={onRetry}>
            <RefreshCw size={16} />
            دریافت دوباره
          </Button>
        )
      )}
    </div>
  );
}
const statuses: Record<string, string> = {
  Submitted: 'ارسال‌شده',
  UnderReview: 'در حال بررسی',
  NeedsChanges: 'نیازمند اصلاح',
  Approved: 'تأیید تشکیل',
  Provisioning: 'در حال آماده‌سازی',
  Library: 'کتابخانه',
  Document: 'سند',
  Image: 'تصویر',
  Hidden: 'پنهان',
  Archived: 'بایگانی‌شده',
  Ready: 'آماده',
  Processing: 'در حال پردازش',
  NotRequested: 'درخواست نشده',
  PendingValidation: 'در انتظار بررسی',
  FileValidated: 'فایل بررسی شده',
  ReviewRequired: 'نیازمند بررسی',
  Rejected: 'ردشده',
  Private: 'خصوصی',
  Public: 'عمومی',
  Healthy: 'سالم',
  Degraded: 'نیازمند بررسی',
  Unhealthy: 'اختلال',
  Individual: 'فردی',
  Gregorian: 'میلادی',
  Persian: 'شمسی',
  NoSubscription: 'بدون اشتراک',
  PendingPayment: 'در انتظار پرداخت',
  QuotaWarning: 'هشدار سهمیه',
  QuotaExceeded: 'سهمیه تکمیل شده',
  GracePeriod: 'مهلت تمدید',
  ScheduledDowngrade: 'کاهش پلن برای دوره بعد',
  LegacyPendingContract: 'در انتظار قرارداد معتبر',
  NotApplicable: 'مشمول نیست',
  AwaitingValidContract: 'در انتظار قرارداد معتبر',
  CurrentCapacity: 'ظرفیت فعلی',
  PeriodicConsumption: 'مصرف دوره‌ای',
  ActiveLearners: 'فراگیر فعال',
  ActiveClasses: 'کلاس فعال',
  StorageBytes: 'فضای ذخیره‌سازی',
  ReportExports: 'خروجی گزارش',
  AiTextRequests: 'درخواست متنی هوش مصنوعی',
  SourceCount: 'تعداد منابع',
  AssignmentFileBytes: 'حجم فایل آموزشی',
  Academic: 'آموزش',
  Assignments: 'تکالیف',
  Exams: 'آزمون‌ها',
  Messaging: 'پیام‌رسانی',
  Reports: 'گزارش‌ها',
  Storage: 'ذخیره‌سازی',
  Ai: 'هوش مصنوعی',
  PersonalClassHosting: 'میزبانی کلاس شخصی',
  PersonalSources: 'منابع شخصی',
  Active: 'فعال',
  Suspended: 'معلق',
  Inactive: 'غیرفعال',
  Ended: 'پایان‌یافته',
  Pending: 'در انتظار',
  Completed: 'تکمیل‌شده',
  NeedsAttention: 'نیازمند رسیدگی',
  Requested: 'درخواست ثبت‌شده',
  OrganizationCreated: 'سازمان ساخته شد',
  SubscriptionAssigned: 'اشتراک تخصیص یافت',
  ManagerInvitationCreated: 'دعوت مدیر ایجاد شد',
  Published: 'منتشرشده',
  Draft: 'پیش‌نویس',
  Revoked: 'لغوشده',
  Expired: 'منقضی',
  Paid: 'پرداخت‌شده',
  Failed: 'ناموفق',
  Open: 'باز',
  InReview: 'در حال بررسی',
  Resolved: 'رسیدگی‌شده',
  Dismissed: 'ردشده',
  Manager: 'مدیر',
  Teacher: 'معلم',
  Student: 'دانش‌آموز',
  Parent: 'والد',
  Personal: 'شخصی',
  Organization: 'سازمانی',
  Direct: 'مستقیم',
  Group: 'گروه',
  Channel: 'کانال',
  Scheduled: 'برنامه‌ریزی‌شده',
  Cancelled: 'لغوشده',
  Present: 'حاضر',
  Absent: 'غایب',
  Late: 'با تأخیر',
  Excused: 'موجه',
};
export function label(value: string) {
  return statuses[value] ?? value;
}
export function StatusBadge({ value }: { value: unknown }) {
  const text = String(value ?? 'نامشخص');
  const tone = [
    'Active',
    'Completed',
    'Published',
    'Paid',
    'Resolved',
    'Present',
    'Healthy',
  ].includes(text)
    ? 'success'
    : ['Suspended', 'Failed', 'Revoked', 'Cancelled', 'Absent', 'Unhealthy'].includes(text)
      ? 'danger'
      : ['Pending', 'NeedsAttention', 'Open', 'InReview', 'Requested', 'Late', 'Degraded'].includes(
            text,
          )
        ? 'warning'
        : 'neutral';
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" />
      {label(text)}
    </span>
  );
}
export function UpdatedAt({ at }: { at: number }) {
  return at > 0 ? (
    <span className="updated">آخرین دریافت موفق: {date(new Date(at).toISOString(), true)}</span>
  ) : null;
}
