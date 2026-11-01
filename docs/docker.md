# اجرای پنل ماکان با Docker

Docker Desktop با Linux containers و WSL2 لازم است. برنامه فقط فرانت‌اند و واسط API را اجرا می‌کند؛ بک‌اند روی `http://94.184.32.84` است و دیتابیس محلی لازم نیست. فایل‌های `.cmd` و راه‌انداز PowerShell حذف شده‌اند. همه دستورها را در پوشه پروژه اجرا کنید.

## اجرای نصب موجود

پروژه و ایمیج این پنل `makan-management-panel` و `makan-management-panel:local`، پورت میزبان `3101` و volume نشست آن `makan-management-panel_management_sessions` است. برای انتقال از نام قدیمی، مقادیر `MAKAN_PORT=3101` و `APP_ORIGIN=http://127.0.0.1:3101` را در env محلی تنظیم و نخستین بار با `--build` اجرا کنید؛ ورود مجدد لازم است. کانتینرها و volumeهای قدیمی را حذف نکنید؛ ممکن است متعلق به وب‌اپ باشند. برای سرور عمومی از [راهنمای README](../README.md) و `setup.sh --repair` استفاده کنید.

در این رایانه `.env.docker` آماده است؛ آن را بازنویسی نکنید:

```powershell
docker compose --project-name makan-management-panel --env-file .env.docker up -d --wait --wait-timeout 240
```

پس از موفقیت بررسی سلامت، [ورود پنل](http://127.0.0.1:3101/login) را باز کنید. این دستور نسخه ساخته‌شده را اجرا می‌کند؛ برای تغییر کد، `--build` را اضافه کنید. مرورگر خودکار باز نمی‌شود.

## آماده‌سازی اولیه

فقط در نصب تازه و نبود `.env.docker`، نمونه را کپی و یک کلید خصوصی تصادفی تولید کنید. این دستور Node.js لازم ندارد و فایل موجود را بازنویسی نمی‌کند:

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

در `.env.docker` برای بک‌اند فعلی این مقادیر را تنظیم کنید و سپس دستور اجرا را بزنید:

```dotenv
MAKAN_PORT=3101
BACKEND_BASE_URL=http://94.184.32.84
APP_ORIGIN=http://127.0.0.1:3101
COOKIE_SECURE=false
```

کلید تولیدشده را در `SESSION_SECRET` نگه دارید. فایل env و کلید را منتشر نکنید. برای نصب اولیه سپس اجرا کنید:

```powershell
docker compose --project-name makan-management-panel --env-file .env.docker up -d --build --wait --wait-timeout 240
```

برای `.env.local` تازه نیز همین روش تولید کلید با نام فایل مربوط به آن قابل استفاده است؛ اجرای محلی به `MAKAN_PORT` وابسته نیست.

## دستورهای روزمره

| کار                     | دستور                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| ساخت و اجرا             | `docker compose --project-name makan-management-panel --env-file .env.docker up -d --build --wait --wait-timeout 240`                  |
| اجرای نسخه ساخته‌شده    | `docker compose --project-name makan-management-panel --env-file .env.docker up -d --wait --wait-timeout 240`                          |
| وضعیت و سلامت           | `docker compose --project-name makan-management-panel --env-file .env.docker ps`                                                       |
| مشاهده لاگ‌ها           | `docker compose --project-name makan-management-panel --env-file .env.docker logs -f --tail 100 web`                                   |
| توقف با حفظ نشست‌ها     | `docker compose --project-name makan-management-panel --env-file .env.docker down`                                                     |
| اعمال تنظیمات تازه      | `docker compose --project-name makan-management-panel --env-file .env.docker up -d --force-recreate --wait --wait-timeout 240`         |
| اعمال کد و تنظیمات تازه | `docker compose --project-name makan-management-panel --env-file .env.docker up -d --build --force-recreate --wait --wait-timeout 240` |

Ctrl+C فقط مشاهده لاگ را می‌بندد. `restart` فایل env را دوباره نمی‌خواند؛ برای تغییر تنظیمات از `up --force-recreate` استفاده کنید. پس از تغییر کد، `--build` لازم است.

## تغییر پورت

در `.env.docker` هر دو مقدار را با هم تغییر دهید:

```dotenv
MAKAN_PORT=3001
APP_ORIGIN=http://127.0.0.1:3001
```

دستور اعمال تنظیمات تازه را بزنید و `http://127.0.0.1:3001/login` را باز کنید. در صورت اشغال پورت، فرایند دیگری خودکار بسته نمی‌شود. تغییر پورت نشست‌های مرورگر را پاک نمی‌کند.

## اجزای کانتینر و نگه‌داری

Dockerfile با `npm ci` و Webpack خروجی standalone می‌سازد. فقط ورودی‌های لازم وارد context می‌شوند؛ env، نشست‌ها، node_modules میزبان، تست‌ها و گزارش‌ها داخل image کپی نمی‌شوند. تنظیمات خصوصی هنگام اجرا تزریق می‌شوند.

`docker-start.mjs` ورودی داخلی کانتینر است و پیش از اجرای سرور کلید، JSON تنظیمات و امکان نوشتن نشست را بررسی می‌کند؛ این فایل باید برای Docker باقی بماند. کانتینر با کاربر غیر root و فایل‌سیستم اصلی فقط‌خواندنی اجرا می‌شود. cache کانتینر مستقل از خروجی ساخت میزبان است.

نشست‌های Docker در volume پایدار نگه‌داری می‌شوند. دستورهای توقف بالا volume را حذف نمی‌کنند. تعویض `SESSION_SECRET` یا حذف volume، نشست‌های قبلی را از دسترس خارج می‌کند. این نسخه برای یک replica و انتشار محلی روی `127.0.0.1` تنظیم شده است؛ برای استقرار عمومی [راهنمای استقرار](../README.md) را بخوانید.

## عیب‌یابی

- موتور Docker در دسترس نیست: Docker Desktop و Linux containers را بررسی و دستور اجرا را دوباره بزنید.
- پورت اشغال است: اجرای قبلی را متوقف کنید یا پورت و `APP_ORIGIN` را با هم تغییر دهید.
- دانلود یا ساخت ناموفق است: اتصال شبکه Docker را بررسی و همان دستور ساخت را تکرار کنید؛ کش ساخت استفاده می‌شود.
- کانتینر unhealthy است: لاگ‌ها، کلید و JSON تنظیمات env را بررسی کنید و پس از اصلاح از `up --force-recreate` استفاده کنید.
- OTP درست است ولی ورود رد می‌شود: پاسخ بک‌اند باید نقش `PlatformOwner` و مجوز `platform.access` داشته باشد.
- خطای نشانی ورود: از `APP_ORIGIN` استفاده و صفحه را تازه کنید؛ نام محلی جایگزین روی همان پورت به نشانی اصلی هدایت می‌شود.

## بررسی نسخه اجراشده

اگر وابستگی‌های توسعه و Chrome روی میزبان نصب‌اند:

```powershell
npx playwright test --config playwright.docker.config.ts
```
