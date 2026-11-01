// Illustrated user guide for the current navy / light admin UI.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const folder = 'docs/screenshots/redesign-20261030/';
const data = (file, mime) =>
  `data:${mime};base64,${fs.readFileSync(path.join(root, file)).toString('base64')}`;
const fa = (value) => String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const font = data(
  'node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2',
  'font/woff2',
);
const latin = data(
  'node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-latin-wght-normal.woff2',
  'font/woff2',
);
const pages = [
  {
    id: 'login',
    title: 'ورود با شماره همراه و کد',
    route: 'نشانی اصلی پنل / صفحه ورود',
    file: 'login-desktop.png',
    pins: [
      [202, 454, 380, 54],
      [202, 553, 380, 50],
      [202, 624, 380, 45],
    ],
    notes: [
      [
        'شماره همراه',
        'شماره حساب مالک را با ۱۱ رقم و شروع 09 بنویسید؛ مانند 09120000105. ارقام فارسی نیز پذیرفته می‌شوند.',
      ],
      [
        'دریافت و تأیید کد',
        '«دریافت کد ورود» را بزنید؛ در مرحله بعد کد دقیقاً ۶ رقمی را وارد و «تأیید و ورود» را انتخاب کنید.',
      ],
      [
        'نصب پنل',
        'در صورت پشتیبانی مرورگر، پنل را روی همین دستگاه نصب کنید. نصب جای ورود به حساب را نمی‌گیرد.',
      ],
    ],
    tip: 'فقط حساب دارای نقش مالک پلتفرم و مجوز ورود می‌تواند وارد شود. اگر رد شدید، شماره و دسترسی را با مسئول سامانه بررسی کنید. کد ورود را برای دیگران نفرستید.',
  },
  {
    id: 'dashboard',
    title: 'نقشه پنل؛ از اینجا شروع کنید',
    route: 'منوی سمت راست / نمای کلی',
    file: 'dashboard-desktop.png',
    pins: [
      [1188, 150, 220, 738],
      [304, 16, 222, 44],
      [32, 112, 145, 44],
      [32, 367, 1108, 167],
    ],
    notes: [
      [
        'منوی اصلی',
        'گروه‌های مدیریت، تجاری، نظارت و حساب، بخش‌ها را جدا می‌کنند. زمینه آبی محل فعلی شما را نشان می‌دهد.',
      ],
      [
        'جست‌وجوی سریع',
        'نام سازمان یا کاربر را پیدا و نتیجه درست را انتخاب کنید. میانبر رایانه Ctrl+K است.',
      ],
      [
        'شروع کار جدید',
        'برای سازمان تازه «راه‌اندازی سازمان» را بزنید. برای حساب یا سازمان موجود، ابتدا جست‌وجو کنید.',
      ],
      [
        'آمار و پیگیری',
        'کارت‌ها به فهرست همان بخش می‌روند. پایین صفحه سازمان‌ها، درخواست‌های نیازمند پیگیری و وضعیت سرویس‌ها قرار دارند.',
      ],
    ],
    tip: 'اعداد تصویر نمونه‌اند. آمار حساب شما از سرور دریافت می‌شود. خطا، در حال دریافت و فهرست خالی سه وضعیت متفاوت‌اند؛ زمان آخرین دریافت موفق را هم بخوانید.',
  },
  {
    id: 'organizations',
    title: 'پیداکردن و بازکردن سازمان',
    route: 'مدیریت / سازمان‌ها',
    file: 'organizations-desktop.png',
    pins: [
      [289, 302, 829, 46],
      [941, 415, 179, 65],
    ],
    notes: [
      [
        'جست‌وجو و فیلتر',
        'نام یا وضعیت را تنظیم و «اعمال فیلتر» را بزنید. گزینه‌های دیگر در «فیلترها» هستند. «پاک کردن» فیلترهای اعمال‌شده را حذف می‌کند.',
      ],
      [
        'پرونده سازمان',
        'نام سازمان را بزنید تا اطلاعات، اعضا، مدیران و اشتراک‌های مجاز آن را ببینید. برای نام‌های مشابه، شناسه را هم تطبیق دهید.',
      ],
      [
        'صفحه‌بندی',
        'تعداد کل، همه ردیف‌های همین صفحه نیست. از کنترل‌های پایین فهرست برای صفحه بعد و تعداد در صفحه استفاده کنید.',
      ],
    ],
    tip: 'جدول‌های عریض داخل محدوده خودشان پیمایش می‌شوند. برای داده تازه، دکمه به‌روزرسانی فهرست را بزنید. جست‌وجو و صفحه جاری در نشانی صفحه نگه‌داری می‌شوند.',
  },
  {
    id: 'users',
    title: 'کاربر را پیدا و پرونده درست را باز کنید',
    route: 'مدیریت / کاربران',
    file: 'users-desktop.png',
    pins: [
      [289, 302, 829, 46],
      [947, 415, 173, 78],
    ],
    notes: [
      [
        'پیداکردن حساب',
        'از جست‌وجو و فیلتر وضعیت استفاده کنید. نام کاربر، پرونده او را باز می‌کند. اطلاعات مجاز حساب را قبل از هر اقدام تطبیق دهید.',
      ],
      [
        'جزئیات و پیگیری',
        'در پرونده، مشخصات، عضویت‌ها، نشست‌ها و بخش‌های مجاز را مرور کنید. شناسه‌ها در «شناسه‌ها و اطلاعات پیگیری» باز می‌شوند.',
      ],
      [
        'اقدام حساس',
        'تعلیق، ابطال نشست و پایان عضویت اثر متفاوتی دارند. هدف، اثر و دلیل همان اقدام را بخوانید و سپس تأیید کنید.',
      ],
    ],
    tip: 'شماره همراه همان داده مجاز سرور است؛ اگر ستاره دارد، رقم‌ها را حدس نزنید. برای پشتیبانی می‌توانید شناسه مجاز حساب را از بخش پیگیری کپی کنید.',
  },
  {
    id: 'setup',
    title: 'راه‌اندازی سازمان، مرحله به مرحله',
    route: 'سازمان‌ها / راه‌اندازی سازمان',
    file: 'setup-mobile.png',
    mobile: true,
    pins: [
      [34, 235, 308, 45],
      [34, 351, 308, 45],
      [34, 771, 148, 45],
    ],
    notes: [
      [
        'انتخاب مدیر',
        'ابتدا نام سازمان و دلیل ایجاد را بنویسید. در مرحله بعد، مدیر اولیه را با نام حساب موجود انتخاب کنید. مدیر باید دعوت را با حساب خودش بپذیرد.',
      ],
      [
        'پلن و زمان‌ها',
        'در صورت نیاز پلن و نسخه منتشرشده را انتخاب کنید. ورودی تاریخ و ساعت به وقت دستگاه شماست. خالی‌گذاشتن فیلد اختیاری با مقدار صفر فرق دارد.',
      ],
      [
        'بازبینی و نتیجه',
        '«ادامه» شما را به خلاصه می‌برد و به‌تنهایی سازمان نمی‌سازد. نام، مدیر و پلن را بخوانید؛ سپس ثبت نهایی و نتیجه مراحل را بررسی کنید.',
      ],
    ],
    tip: 'قطع ارتباط پس از ثبت، اثبات ثبت‌نشدن نیست. نتیجه همان درخواست را پیگیری کنید؛ سازمان تازه و تکراری نسازید. درخواست‌های نیازمند توجه از داشبورد یا بخش تجاری قابل پیگیری‌اند.',
  },
  {
    id: 'commerce',
    title: 'پلن‌ها، اشتراک‌ها و قراردادها',
    route: 'تجاری / پلن‌ها و اشتراک‌ها',
    file: 'commerce-desktop.png',
    pins: [
      [685, 200, 454, 50],
      [32, 375, 1108, 82],
      [32, 457, 1108, 175],
    ],
    notes: [
      [
        'تب مرتبط',
        '«پلن‌ها» کاتالوگ، «اشتراک‌ها» وضعیت اشتراک و «قراردادها و سهمیه‌ها» اطلاعات تجاری مجاز را نشان می‌دهد. پیگیری ایجاد سازمان نیز تب جدا دارد.',
      ],
      [
        'پیداکردن مورد',
        'جست‌وجو یا فیلتر را اعمال کنید و نام پلن را برای پرونده و نسخه‌های آن بزنید. گزینه‌های حساب شما به مجوزهایش وابسته‌اند.',
      ],
      [
        'ثبت یا انتشار',
        'مخاطب، مبلغ و واحد آن، سهمیه‌ها و نسخه را پیش از تأیید بخوانید. برای انتشار نسخه، نتیجه اعتبارسنجی را بررسی کنید.',
      ],
    ],
    tip: 'مقدار نامشخص سهمیه به معنی صفر یا نامحدود نیست. در تعارض نسخه، داده تازه را بگیرید و ورودی خود را تطبیق دهید. خطای دسترسی را با تکرار ثبت حل نکنید.',
  },
  {
    id: 'roles',
    title: 'نقش‌ها و دسترسی‌ها را آگاهانه تغییر دهید',
    route: 'نظارت و کنترل / نقش‌ها و دسترسی‌ها',
    file: 'roles-desktop.png',
    pins: [[32, 275, 1108, 320]],
    notes: [
      [
        'مرور نقش‌ها',
        'نقش‌ها و مجوزهای تعریف‌شده سرور را در کاتالوگ ببینید. نقش مدرسه با نقش پلتفرم یکسان نیست.',
      ],
      [
        'واگذاری نقش',
        'در تب مربوط، کاربر و نقش واقعی را انتخاب کنید. نام‌های مشابه را با شناسه تطبیق دهید و دلیل روشن بنویسید.',
      ],
      [
        'بررسی نتیجه',
        'پیش از تأیید، فرد، نقش، مدت و دلیل را دوباره بخوانید. پس از موفقیت، واگذاری تازه را در فهرست بررسی کنید.',
      ],
    ],
    tip: 'مالک‌بودن به‌تنهایی مجوز همه عملیات نیست. پایان یک واگذاری می‌تواند دسترسی همان فرد را تغییر دهد؛ آن را فقط روی حساب درست انجام دهید.',
  },
  {
    id: 'operations',
    title: 'سلامت و پیگیری سامانه',
    route: 'نظارت و کنترل / عملیات سامانه',
    file: 'operations-desktop.png',
    pins: [
      [852, 200, 288, 50],
      [32, 275, 1108, 650],
    ],
    notes: [
      [
        'بخش موردنظر',
        'تب سلامت سرویس‌ها، اعلان‌ها و پردازش‌ها را جدا می‌کند. این اعلان‌ها مربوط به عملیات سامانه‌اند.',
      ],
      [
        'خواندن وضعیت',
        'زمان مشاهده، وابستگی‌ها، وضعیت پردازش و خطاهای گزارش‌شده را کنار هم بخوانید. نبود رکورد، اثبات سلامت همه سرویس‌ها نیست.',
      ],
      [
        'رویداد مدیریتی',
        'برای سابقه یک اقدام، از منو «رویدادهای مدیریتی» را باز و عامل، هدف و بازه زمان را فیلتر کنید. ساعت انتخابی به وقت دستگاه است.',
      ],
    ],
    tip: 'برای اعلان‌های شخصی خودتان، زنگ بالای صفحه را بزنید. در خطا، نام صفحه، زمان و شناسه پیگیری را برای پشتیبانی نگه دارید.',
  },
  {
    id: 'account',
    title: 'حساب، نصب و اعلان‌های شخصی',
    route: 'حساب من / حساب و امنیت',
    file: 'account-desktop.png',
    pins: [
      [1038, 200, 97, 50],
      [794, 200, 141, 50],
      [32, 16, 140, 44],
    ],
    notes: [
      [
        'اطلاعات خودتان',
        'از تب‌های این بخش مشخصات حساب، نشست‌ها و مجوزهای واقعی را ببینید. نشست‌های خودتان با نشست‌های کاربر داخل پرونده او فرق دارند.',
      ],
      [
        'نصب و اعلان‌ها',
        'این تب را برای نصب پنل و فعال‌سازی اعلان مرورگر باز کنید. اجازه مرورگر فقط پس از انتخاب شما درخواست می‌شود.',
      ],
      [
        'خواندن و خروج',
        'زنگ، صندوق اعلان‌های شما را باز می‌کند؛ «خواندم» وضعیت را ثبت می‌کند. در پایان از منوی حساب «خروج از حساب» را بزنید.',
      ],
    ],
    tip: 'روی موبایل، نصب و Push به HTTPS معتبر و مرورگر پشتیبان نیاز دارند. پیام آماده‌نبودن سرویس Push را به مسئول سامانه بگویید. آزمون محلی نمایش، ارسال واقعی از سرور را ثابت نمی‌کند.',
  },
];

