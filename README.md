# پنل مدیریت ماکان

پنل فارسی و راست‌به‌چپ مالک پلتفرم با Next.js و TypeScript. بک‌اند فعلی `http://94.184.32.84:8090` است. ورود با OTP انجام می‌شود؛ هر حساب دارای نقش `PlatformOwner` و مجوز `platform.access` در پاسخ سرور وارد می‌شود. ورود به شماره خاصی محدود نیست؛ MFA و صفحات عمومی دمو حذف شده‌اند.

## اجرا با Docker

Docker Desktop را با Linux containers باز کنید. در PowerShell:

```powershell
Set-Location 'C:\Users\OmidrezaBagheriyan\Desktop\MakanManagement'
docker compose --env-file .env.docker up -d --build --wait --wait-timeout 120
```

سپس [صفحه ورود](http://127.0.0.1:3000/login) را باز کنید. `.env.docker` این رایانه آماده است؛ آن را بازنویسی نکنید. Node.js روی میزبان لازم نیست. برای نصب تازه [آماده‌سازی اولیه](docs/docker.md#آماده‌سازی-اولیه) را انجام دهید.

فایل‌های اجرای دوبارکلیکی و راه‌انداز PowerShell حذف شده‌اند؛ اجرا مستقیم با دستور انجام می‌شود.

### اجرای دوباره نسخه ساخته‌شده

```powershell
docker compose --env-file .env.docker up -d --wait --wait-timeout 120
```

### وضعیت و مشاهده خطاها

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f --tail 100 web
```

Ctrl+C فقط مشاهده لاگ را می‌بندد؛ برنامه همچنان اجرا می‌شود.

### توقف با حفظ نشست‌ها

```powershell
docker compose --env-file .env.docker down
```

### اعمال تغییرات کد یا تنظیمات

```powershell
docker compose --env-file .env.docker up -d --build --force-recreate --wait --wait-timeout 120
```

سپس صفحه را با Ctrl+F5 تازه کنید. دستور `docker compose restart` تغییرات فایل env را دوباره بارگذاری نمی‌کند.

### تغییر پورت

برای مثال در `.env.docker` هر دو مقدار را تنظیم و دستور اعمال تغییرات را اجرا کنید:

```dotenv
MAKAN_PORT=3001
APP_ORIGIN=http://127.0.0.1:3001
```

سپس نشانی ورود `http://127.0.0.1:3001/login` است. نام محلی جایگزین مانند localhost، روی همان پورت به نشانی اصلی هدایت می‌شود.

## اجرای محلی بدون Docker

Node.js نسخه ۲۲ یا بالاتر لازم است. `.env.local` این رایانه آماده است. در نصب تازه، آن را از `.env.example` بسازید و کلید خصوصی و نقش مالک را مطابق [راهنمای تنظیمات](docs/docker.md#آماده‌سازی-اولیه) تکمیل کنید؛ فایل موجود را بازنویسی نکنید.

```powershell
npm ci
npm run dev
```

برای production محلی:

```powershell
npm run build
npm start
```

Docker و اجرای محلی نباید هم‌زمان یک پورت را اشغال کنند. اجرای محلی `.env.local` را می‌خواند؛ `.env.docker` فقط برای Compose است.

## دستورهای توسعه و بررسی

```powershell
npm run typecheck
npm test
npm run test:e2e
npx playwright test --config playwright.docker.config.ts
```

E2E یک بک‌اند مستقل روی ۴۱۰۰ و فرانت‌اند آزمون روی ۳۱۰۰ اجرا می‌کند. اگر پورت اشغال بود، پیش از اجرا `$env:MAKAN_TEST_PORT='3110'` را تنظیم کنید. آزمون Docker به کانتینر فعال و Chrome روی میزبان نیاز دارد.

به‌روزرسانی قرارداد API و فایل‌های تولیدشده:

```powershell
npm run api:update
npm run api:generate
```

## ساختار و راهنماها

- `src/`: رابط، ماژول‌ها، واسط API و نشست رمزگذاری‌شده.
- `contracts/`: قرارداد بک‌اند و نگاشت مجوز عملیات.
- `public/`: لوگو، آیکون‌های PWA و راهنمای تصویری داخل پنل.
- `scripts/`: تولید قرارداد، ساخت راهنما و ابزار آزمون. `docker-start.mjs` ورودی داخلی لازم کانتینر است.
- `tests/`: آزمون‌های واحد و مرورگر.
- `docs/`: راهنماها، تصاویر و شواهد بررسی.
- `reports/` و `assets/`: گزارش‌های قبلی و اصل لوگو.

[اجرای Docker و عیب‌یابی](docs/docker.md)، [ورود مالک](docs/otp-login.md)، [کار با پنل](docs/owner-panel-guide.md)، [راهنمای تصویری PDF](public/guides/makan-owner-guide.pdf)، [استقرار](docs/deployment.md)، [PWA و اعلان‌ها](docs/pwa-release.md).

تنظیمات خصوصی، نشست‌های واقعی و volume نشست Docker را هنگام پاک‌سازی نگه دارید. `.next`، `tmp`، `test-results`، `playwright-report` و `tsconfig.tsbuildinfo` خروجی تولیدشده‌اند؛ ساخت و آزمون آن‌ها را دوباره ایجاد می‌کنند.
