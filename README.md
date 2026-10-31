# پنل مدیریت ماکان

پنل فارسی و راست‌چین مدیریت پلتفرم؛ ورود فقط با نقش واقعی `PlatformOwner` و مجوز `platform.access` در بک‌اند. شماره‌ای در کد مجاز نشده است. هر عملیات نیز مجوز مستقل خودش را لازم دارد.

## اجرای سریع روی همین ویندوز

Docker Desktop را با Linux containers روشن کنید. در PowerShell وارد پوشه پروژه شوید:

```powershell
cd 'C:\Users\OmidrezaBagheriyan\Desktop\MakanManagement'
docker compose --env-file .env.docker up -d --wait --wait-timeout 240
```

سپس [صفحه ورود](http://127.0.0.1:3000/login) را باز کنید. این دستور نسخه ساخته‌شده را اجرا می‌کند؛ در اجرای روزمره ساخت دوباره لازم نیست. فایل خصوصی `.env.docker` در نصب موجود را بازنویسی نکنید.

بعد از تغییر کد، نصب اولیه یا دریافت نسخه جدید، ساخت و اجرا را با این دستور انجام دهید:

```powershell
docker compose --env-file .env.docker up -d --build --force-recreate --wait --wait-timeout 240
```

ساخت نخست و به‌روزرسانی ممکن است چند دقیقه طول بکشد. دانلود وابستگی‌ها و ساخت داخل Docker به سرعت شبکه و منابع Docker Desktop وابسته‌اند. تا نمایش `Healthy` صبر کنید؛ `--wait-timeout` زمان انتظار سلامت کانتینر است، نه سقف زمان ساخت. این حداکثر مهلت است؛ به‌محض آماده‌بودن سرویس، فرمان زودتر تمام می‌شود.

## آماده‌سازی روی رایانه تازه

پیش‌نیاز Docker: Docker Desktop، WSL2 و Linux containers. برای اجرای Docker نیازی به نصب Node.js روی میزبان یا دیتابیس محلی نیست. بک‌اند فعلی روی `http://94.184.32.84:8090` اجرا می‌شود.

فقط اگر `.env.docker` وجود ندارد، نمونه و کلید تصادفی خصوصی را بسازید:

```powershell
if (-not (Test-Path -LiteralPath '.env.docker')) {
    Copy-Item -LiteralPath '.env.docker.example' -Destination '.env.docker'
    $panelKeyBytes = New-Object byte[] 32
    $panelRandom = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $panelRandom.GetBytes($panelKeyBytes) } finally { $panelRandom.Dispose() }
    $panelSecret = ([BitConverter]::ToString($panelKeyBytes)).Replace('-', '').ToLowerInvariant()
    $panelEnvPath = (Resolve-Path -LiteralPath '.env.docker').Path
    $panelSettings = [IO.File]::ReadAllText($panelEnvPath)
    $panelSettings = $panelSettings -replace '(?m)^SESSION_SECRET=.*$', "SESSION_SECRET=$panelSecret"
    [IO.File]::WriteAllText($panelEnvPath, $panelSettings, (New-Object Text.UTF8Encoding($false)))
}
```

مقادیر زیر را در فایل تنظیمات بررسی کنید. کلید تولیدشده را در `SESSION_SECRET` نگه دارید؛ آن را در گزارش یا مخزن منتشر نکنید.

| تنظیم                                  | مقدار برای اجرای فعلی                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `MAKAN_PORT`                           | `3000`                                                                                    |
| `APP_ORIGIN`                           | `http://127.0.0.1:3000`                                                                   |
| `BACKEND_BASE_URL`                     | `http://94.184.32.84:8090`                                                                |
| `COOKIE_SECURE`                        | `false` برای HTTP محلی                                                                    |
| `PLATFORM_OWNER_ROLE_KEYS`             | `'["PlatformOwner"]'`                                                                     |
| `ALLOW_UNCONFIGURED_OWNER_OTP_TESTING` | `false`                                                                                   |
| `PERMISSION_BINDINGS`                  | `'{}'`؛ نگاشت مستند داخل پروژه استفاده می‌شود؛ فقط تغییرات تأییدشده محیط را اینجا بنویسید |

سپس دستور ساخت و اجرا را بزنید. فایل `.env.docker.example` نمونه است و به‌تنهایی تنظیمات فعال برنامه نیست.

## ورود

شماره همراه باید **۱۱ رقم و با شروع `09`** باشد؛ مثل `09120000105`. کد ورود باید **دقیقاً ۶ رقم** باشد. ارقام فارسی و عربی نیز پذیرفته و به رقم لاتین تبدیل می‌شوند. فرمت بین‌المللی `+98` در فرم ورود پذیرفته نمی‌شود. کد را از روش اعلام‌شده توسط سرویس همان محیط دریافت کنید؛ کد ورود در فرانت‌اند ثابت نشده است.

بعد از تأیید کد، هویت مالک از `/api/admin/v1/me` بررسی می‌شود. نقش Manager یا سایر نقش‌های مدرسه مجوز ورود به این پنل نیست. افزودن مالک جدید باید در بک‌اند انجام شود.

## دستورهای روزمره Docker

```powershell
# وضعیت و سلامت
docker compose --env-file .env.docker ps
# لاگ؛ Ctrl+C فقط نمایش لاگ را می‌بندد
docker compose --env-file .env.docker logs -f --tail 100 web
# توقف با حفظ نشست‌ها
docker compose --env-file .env.docker down
# اجرای دوباره نسخه موجود
docker compose --env-file .env.docker up -d --wait --wait-timeout 240
# اعمال تغییر تنظیمات بدون ساخت دوباره کد
docker compose --env-file .env.docker up -d --force-recreate --wait --wait-timeout 240
```

برای تغییر پورت، `MAKAN_PORT` و پورت `APP_ORIGIN` را با هم در `.env.docker` تغییر دهید، سپس کانتینر را با `--force-recreate` بالا بیاورید. برای مثال هر دو را روی 3010 تنظیم کنید و `http://127.0.0.1:3010/login` را باز کنید. `restart` فایل env جدید را نمی‌خواند.

## اجرا بدون Docker

Node.js نسخه ۲۲ یا جدیدتر و npm لازم است. فقط در نصب تازه، `.env.example` را در `.env.local` کپی کنید و `SESSION_SECRET` را با کلید تصادفی ۶۴ کاراکتر hex پر کنید. برای تولید کلید روی رایانه خودتان:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm ci
npm run dev
```

`APP_ORIGIN` باید با نشانی اجرا یکسان باشد. پورت پیش‌فرض اجرای محلی 3000 است؛ Docker و اجرای محلی را هم‌زمان روی این پورت اجرا نکنید. برای توسعه روی پورت جدا، `APP_ORIGIN` در `.env.local` را به `http://127.0.0.1:3100` تغییر دهید و اجرا کنید:

```powershell
npm run dev -- --port 3100
```

برای استفاده روزمره از نسخه production محلی، پس از نصب وابستگی‌ها و تنظیم env:

```powershell
npm run build
npm start
```

پس از تغییر کد، build را دوباره انجام دهید. حالت `dev` برای توسعه است و معیار سرعت نسخه نهایی نیست.

## رفع مشکل

| مشکل                            | بررسی و اقدام                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Docker در دسترس نیست            | Docker Desktop و Linux containers را روشن و `docker info` را بررسی کنید                                                       |
| پورت اشغال است                  | اجرای قبلی را متوقف کنید یا پورت و `APP_ORIGIN` را با هم تغییر دهید                                                           |
| کانتینر unhealthy است           | لاگ‌ها، کلید ۶۴ کاراکتری، JSON نقش‌ها و نشانی‌ها را بررسی کنید                                                                |
| نشانی ورود یکسان نیست           | از نشانی دقیق `APP_ORIGIN` استفاده کنید؛ پس از تغییر تنظیمات، کانتینر را دوباره ایجاد کنید                                    |
| دریافت کد ناموفق است            | شماره و دسترسی رایانه/کانتینر به بک‌اند را بررسی کنید؛ متن خطا و شناسه پیگیری را نگه دارید                                    |
| ورود یا عملیات با 403 رد می‌شود | نقش، `platform.access` و مجوز همان عملیات را در بک‌اند بررسی کنید                                                             |
| صفحه کند است                    | نسخه production را اجرا کنید؛ صفحه بخش‌ها هنگام نیاز بارگیری می‌شوند. زمان دریافت داده به سرور و شبکه نیز وابسته است          |
| روی گوشی باز نمی‌شود            | `127.0.0.1` روی گوشی، خود گوشی است. انتشار شبکه‌ای نیاز به تنظیم نشانی، پورت و HTTPS دارد                                     |
| نصب یا اعلان فعال نیست          | HTTPS معتبر، پشتیبانی مرورگر، اجازه سایت و آماده‌بودن سرویس Push بک‌اند را بررسی کنید؛ localhost فقط روی همان رایانه استثناست |

نشست‌ها در volume پایدار Docker هستند؛ دستورهای بالا آن را حذف نمی‌کنند. عوض‌کردن `SESSION_SECRET` نشست‌های قبلی را بی‌اعتبار می‌کند. این تنظیم برای یک نمونه سرور و دسترسی محلی است؛ در انتشار عمومی HTTPS و `COOKIE_SECURE=true` لازم‌اند.

## بررسی و مستندات

```powershell
npm run typecheck
npm test
$env:MAKAN_TEST_PORT='3110'
npx playwright test tests/e2e/login-format.spec.ts tests/e2e/otp-performance.spec.ts tests/e2e/redesign.spec.ts
# بررسی کانتینر روشن؛ Chrome و وابستگی‌های توسعه لازم‌اند
npx playwright test --config playwright.docker.config.ts
```

- [راهنمای تصویری قابل ارسال (PDF)](output/pdf/MakanApp_Visual_User_Guide_FA.pdf)
- [راهنمای تصویری و گزارش طراحی جدید](docs/ui-redesign-20261030.md)
- [تطبیق بک‌اند 42c51a3](docs/admin-integration-42c51a3.md)
- [گزارش بررسی بارگذاری و PDF](docs/performance-and-guide-20261031.json)
- [جزئیات Docker](docs/docker.md)
- [ماتریس API](docs/api-matrix.md)

دامنه این پروژه فقط پنل مالک است؛ نسخه نمایشی بدون حساب، لندینگ و فضای مدرسه مسیر فعال ندارند. اطلاعات خصوصی و صفحات حساب در Service Worker ذخیره نمی‌شوند. ظاهر قبلی و سوابق کلاینت در `archive` از build و Docker جدا هستند. پروژه مستقل MakanWebsite تغییری نکرده است.