function screen(file, pins = [], mobile = false) {
  const width = mobile ? 390 : 1440,
    height = mobile ? 844 : 1000;
  const marks = pins
    .map(
      ([x, y, w, h], i) =>
        `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="#e87928" stroke-width="${mobile ? 2 : 3}"/><circle cx="${x + 18}" cy="${y + 14}" r="${mobile ? 13 : 22}" fill="#1765dc" stroke="white" stroke-width="2"/><text x="${x + 18}" y="${y + (mobile ? 18 : 22)}" text-anchor="middle" fill="white" font-family="Vazir" font-size="${mobile ? 15 : 24}" font-weight="700">${fa(i + 1)}</text></g>`,
    )
    .join('');
  return `<div class="screen ${mobile ? 'phone' : ''}"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="تصویر پنل با شماره‌های راهنما"><image href="${data(folder + file, 'image/png')}" width="${width}" height="${height}"/>${marks}</svg></div>`;
}
const heading = (title, route) =>
  `<header><span>ماکان / راهنمای تصویری استفاده‌کننده</span><a href="#contents">فهرست راهنما</a></header><h1>${title}</h1><p class="route">شما اینجا هستید: ${route}</p>`;
const toc =
  pages
    .map((p, i) => `<a href="#${p.id}"><span>${p.title}</span><b>${fa(i + 2)}</b></a>`)
    .join('') +
  `<a href="#mobile"><span>کار با موبایل و تبلت</span><b>۱۱</b></a><a href="#help"><span>مسیر بخش‌ها و رفع مشکل</span><b>۱۲</b></a>`;
