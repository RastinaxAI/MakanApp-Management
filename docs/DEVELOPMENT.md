# توسعه و بررسی پنل

Node.js نسخه 22 یا جدیدتر و npm لازم‌اند. در نصب تازه `.env.example` را در `.env.local` کپی و کلید خصوصی تصادفی `SESSION_SECRET` را تنظیم کنید. فایل موجود را بازنویسی نکنید.

```powershell
npm ci
npm run dev
npm run typecheck
npm test
```

ورود محلی پیش‌فرض `http://127.0.0.1:3000/login` است؛ `APP_ORIGIN` باید با نشانی اجرا برابر باشد. برای پورت جدا، همان پورت را در `APP_ORIGIN` و `npm run dev -- --port 3111` تنظیم کنید. اجرای production محلی: `npm run build` و سپس `npm start`.

```powershell
$env:MAKAN_TEST_PORT='3110'
npx playwright test
# Docker روشن روی پورت 3101
$env:DOCKER_APP_URL='http://127.0.0.1:3101'
npx playwright test --config playwright.docker.config.ts
```

e2e با سرور مستقل fixture اجرا می‌شود؛ تست Docker به کانتینر روشن نیاز دارد. Chrome باید نصب باشد. آزمون داده‌های واقعی سرور با آزمون fixture یکسان نیست.

آزمون اسکریپت استقرار با Nginx و TLS واقعی در محیط جدا؛ دستورات سیستم و Docker در تست شبیه‌سازی می‌شوند و Docker socket به آن داده نمی‌شود:

```powershell
docker build -t makan-management-deploy-tests tests/deployment
docker run --rm --network none --mount "type=bind,source=$($PWD.Path),target=/work,readonly" makan-management-deploy-tests
```

خروجی تست‌ها در `maintenance/generated` است. `maintenance/history` سوابق قدیمی است و در build، typecheck و بسته استقرار وارد نمی‌شود. تصاویر جاری راهنما در `docs/screenshots/redesign-20261030` و PDF قابل ارسال در `public/guides/makan-owner-guide.pdf` قرار دارد.

بازسازی PDF پس از آماده‌بودن تصاویر و وابستگی‌های توسعه:

```powershell
node scripts/build-user-handbook.cjs
```

برای تغییر قرارداد، snapshot را دریافت، اختلاف را مرور و سپس کد تولیدشده را بازسازی کنید:

```powershell
npm run api:update
npm run api:generate
npm run typecheck
npm test
```

نگاشت مجوزها از `contracts/platform-permissions.json` می‌آید. نقش مالک مجوز اضافی عملیات یا دسترسی به محتوای خصوصی ایجاد نمی‌کند.

ساخت بسته قابل ارسال از ریشه پروژه:

```powershell
npm run release:package
```

فقط فایل‌های مجاز اجرا بسته‌بندی می‌شوند و SHA256 و فهرست فایل‌ها کنار بسته قرار می‌گیرند. `node_modules`، `.next`، تاریخچه، گزارش‌ها، تست‌ها و env خصوصی وارد بسته نمی‌شوند.
