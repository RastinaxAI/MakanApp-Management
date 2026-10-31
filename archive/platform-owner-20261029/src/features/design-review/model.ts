// Design proposals only. These fixtures are deliberately separate from generated API contracts.
export const directions = ['atlas', 'orbit', 'sepehr'] as const;
export type Direction = (typeof directions)[number];
export type Screen = 'plans' | 'messenger';
export type Scenario = 'ready' | 'loading' | 'empty' | 'error' | 'revoked';
export const directionInfo = {
  atlas: {
    name: 'اطلس',
    number: '۰۱',
    label: 'پنل منظم، ارتباط آشنا',
    description:
      'ناوبری ثابت، جدول خوانا و گفت‌وگوی سه‌ستونه؛ برای جابه‌جایی سریع بین کارهای مدیریتی و ارتباطات.',
    strength: 'بهترین تعادل برای مدیریت، فارسی و پیام‌رسان آشنا',
    limitation: 'در نمایشگر کوچک، جزئیات در صفحهٔ بعد باز می‌شوند.',
  },
  orbit: {
    name: 'مدار',
    number: '۰۲',
    label: 'فضای باز، تمرکز بیشتر',
    description: 'ناوبری افقی و کارت‌های مستقل؛ هر کار با یک نقطهٔ شروع روشن و فضای تنفس بیشتر.',
    strength: 'ساده برای کاربران شخصی و معرفی پلن‌ها',
    limitation: 'مقایسهٔ تعداد زیاد پلن به پیمایش بیشتری نیاز دارد.',
  },
  sepehr: {
    name: 'سپهر',
    number: '۰۳',
    label: 'فهرست کوتاه، جزئیات عمیق',
    description:
      'نوار ابزار باریک و چیدمان فهرست و جزئیات؛ اطلاعات ویرایشی در مرکز توجه قرار می‌گیرند.',
    strength: 'مناسب لمس و تبدیل الگوی فهرست/جزئیات به موبایل',
    limitation: 'ناوبری فشرده برای کاربران تازه به برچسب و راهنما نیاز دارد.',
  },
} as const;
export function isDirection(value: string): value is Direction {
  return directions.includes(value as Direction);
}
export function isScreen(value: string): value is Screen {
  return value === 'plans' || value === 'messenger';
}
export { isReviewEnabled } from './isolation';
export type PreviewPlan = {
  id: string;
  name: string;
  code: string;
  audience: 'فردی' | 'سازمانی';
  version: string;
  versionState: 'منتشرشده' | 'پیش‌نویس';
  visibility: 'عمومی' | 'پنهان';
  sale: 'در حال عرضه' | 'متوقف';
  price: number | null;
  quota: number | null;
  description: string;
};
export const initialPlans: PreviewPlan[] = [
  {
    id: 'learning',
    name: 'یادگیری روزانه',
    code: 'DAILY',
    audience: 'فردی',
    version: '۲',
    versionState: 'منتشرشده',
    visibility: 'عمومی',
    sale: 'در حال عرضه',
    price: null,
    quota: null,
    description: 'عنوان نمایشی برای خدمات شخصی و یادگیری روزمره',
  },
  {
    id: 'professional',
    name: 'یادگیری حرفه‌ای',
    code: 'PRO',
    audience: 'فردی',
    version: '۱',
    versionState: 'پیش‌نویس',
    visibility: 'پنهان',
    sale: 'متوقف',
    price: null,
    quota: null,
    description: 'نسخه‌ای در حال بررسی؛ بدون فعال‌سازی اشتراک',
  },
  {
    id: 'organization',
    name: 'آموزشگاه همراه',
    code: 'ACADEMY',
    audience: 'سازمانی',
    version: '۳',
    versionState: 'منتشرشده',
    visibility: 'عمومی',
    sale: 'در حال عرضه',
    price: null,
    quota: null,
    description: 'خدمات سازمانی با مالکیت مستقل از حساب اعضا',
  },
  {
    id: 'makan',
    name: 'ماکان آزاد',
    code: 'MAKAN',
    audience: 'فردی',
    version: '۱',
    versionState: 'پیش‌نویس',
    visibility: 'پنهان',
    sale: 'متوقف',
    price: null,
    quota: null,
    description: 'نام کاری؛ آزاد به معنی رایگان یا نامحدود نیست',
  },
];
export function filterPlans(plans: PreviewPlan[], query: string, audience: string) {
  const q = query.trim().toLocaleLowerCase('fa');
  return plans.filter(
    (p) =>
      (audience === 'همه' || p.audience === audience) &&
      `${p.name} ${p.code}`.toLocaleLowerCase('fa').includes(q),
  );
}
export function formatUnknownAmount(value: number | null) {
  return value === null ? 'تعیین نشده' : new Intl.NumberFormat('fa-IR').format(value);
}
export type PreviewChat = {
  id: string;
  name: string;
  initials: string;
  scope: 'Personal' | 'Organization';
  organization: string | null;
  kind: string;
  unread: string | null;
  time: string;
  last: string;
  color: string;
};
export const chats: PreviewChat[] = [
  {
    id: 'sara',
    name: 'سارا احمدی',
    initials: 'سا',
    scope: 'Personal',
    organization: null,
    kind: 'گفت‌وگوی شخصی',
    unread: '۲',
    time: '۱۰:۴۲',
    last: 'عالیه، پس عصر با هم مرور می‌کنیم.',
    color: 'blue',
  },
  {
    id: 'class',
    name: 'گروه کلاس زبان',
    initials: 'زب',
    scope: 'Organization',
    organization: 'آموزشگاه سپهر',
    kind: 'گروه رسمی · نمونه',
    unread: '۵',
    time: '۱۰:۲۰',
    last: 'تمرین جلسهٔ آینده آماده شده است.',
    color: 'teal',
  },
  {
    id: 'reza',
    name: 'رضا محمدی',
    initials: 'رم',
    scope: 'Personal',
    organization: null,
    kind: 'گفت‌وگوی شخصی',
    unread: null,
    time: 'دیروز',
    last: 'ممنون، فایل رو دریافت کردم.',
    color: 'amber',
  },
  {
    id: 'channel',
    name: 'خبرهای آموزشگاه',
    initials: 'سپ',
    scope: 'Organization',
    organization: 'آموزشگاه سپهر',
    kind: 'کانال رسمی · نمونه',
    unread: null,
    time: 'دیروز',
    last: 'برنامهٔ این هفته منتشر شد.',
    color: 'violet',
  },
  {
    id: 'saved',
    name: 'پیام‌های ذخیره‌شده',
    initials: 'من',
    scope: 'Personal',
    organization: null,
    kind: 'فضای شخصی',
    unread: null,
    time: 'شنبه',
    last: 'یادداشت‌های مطالعهٔ این هفته',
    color: 'blue',
  },
];
export function filterChats(
  query: string,
  scope: 'All' | PreviewChat['scope'],
  hideOfficialContent = false,
) {
  const visible = chats.map((chat) =>
    hideOfficialContent && chat.scope === 'Organization'
      ? { ...chat, last: 'دسترسی این فضای رسمی پایان یافته است.', unread: null }
      : chat,
  );
  return visible.filter(
    (c) => (scope === 'All' || c.scope === scope) && `${c.name} ${c.last}`.includes(query.trim()),
  );
}
export type PreviewMessage = {
  id: string;
  text: string;
  own: boolean;
  time: string;
  local?: boolean;
  reply?: string;
};
export const initialMessages: PreviewMessage[] = [
  { id: 'one', text: 'سلام! برای مرور درس امروز وقت داری؟', own: false, time: '۱۰:۳۶' },
  { id: 'two', text: 'سلام سارا، حتماً. یادداشت‌ها رو آماده کردم.', own: true, time: '۱۰:۳۸' },
  {
    id: 'three',
    text: 'خیلی خوبه. بهتره از تمرین‌های جلسهٔ قبل شروع کنیم.',
    own: false,
    time: '۱۰:۴۰',
  },
  { id: 'four', text: 'عالیه، پس عصر با هم مرور می‌کنیم.', own: false, time: '۱۰:۴۲' },
];
export function canCompose(chat: PreviewChat, scenario: Scenario) {
  return (
    chat.id !== 'channel' &&
    (scenario === 'ready' || (scenario === 'revoked' && chat.scope === 'Personal'))
  );
}