const cover = `<section class="page cover" id="contents"><header><span>نسخه ۸ آبان ۱۴۰۵ / طراحی تازه</span><span>ویژه مالک پلتفرم</span></header><div class="cover-row"><div class="logo"><svg viewBox="300 230 660 830"><image href="${data('public/brand/makan-logo.png', 'image/png')}" width="1254" height="1254"/></svg></div><div><p class="eyebrow">راهنمای تصویری کار با پنل</p><h1>ماکان، قدم به قدم</h1><p class="lead">بدانید کجا هستید، گزینه درست را پیدا کنید<br>و پیش از ثبت، نتیجه کارتان را مرور کنید.</p></div></div><h2>فهرست قابل کلیک</h2><nav class="contents">${toc}</nav><p class="notice">تصاویر از همین پنل با داده‌های آزمون مستقل تهیه شده‌اند. نام‌ها، شناسه‌ها و اعداد نمونه‌اند. در حساب واقعی، داده و گزینه‌ها به دسترسی شما و پاسخ سرور وابسته‌اند.</p><p class="small">شماره‌های آبی تصویر با توضیح کنار آن مطابقت دارند. برای خواندن ریزنوشته‌های پنل، تصویر PDF را بزرگ‌نمایی کنید. نشانی ورود را از مسئول استقرار بگیرید؛ آدرس محلی رایانه میزبان روی گوشی شما به همان رایانه اشاره نمی‌کند.</p></section>`;
const body = pages
  .map(
    (p) =>
      `<section class="page" id="${p.id}">${heading(p.title, p.route)}<div class="spread ${p.mobile ? 'mobile-spread' : ''}">${screen(p.file, p.pins, p.mobile)}<aside>${p.notes.map(([title, text], i) => `<article><b class="num">${p.pins[i] ? fa(i + 1) : '•'}</b><div><h2>${title}</h2><p>${text}</p></div></article>`).join('')}</aside></div><p class="tip">${p.tip}</p></section>`,
  )
  .join('');
