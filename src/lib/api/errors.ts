export type Problem = {
  status?: number;
  code?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  retryAfter?: number;
};
export const errorMessages: Record<number, string> = {
  400: 'اطلاعات واردشده معتبر نیست. فیلدها را بررسی کنید.',
  401: 'نشست شما پایان یافته است. دوباره وارد شوید.',
  403: 'اجازه انجام این کار را ندارید.',
  404: 'این مورد در دسترس نیست.',
  409: 'وضعیت تغییر کرده یا با این اقدام تعارض دارد. اطلاعات تازه را بررسی کنید.',
  410: 'این دعوت یا منبع پایان یافته است.',
  412: 'اطلاعات توسط کاربر دیگری تغییر کرده است. نسخه تازه را بررسی کنید.',
  413: 'فایل خالی است یا حجم آن بیش از ۲۰ مگابایت مجاز پنل است.',
  422: 'این اقدام با سیاست‌های سامانه سازگار نیست.',
  429: 'درخواست‌ها بیش از حد مجاز است. کمی صبر کنید.',
  502: 'ارتباط با سرویس برقرار نشد.',
  503: 'سرویس موقتاً در دسترس نیست.',
  504: 'زمان پاسخ‌گویی تمام شد. پیش از تکرار اقدام، نتیجه را بررسی کنید.',
};
const businessMessages: Record<string, string> = {
  PERSONAL_CLASS_MANAGER_REQUIRED:
    'این عضویت دیگر مدیر فعال و مجاز کلاس نیست. اعضای کلاس را دوباره بررسی کنید.',
  MEMBERSHIP_LOOKUP_INCOMPLETE:
    'بررسی کامل عضویت ممکن نشد؛ مجوزی ارسال نشده است. دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.',
  GRANT_HISTORY_REVIEW_REQUIRED:
    'چند مجوز جاری برای این عضویت برگشت؛ پیش از تغییر، سوابق را با پشتیبانی بررسی کنید.',
};
const serviceMessages: Record<string, string> = {
  OTP_SERVICE_UNAVAILABLE:
    'سرویس ارسال کد ورود موقتاً در دسترس نیست. کمی بعد دوباره «دریافت کد ورود» را بزنید.',
  OTP_REQUEST_TIMEOUT:
    'پاسخ سرویس ارسال کد ورود طول کشید. اگر کدی دریافت نکردید، کمی بعد دوباره درخواست بدهید.',
  OTP_RESPONSE_INVALID:
    'پاسخ سرویس ارسال کد ورود قابل پردازش نیست. کد پیگیری را برای پشتیبانی بفرستید.',
  CONTRACT_MISMATCH: 'پاسخ سرویس قابل پردازش نیست. کد پیگیری را برای پشتیبانی بفرستید.',
  UPSTREAM_UNAVAILABLE: 'ارتباط پنل با سرویس اصلی موقتاً قطع است. کمی بعد دوباره تلاش کنید.',
  NETWORK_ERROR: 'ارتباط مرورگر با پنل قطع شده است. اتصال را بررسی و دوباره تلاش کنید.',
};
export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: Problem = {},
  ) {
    super(
      problem.code === 'ORIGIN_REJECTED'
        ? 'نشانی صفحه ورود با تنظیمات پنل یکسان نیست. صفحه را از نشانی اصلی پنل باز کنید.'
        : problem.code === 'PLATFORM_OWNER_REQUIRED'
          ? 'ورود به این پنل فقط برای مالک پلتفرم مجاز است. این حساب دسترسی مالک ندارد.'
          : problem.code === 'OWNER_ACCESS_NOT_CONFIGURED'
            ? 'ورود مالک هنوز پیکربندی نشده است. با مسئول سامانه تماس بگیرید.'
            : (status === 409 && problem.code && businessMessages[problem.code]) ||
              (status >= 500 && problem.code && serviceMessages[problem.code]) ||
              errorMessages[status] ||
              'دریافت اطلاعات با مشکل روبه‌رو شد.',
    );
    this.name = 'ApiError';
  }
}
export function retryAfter(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds)
    ? Math.max(0, seconds)
    : Math.max(0, Math.ceil((Date.parse(value) - now) / 1000)) || undefined;
}
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
export function parseProblem(value: unknown, status: number, retry?: string | null): Problem {
  const p = isRecord(value) ? value : {};
  const errors: Record<string, string[]> = {};
  if (isRecord(p.errors))
    for (const [key, values] of Object.entries(p.errors))
      if (Array.isArray(values))
        errors[key] = values.filter((v): v is string => typeof v === 'string');
  return {
    status,
    code: typeof p.code === 'string' ? p.code : undefined,
    traceId:
      typeof p.traceId === 'string'
        ? p.traceId
        : typeof p.correlationId === 'string'
          ? p.correlationId
          : undefined,
    errors,
    retryAfter: retryAfter(retry ?? null),
  };
}
