// Render the illustrated guide; screenshot sources remain unmodified.
const fs = require('node:fs'),
  path = require('node:path');
const {
  chromium,
} = require('C:/Users/OmidrezaBagheriyan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const { shots } = JSON.parse(fs.readFileSync(path.join(root, 'docs/guide-captures.json'), 'utf8'));
const data = (file, mime) =>
  `data:${mime};base64,${fs.readFileSync(path.join(root, file)).toString('base64')}`;
const fa = (v) => String(v).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const font = data(
  'node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2',
  'font/woff2',
);
const latin = data(
  'node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-latin-wght-normal.woff2',
  'font/woff2',
);
const pages = [
  [
    'login',
    'ورود به پنل مالک',
    'صفحه ورود',
    [
      'شماره همراه ۱۱رقمی حساب مالک را وارد کنید. نقش مدیر مدرسه یا معلم، مجوز ورود به این پنل نیست.',
      'کد ورود را درخواست و تأیید کنید؛ پس از بررسی نقش مالک در سرور، پنل مستقیم باز می‌شود.',
      'برای نصب برنامه روی همین دستگاه از این دکمه استفاده و راهنمای مرورگر را دنبال کنید.',
    ],
    'در این نسخه ورود مالک با کد OTP انجام می‌شود و مرحله دومرحله‌ای حذف شده است. کد ورود و اطلاعات نشست را برای دیگران نفرستید.',
  ],
  [
    'dashboard',
    'نقشه پنل؛ از اینجا شروع کنید',
    'منوی اصلی ← نمای کلی',
    [
      'بخش را از منوی سمت راست باز کنید. گزینه آبی، صفحه فعلی شماست؛ برای گزینه‌های پایین‌تر داخل منو اسکرول کنید.',
      'نام سازمان یا کاربر را با حداقل دو حرف جست‌وجو و نتیجه درست را انتخاب کنید.',
      'منوی حساب شامل «حساب و امنیت»، «راهنمای کار با پنل» و «خروج از حساب» است.',
      'برای سازمان جدید از اینجا شروع کنید؛ ابتدا بررسی کنید قبلاً ثبت نشده باشد.',
    ],
    'کارت‌ها خلاصه اطلاعات سرورند. برای پرونده‌ها، نام سازمان یا بخش مربوط را انتخاب کنید. زنگ بالای صفحه، صندوق شخصی اعلان‌ها را باز می‌کند.',
  ],
  [
    'organizations',
    'پیداکردن و بازکردن سازمان',
    'منوی اصلی ← سازمان‌ها',
    [
      'نام سازمان را بنویسید. وضعیت و ترتیب زمانی را در صورت نیاز تنظیم کنید.',
      'فیلتر را اعمال کنید. «پاک کردن» انتخاب‌ها را حذف می‌کند و فلش تازه‌سازی فهرست را دوباره می‌گیرد.',
      'نام سازمان را بزنید؛ در پرونده، اعضا، کلاس‌ها، مدیران و اشتراک‌های مجاز را بررسی کنید.',
    ],
    'جدول عریض در محدوده خودش اسکرول افقی دارد. تعداد در صفحه و صفحه بعد در پایین فهرست‌اند؛ تعداد کل با ردیف‌های همین صفحه فرق دارد.',
  ],
  [
    'provision',
    'راه‌اندازی سازمان در چهار مرحله',
    'سازمان‌ها ← راه‌اندازی سازمان',
    [
      'نام و «دلیل ایجاد» را کامل کنید. سازمان‌های مشابه را پیش از ساخت بررسی کنید.',
      'در مرحله بعد، مدیر اولیه و در صورت نیاز پلن و نسخه منتشرشده را انتخاب کنید. در «بازبینی»، خلاصه را پیش از ثبت نهایی بخوانید.',
      '× فرم را می‌بندد. رفتن به مرحله بعد به‌تنهایی به معنی ایجاد سازمان نیست.',
    ],
    'در «نتیجه»، ایجاد سازمان، اشتراک و دعوت مدیر را جدا بررسی کنید. مدیر باید دعوت را با حساب خود بپذیرد. نتیجه نامشخص را پیش از ثبت درخواست تازه پیگیری کنید.',
  ],
  [
    'users',
    'پیداکردن یک حساب کاربری',
    'منوی اصلی ← کاربران',
    [
      'شخص را جست‌وجو کنید؛ سپس وضعیت و ترتیب را تنظیم و فیلتر را اعمال کنید.',
      'نام را بزنید تا پرونده باز شود. برای نام‌های مشابه، شناسه حساب و اطلاعات مجاز را نیز تطبیق دهید.',
      'پس از تغییر یا برای تازه‌ترین وضعیت از به‌روزرسانی استفاده کنید.',
    ],
    'شماره همراه همان داده مجاز سرور است؛ اگر ستاره دارد، رقم‌ها را حدس نزنید. روی موبایل هر ردیف به کارت تبدیل می‌شود.',
  ],
  [
    'user-detail',
    'پرونده، عضویت‌ها و نشست‌های کاربر',
    'کاربران ← نام کاربر',
    [
      'اطلاعات مجاز و عضویت‌ها را مرور کنید؛ شناسه بالای پرونده به تشخیص دقیق فرد کمک می‌کند.',
      '«نشست‌ها» مربوط به دستگاه‌ها و نشست‌های همان کاربر است. سوابق و امنیت نیز تب‌های مستقل دارند.',
      'تعلیق یا اقدام حساس را پس از تطبیق حساب، خواندن اثر و نوشتن دلیل تأیید کنید.',
    ],
    'تعلیق حساب با تعلیق سازمان، پایان عضویت یا ابطال نشست فرق دارد. هدف و اثر همان اقدام را بخوانید و پس از موفقیت، وضعیت تازه را کنترل کنید.',
  ],
  [
    'roles',
    'مرور و واگذاری نقش',
    'منوی اصلی ← نقش‌ها و دسترسی‌ها',
    [
      'نقش‌ها و مجوزهای تعریف‌شده سرور را در کاتالوگ ببینید.',
      'واگذاری‌های ثبت‌شده را بررسی کنید؛ پایان یک انتساب روی دسترسی همان فرد اثر دارد.',
      'کاربر و نقش واقعی را انتخاب و دلیل بنویسید. پیش از تأیید، شخص، نقش و دلیل را دوباره تطبیق دهید.',
    ],
    'مالک‌بودن، مجوز همه اقدام‌ها نیست. نبود گزینه یا خطای دسترسی را با مسئول سامانه پیگیری کنید.',
  ],
  [
    'education',
    'مرور اطلاعات آموزشی',
    'منوی اصلی ← آموزش',
    [
      'از تب‌ها، کلاس‌ها، معلمان، ثبت‌نام‌ها، تکالیف یا آزمون‌ها را انتخاب کنید.',
      'با انتخاب سازمان، نتیجه را محدود و سپس فیلتر را اعمال کنید.',
      'نام کلاس را بزنید تا جزئیات مجاز، معلمان و ثبت‌نام‌های آن را بررسی کنید.',
    ],
    'این بخش مالک برای مرور سراسری است؛ تغییر آموزشی از فضای مجاز سازمان انجام می‌شود. فهرست خالی را با خطای سرویس یا مجوز یکی نگیرید.',
  ],
  [
    'commerce',
    'پلن، اشتراک و پیگیری ایجاد سازمان',
    'منوی اصلی ← پلن‌ها و اشتراک‌ها',
    [
      'در اشتراک‌ها، سازمان، پلن، وضعیت و تاریخ اعتبار را با هم بررسی کنید.',
      'درخواست‌های ایجاد سازمان را برای پیدا کردن وضعیت نیازمند توجه و مراحل باقی‌مانده باز کنید.',
      'نام پلن را بزنید تا قیمت، امکانات، محدودیت‌ها و نسخه‌ها را ببینید. پیش از انتشار نسخه، خلاصه را بازبینی کنید.',
    ],
    'در راه‌اندازی سازمان، نسخه منتشرشده قابل انتخاب است. وجود رکورد اشتراک به‌تنهایی به معنی معتبر بودن آن در زمان فعلی نیست.',
  ],
  [
    'finance',
    'بررسی سفارش و پرداخت',
    'منوی اصلی ← مالی',
    [
      'وضعیت سفارش را انتخاب و فیلتر را اعمال کنید.',
      'در صورت نیاز سازمان را انتخاب کنید؛ شناسه و سازمان سفارش را تطبیق دهید.',
      'شناسه سفارش، پرونده و تلاش‌های پرداخت مجاز آن را باز می‌کند.',
    ],
    'واحد مبلغ را بخوانید؛ ریال را خودکار تومان فرض نکنید. فقط اقدام موجود و مجاز را انجام دهید و نتیجه نامشخص را پیش از تکرار پیگیری کنید.',
  ],
  [
    'moderation',
    'رسیدگی به یک گزارش',
    'منوی اصلی ← رسیدگی به گزارش‌ها',
    [
      'وضعیت را انتخاب کنید تا گزارش‌های مرحله موردنظر را ببینید.',
      'در صورت نیاز، اولویت را با مقدار معتبر تنظیم و فیلتر را اعمال کنید.',
      'پرونده، گزارش و شواهد مجاز را بخوانید؛ سپس اقدام مرتبط مانند شروع بررسی، ثبت اقدام یا بستن پرونده را انجام دهید.',
    ],
    'دلیل روشن بنویسید، اثر اقدام را پیش از تأیید بخوانید و وضعیت تازه را کنترل کنید. فقط شواهد و پیوست‌های ارائه‌شده در همین پرونده را باز کنید.',
  ],
  [
    'messaging',
    'مرور اطلاعات مجاز گفتگوها',
    'منوی اصلی ← اطلاعات پیام‌رسان',
    [
      'سازمان گفتگو را در صورت نیاز انتخاب کنید.',
      'نوع، محدوده یا نمایانی را با مقدار معتبر فیلتر کنید.',
      'فیلتر را اعمال و نوع، وضعیت و تعداد اعضای گفتگو را در نتیجه بررسی کنید.',
    ],
    'این صفحه فراداده گفتگوهاست؛ ردیف گفتگو به معنی دسترسی به متن خصوصی نیست. پیگیری تخلف را از بخش رسیدگی و شواهد مجاز انجام دهید.',
  ],
  [
    'operations',
    'وضعیت سرویس و پردازش‌های سامانه',
    'منوی اصلی ← عملیات سامانه',
    [
      'در سلامت سرویس‌ها، آخرین وضعیت گزارش‌شده را بخوانید. نبود رکورد، اثبات سلامت همه سرویس‌ها نیست.',
      'اینجا آمار پردازش و ارسال اعلان سامانه است؛ صندوق شخصی شما نیست.',
      'وضعیت کارهای پس‌زمینه را ببینید و زمان آخرین دریافت موفق را کنترل کنید.',
    ],
    'برای اعلان‌های خودتان زنگ بالای صفحه را بزنید. در خطا، متن، زمان و شناسه پیگیری را برای پشتیبانی نگه دارید.',
  ],
  [
    'audit',
    'پیداکردن سابقه یک اقدام',
    'منوی اصلی ← رویدادهای مدیریتی',
    [
      'عامل، شخص انجام‌دهنده است؛ اگر مشخص است، او را انتخاب کنید.',
      'اقدام را محدود کنید. بازه زمانی را با توجه به برچسب UTC تنظیم کنید.',
      'شناسه منبع، پرونده یا موجودیت هدف است. پس از فیلتر، زمان، عامل، هدف، دلیل و نتیجه را کنار هم بخوانید.',
    ],
    'در پیام تغییر همزمان، ابتدا داده تازه را بگیرید و ورودی را تطبیق دهید. تأیید قبلی را روی پرونده تغییرکرده تکرار نکنید.',
  ],
  [
    'notifications',
    'نصب برنامه و اعلان مرورگر',
    'منوی حساب ← حساب و امنیت ← نصب و اعلان‌ها',
    [
      'این تب برای نصب و اعلان است. تب‌های کناری، مشخصات، نشست‌ها و مجوزهای حساب خودتان را دارند.',
      'نصب را بزنید. در iPhone و iPad از Safari، منوی Share و Add to Home Screen استفاده کنید.',
      'فعال‌سازی را بزنید، اجازه مرورگر را تأیید و منتظر ثبت موفق دستگاه بمانید. پیام آماده‌نبودن سرویس سرور را پیگیری کنید.',
    ],
    'موبایل نشانی HTTPS معتبر می‌خواهد؛ 127.0.0.1 روی گوشی به رایانه میزبان وصل نمی‌شود. آزمون نمایش فقط محلی است؛ تحویل Push از سرور را ثابت نمی‌کند. خروج، اعلان همین مرورگر را خاموش می‌کند.',
  ],
  [
    'inbox',
    'خواندن و پیگیری اعلان‌های خودتان',
    'زنگ بالای صفحه ← اعلان‌های من؛ پایین بخش نصب و اعلان‌ها',
    [
      'برای محدودکردن نتیجه، فقط خوانده‌نشده‌ها را فعال کنید؛ برای همه اعلان‌ها تیک را بردارید.',
      'اعلان تازه را از سرور دریافت کنید. برای صفحه‌های دیگر، «قبلی» و «بعدی» را بزنید.',
      'عنوان و متن را بخوانید و با «خواندم»، وضعیت خواندن را در سرور ثبت کنید.',
    ],
    'پیام صفحه قفل عمومی است؛ جزئیات را پس از ورود ببینید. همه عملیات مدیریتی الزاماً اعلان شخصی تولید نمی‌کنند. عدد روی زنگ، تعداد خوانده‌نشده همین حساب است.',
  ],
];
function screen(id) {
  const s = shots[id],
    c = s.crop ?? { x: 0, y: 0, width: s.width, height: s.height },
    small = s.width < 500,
    r = small ? 11 : 15,
    size = small ? 15 : 20;
  const pins = s.pins
    .map((p) => {
      const x = Math.max(c.x + r + 2, p.x - r + 3),
        y = Math.max(c.y + r + 2, p.y + 10);
      return `<g><rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="5" fill="none" stroke="#e66b24" stroke-width="${small ? 2 : 3}"/><circle cx="${x}" cy="${y}" r="${r}" fill="#154f91" stroke="white" stroke-width="2"/><text x="${x}" y="${y + size * 0.33}" text-anchor="middle" font-family="Vazir" font-size="${size}" font-weight="750" fill="white">${fa(p.n)}</text></g>`;
    })
    .join('');
  return `<div class="screen" style="width:${Math.min(990, (475 * c.width) / c.height)}px"><svg role="img" aria-label="تصویر صفحه با علامت‌های راهنما" viewBox="${c.x} ${c.y} ${c.width} ${c.height}"><image href="${data(s.file, 'image/jpeg')}" width="${s.width}" height="${s.height}"/>${pins}</svg></div>`;
}
const heading = (title, route) =>
  `<header><span>ماکان / راهنمای تصویری استفاده‌کننده</span><a href="#contents">فهرست راهنما ↑</a></header><h1>${title}</h1><p class="route"><b>شما اینجا هستید:</b> ${route}</p>`;
const toc =
  pages.map((p, i) => `<a href="#${p[0]}"><span>${p[1]}</span><b>${fa(i + 2)}</b></a>`).join('') +
  '<a href="#mobile"><span>کار با موبایل و تبلت</span><b>۱۸</b></a><a href="#help"><span>رفع مشکل و شروع امن</span><b>۱۹</b></a>';
const cover = `<section class="page cover" id="contents"><header><span>نسخه ۵ آبان ۱۴۰۵</span><span>ویژه مالک پلتفرم</span></header><div class="cover-top"><svg viewBox="300 230 660 830" role="img" aria-label="لوگوی ماکان"><image href="${data('public/brand/makan-logo.png', 'image/png')}" width="1254" height="1254"/></svg><div><p class="eyebrow">راهنمای قدم به قدم</p><h1>در پنل ماکان<br>مسیرتان را پیدا کنید</h1><p class="lead">تصویر هر صفحه، محل دکمه‌ها و توضیح قدم بعدی؛ برای استفاده روزمره از پنل مالک.</p><p>وارد شوید، بخش را از منو انتخاب کنید، پرونده درست را پیدا کنید و فقط اقدام مجاز و آگاهانه را انجام دهید.</p></div></div><h2>فهرست؛ روی نام بخش بزنید</h2><nav class="contents">${toc}</nav><p class="notice">تصاویر از همین نسخه پنل با داده‌های آموزشی تهیه شده‌اند؛ نام‌ها، شناسه‌ها و اعداد نمونه‌اند. ورود و عملیات واقعی به حساب، مجوز و پاسخ سرور وابسته‌اند. بعضی گزینه‌ها ممکن است برای حساب شما نمایش داده نشوند.</p><p class="reading">شماره‌های آبی تصویر با توضیح‌های زیر آن مطابقت دارند. برای جزئیات عکس، PDF را بزرگ‌نمایی کنید.</p></section>`;
const body = pages
  .map(
    ([id, title, route, notes, tip]) =>
      `<section class="page" id="${id}">${heading(title, route)}${screen(id)}<ol class="notes" style="--columns:${notes.length}">${notes.map((n, i) => `<li><b>${fa(i + 1)}</b><p><strong>${shots[id].pins[i].label}:</strong> ${n}</p></li>`).join('')}</ol><p class="tip">${tip}</p></section>`,
  )
  .join('');
const mobile = `<section class="page" id="mobile">${heading('کار با موبایل و تبلت', 'همان نشانی پنل ← دکمه سه‌خط بالای صفحه')}<div class="mobile-layout"><div><h2>الف. فهرست روی گوشی</h2>${screen('mobile-cards')}</div><div><h2>ب. منوی بازشده</h2>${screen('mobile-menu')}</div><div><h2>الف. روی فهرست</h2><p><b>۱.</b> سه‌خط بالای صفحه، منوی اصلی را باز می‌کند.</p><p><b>۲.</b> «نمایش فیلترهای بیشتر»، فیلترهای پنهان اندازه کوچک را باز می‌کند؛ بعد از تنظیم آن‌ها را اعمال کنید.</p><p><b>۳.</b> نام کاربر را از کارت انتخاب کنید. اطلاعات ردیف داخل کارت است.</p><h2>ب. داخل منو</h2><p><b>۱.</b> با × منو را ببندید.</p><p><b>۲.</b> بخش را انتخاب کنید؛ منو بسته و صفحه باز می‌شود. برای بخش‌های پایین‌تر، داخل منو اسکرول کنید.</p><p class="tip">در تبلت نیز منوی کشویی ممکن است دیده شود. جدول عریض و تب‌ها را در محدوده خودشان اسکرول کنید؛ کوچک‌کردن کل صفحه لازم نیست.</p></div></div></section>`;
const help = `<section class="page" id="help">${heading('وقتی به مشکل می‌خورید', 'از متن خطا شروع کنید؛ اطلاعات محرمانه را نفرستید')}<div class="help-grid"><div><h2>پیام را پیدا کنید</h2><table><thead><tr><th>مشاهده</th><th>قدم بعدی</th></tr></thead><tbody><tr><td>کد ورود دریافت نمی‌شود</td><td>شماره و اتصال را بررسی کنید؛ تا مهلت ارسال دوباره صبر کنید و سپس صریحاً درخواست دهید.</td></tr><tr><td>حساب مالک نیست / مجوز ندارید</td><td>شماره و نقش را با مسئول سامانه بررسی کنید؛ تلاش دوباره، مجوز تازه ایجاد نمی‌کند.</td></tr><tr><td>قطع ارتباط یا خطای سرویس</td><td>پس از اتصال، دریافت دوباره را بزنید. نتیجه ثبت قبلی را پیش از تکرار عملیات بررسی کنید.</td></tr><tr><td>تعارض یا تغییر همزمان</td><td>داده تازه را بگیرید، ورودی را تطبیق دهید و آگاهانه دوباره تصمیم بگیرید.</td></tr><tr><td>درخواست بیش از حد مجاز</td><td>تا زمان اعلام‌شده صبر کنید و ارسال پی‌درپی را ادامه ندهید.</td></tr><tr><td>نصب یا اعلان کار نمی‌کند</td><td>HTTPS، مرورگر به‌روز، اجازه سایت، حالت بی‌صدا و باتری را بررسی کنید. پیام آماده‌نبودن سرور را به پشتیبانی بگویید.</td></tr></tbody></table></div><div><h2>تمرین اول؛ بدون تغییر اطلاعات</h2><ol><li>«حساب و امنیت» را از منوی حساب پیدا کنید.</li><li>سازمانی را جست‌وجو و پرونده‌اش را باز کنید.</li><li>فیلتر کاربران را اعمال و سپس پاک کنید.</li><li>زنگ را بزنید و صندوق خود را پیدا کنید.</li><li>از منوی حساب «خروج از حساب» را بزنید.</li></ol><h2>پایان کار و امنیت</h2><p>بستن پنجره، خروج نیست. از منوی حساب خارج شوید. اطلاعات مدیریتی برای کار آفلاین نگه‌داری نمی‌شوند؛ نصب، نیاز به اینترنت و احراز هویت را حذف نمی‌کند.</p><h2>گزارش برای پشتیبانی</h2><p>نام صفحه، مسیر، کار انجام‌شده، زمان تقریبی، متن خطا و شناسه پیگیری را بفرستید. پیش از ارسال تصویر، نبود اطلاعات محرمانه را بررسی کنید.</p><p class="notice">کد ورود و اطلاعات نشست را نفرستید. کارهای تغییردهنده مانند نقش‌دهی و تعلیق را برای آموزش فقط روی داده مجاز تمرین کنید.</p></div></div></section>`;
const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>راهنمای تصویری کار با پنل ماکان</title><style>
@font-face{font-family:Vazir;src:url('${font}') format('woff2');font-weight:100 900;font-display:block}@font-face{font-family:Vazir;src:url('${latin}') format('woff2');font-weight:100 900;unicode-range:U+0000-00FF;font-display:block}
@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;color:#203442;font:14px/1.7 Vazir,Tahoma,sans-serif}a{color:#154f91;text-decoration:none}header{display:flex;justify-content:space-between;font-size:10px;color:#617888;border-bottom:1px solid #e1edf3;padding-bottom:5px;margin-bottom:7px}h1{font-size:24px;line-height:1.5;margin:0 0 3px;color:#142a40}h2{font-size:17px;color:#1169b8;margin:10px 0 8px}.route{font-size:12px;margin:0 0 9px;color:#527084}.page{break-after:page}.page:last-child{break-after:auto}.screen{max-width:100%;margin:0 auto;border:1px solid #d3e2ec;border-radius:9px;overflow:hidden;line-height:0;background:#f5f9fc}.screen svg{display:block;width:100%;height:auto}.notes{display:grid;grid-template-columns:repeat(var(--columns),1fr);gap:13px;list-style:none;margin:11px 0 7px;padding:0;font-size:12.5px;line-height:1.8}.notes li{display:flex;align-items:flex-start;gap:7px}.notes li>b{display:flex;align-items:center;justify-content:center;min-width:23px;height:23px;border-radius:50%;background:#154f91;color:white;font-size:13px}#dashboard .screen{width:795px!important}#dashboard .notes{grid-template-columns:repeat(2,1fr);gap:6px 16px;font-size:12px;line-height:1.65}.notes p{margin:0}.tip{font-size:11.8px;line-height:1.8;margin:7px 0 0;padding:7px 11px;border-right:3px solid #75b9e8;background:#eff8fe;border-radius:4px}.cover-top{display:grid;grid-template-columns:160px 1fr;gap:45px;align-items:center;padding:13px 20px 8px}.cover-top svg{width:145px;height:180px}.cover h1{font-size:34px;line-height:1.6}.eyebrow{color:#1169b8;margin:0;font-size:15px}.lead{font-size:17px;margin:7px 0}.cover p:not(.notice):not(.reading){margin:7px 0}.contents{display:grid;grid-template-columns:repeat(3,1fr);column-gap:22px;border-top:1px solid #d7e7f2}.contents a{display:flex;gap:8px;justify-content:space-between;padding:9px 5px;border-bottom:1px solid #e4edf3;font-size:13px}.contents a b{color:#1169b8}.notice{background:#f0f7fc;border-right:3px solid #1169b8;padding:9px 12px;font-size:12px;line-height:1.85;margin:14px 0 0}.reading{font-size:12px;color:#5f7687}.mobile-layout{display:grid;grid-template-columns:260px 260px 1fr;gap:22px}.mobile-layout h2{font-size:14px;margin:0 0 7px}.mobile-layout .screen{width:245px!important}.mobile-layout p{font-size:13px;margin:0 0 9px}.mobile-layout h2{margin-top:10px}.help-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:28px}.help-grid p,.help-grid li{font-size:14px;line-height:1.85}.help-grid ol{padding-right:24px;list-style-type:persian}table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.9}th{text-align:right;background:#edf7ff}th,td{padding:9px;border-bottom:1px solid #dfeaf2;vertical-align:top}td:first-child{width:33%}tr{break-inside:avoid}@media screen{body{width:1032px;margin:24px auto;background:#dfe7ed}.page{background:white;min-height:700px;padding:25px;margin-bottom:22px;box-sizing:content-box}}
</style></head><body>${cover}${body}${mobile}${help}</body></html>`;
async function main() {
  for (const f of ['output/pdf', 'output/documents', 'public/guides'])
    fs.mkdirSync(path.join(root, f), { recursive: true });
  fs.writeFileSync(path.join(root, 'output/documents/MakanApp_User_Handbook_FA.html'), html);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1032, height: 800 } });
    await page.emulateMedia({ media: 'print' });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const heights = await page
      .locator('.page')
      .evaluateAll((es) =>
        es.map((el) => ({ id: el.id, height: Math.ceil(el.getBoundingClientRect().height) })),
      );
    if (heights.some((p) => p.height > 701))
      throw new Error('A4 page overflow: ' + JSON.stringify(heights.filter((p) => p.height > 701)));
    await page.pdf({
      path: path.join(root, 'output/pdf/MakanApp_User_Handbook_FA.pdf'),
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate:
        '<div style="width:100%;text-align:center;color:#617888;font-size:9px;font-family:Arial"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    await page
      .locator('#dashboard')
      .screenshot({ path: path.join(root, 'docs/screenshots/handbook/guide-preview.png') });
    console.log(JSON.stringify({ pages: heights.length, heights }));
  } finally {
    await browser.close();
  }
  fs.copyFileSync(
    path.join(root, 'output/pdf/MakanApp_User_Handbook_FA.pdf'),
    path.join(root, 'public/guides/makan-owner-guide.pdf'),
  );
  console.log('Illustrated PDF and self-contained HTML updated.');
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