const mobile = `<section class="page" id="mobile">${heading('کار با موبایل و تبلت', 'همان پنل / منوی بالا و نوار پایین')}<div class="mobile-grid">${screen(
  'dashboard-mobile.png',
  [
    [312, 10, 46, 46],
    [16, 784, 343, 57],
  ],
  true,
)}${screen('users-mobile.png', [], true)}<aside><h2>۱. منوی اصلی</h2><p>دکمه سه‌خط بالای صفحه یا «بیشتر» در نوار پایین، منوی مدیریت را باز می‌کند. بخش را انتخاب کنید؛ منو بسته و صفحه مربوط باز می‌شود.</p><h2>۲. نوار پایین</h2><p>خانه، سازمان‌ها و کاربران دسترسی سریع دارند. گزینه آبی، بخش فعلی را نشان می‌دهد. در تبلت نیز بسته به عرض، منوی کشویی دیده می‌شود.</p><h2>۳. کارت‌های فهرست</h2><p>هر ردیف به یک کارت تبدیل می‌شود. عنوان و اطلاعات اصلی مستقیم دیده می‌شوند. «اطلاعات بیشتر» را برای بقیه داده‌ها و اقدام‌های همان ردیف باز کنید.</p><h2>فیلتر و فرم</h2><p>فیلترهای تکمیلی در «فیلترها» قرار دارند. تاریخ و ساعت را به وقت دستگاه انتخاب کنید. برای کار با پنل کوچک‌کردن کل صفحه لازم نیست.</p></aside></div><p class="tip">این نسخه برای انجام عملیات و دیدن داده به اینترنت نیاز دارد. هنگام قطع ارتباط، نتیجه آخرین ثبت را پیش از تلاش دوباره بررسی کنید.</p></section>`;
const help = `<section class="page" id="help">${heading('مسیر بخش‌ها و رفع مشکل', 'نام بخش در منو / عنوان صفحه')}<div class="help-grid"><div><h2>برای هر کار به کجا بروید؟</h2><table><tr><th>کار</th><th>مسیر</th></tr><tr><td>اعضا و وضعیت سازمان</td><td>سازمان‌ها / نام سازمان</td></tr><tr><td>عضویت و نشست یک کاربر</td><td>کاربران / نام کاربر</td></tr><tr><td>اطلاعات آموزشی سراسری</td><td>آموزش / کلاس‌ها، معلمان، ثبت‌نام‌ها، تکالیف یا آزمون‌ها</td></tr><tr><td>سفارش و تلاش پرداخت</td><td>مالی / سفارش موردنظر</td></tr><tr><td>بررسی گزارش یا تخلف</td><td>رسیدگی به گزارش‌ها / پرونده</td></tr><tr><td>فراداده گفتگو</td><td>اطلاعات پیام‌رسان؛ دسترسی به متن خصوصی ایجاد نمی‌کند</td></tr><tr><td>سابقه یک اقدام</td><td>رویدادهای مدیریتی / فیلتر عامل، هدف و زمان</td></tr></table><h2>تمرین اول، بدون تغییر داده</h2><p>یک سازمان را جست‌وجو کنید، پرونده آن را ببینید، فیلتر کاربران را اعمال و پاک کنید، زنگ اعلان‌ها را پیدا کنید و در پایان از حساب خارج شوید.</p></div><div><h2>پیام را پیدا کنید؛ قدم بعدی را انجام دهید</h2><table><tr><th>مشاهده</th><th>قدم بعدی</th></tr><tr><td>کد ورود نمی‌رسد</td><td>شماره ۱۱ رقمی با شروع 09 و اتصال را بررسی کنید؛ تا مهلت ارسال دوباره صبر کنید.</td></tr><tr><td>کد نامعتبر است</td><td>کد دقیقاً ۶ رقمی، شماره مقصد و زمان اعتبار را بررسی کنید.</td></tr><tr><td>مجوز ندارید</td><td>شماره، نقش مالک و مجوز همان عملیات را با مسئول سامانه بررسی کنید.</td></tr><tr><td>قطع ارتباط یا خطای سرویس</td><td>پس از اتصال، دریافت دوباره را بزنید؛ نتیجه ثبت قبلی را پیش از تکرار پیگیری کنید.</td></tr><tr><td>تعارض نسخه</td><td>داده تازه را بگیرید، ورودی را تطبیق دهید و دوباره تصمیم بگیرید.</td></tr><tr><td>درخواست بیش از حد</td><td>تا زمان اعلام‌شده صبر کنید؛ ارسال پی‌درپی را ادامه ندهید.</td></tr></table><p class="notice">برای پشتیبانی نام صفحه، زمان، کار انجام‌شده، متن خطا و شناسه پیگیری را بفرستید. کد ورود، اطلاعات نشست و تصویر دارای اطلاعات محرمانه را نفرستید.</p></div></div></section>`;

const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>راهنمای تصویری استفاده از پنل ماکان</title><style>
@font-face{font-family:Vazir;src:url('${font}');font-weight:100 900}@font-face{font-family:Vazir;src:url('${latin}');font-weight:100 900;unicode-range:U+0000-00FF}
@page{size:A4 landscape;margin:12mm 12mm 15mm}*{box-sizing:border-box}body{margin:0;color:#1b2a41;font:14px/1.85 Vazir,Tahoma,sans-serif}a{color:#1765dc;text-decoration:none}header{display:flex;justify-content:space-between;border-bottom:1px solid #e2e7ef;font-size:10px;color:#627189;padding-bottom:5px;margin-bottom:7px}h1{font-size:26px;line-height:1.5;margin:0 0 3px;color:#11213a}h2{font-size:15px;color:#1765dc;margin:0 0 5px}p{margin:0}.route{font-size:12px;color:#627189;margin-bottom:10px}.page{break-after:page;min-height:650px}.page:last-child{break-after:auto}.spread{display:grid;grid-template-columns:minmax(0,3fr) minmax(220px,1fr);gap:21px;direction:ltr;align-items:start}.spread>aside{direction:rtl}.screen{border:1px solid #d4dfed;border-radius:8px;overflow:hidden;line-height:0;background:#f4f6fa}.screen svg{display:block;width:100%;height:auto}.phone{width:240px;margin:auto}.mobile-spread{grid-template-columns:320px 1fr;gap:45px;justify-content:center;padding:0 60px}.mobile-spread .phone{width:236px}aside article{display:flex;gap:8px;margin-bottom:16px}aside article p{font-size:13px;line-height:1.9}.num{display:grid;place-items:center;min-width:25px;height:25px;border-radius:50%;background:#1765dc;color:white;font-size:13px;margin-top:2px}.tip{background:#edf4ff;border-right:3px solid #1765dc;padding:8px 12px;font-size:12px;line-height:1.9;margin-top:13px;border-radius:5px}.cover-row{display:flex;align-items:center;gap:42px;padding:20px 34px 22px}.logo svg{width:140px;height:175px}.cover h1{font-size:40px;margin:0 0 10px}.lead{font-size:20px;line-height:1.9}.eyebrow{color:#1765dc;font-size:14px}.contents{display:grid;grid-template-columns:1fr 1fr;gap:0 35px;border-top:1px solid #e2e7ef}.contents a{display:flex;justify-content:space-between;padding:8px 3px;border-bottom:1px solid #e2e7ef;font-size:13px}.cover>h2{margin:4px 0 9px}.notice{background:#f4f6fa;border-right:3px solid #1765dc;padding:10px 13px;font-size:12px;margin:13px 0 8px}.small{font-size:11px;color:#627189;line-height:1.9}.mobile-grid{display:grid;grid-template-columns:240px 240px 1fr;gap:24px;direction:ltr}.mobile-grid>aside{direction:rtl}.mobile-grid p{font-size:13px;margin-bottom:12px}.mobile-grid h2{margin:0 0 4px}.help-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}.help-grid h2{margin:0 0 8px}.help-grid p{font-size:13px;margin-top:10px}table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.9;margin-bottom:18px}th,td{text-align:right;padding:8px 9px;border-bottom:1px solid #e2e7ef;vertical-align:top}th{background:#edf4ff;color:#11213a}td:first-child{width:30%}tr{break-inside:avoid}bdi{direction:ltr}@media screen{body{width:1032px;margin:24px auto;background:#dfe7ef}.page{padding:28px;background:white;margin-bottom:24px}}
</style></head><body>${cover}${body}${mobile}${help}</body></html>`;

async function main() {
  for (const dir of ['maintenance/generated/pdfs', 'maintenance/generated/pdf', 'public/guides'])
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1032, height: 750 } });
    await page.emulateMedia({ media: 'print' });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const heights = await page
      .locator('.page')
      .evaluateAll((es) =>
        es.map((el) => ({ id: el.id, height: Math.ceil(el.getBoundingClientRect().height) })),
      );
    if (heights.some((p) => p.height > 687))
      throw new Error('Page overflow: ' + JSON.stringify(heights.filter((p) => p.height > 687)));
    fs.writeFileSync(path.join(root, 'maintenance/generated/pdfs/redesign-guide.html'), html);
    await page.pdf({
      path: path.join(root, 'maintenance/generated/pdf/MakanApp_Visual_User_Guide_FA.pdf'),
      format: 'A4',
      landscape: true,
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate:
        '<div style="width:100%;text-align:center;font:9px Arial;color:#627189">Makan | <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    console.log(JSON.stringify({ pages: heights.length, heights }));
  } finally {
    await browser.close();
  }
  fs.copyFileSync(
    path.join(root, 'maintenance/generated/pdf/MakanApp_Visual_User_Guide_FA.pdf'),
    path.join(root, 'public/guides/makan-owner-guide.pdf'),
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
