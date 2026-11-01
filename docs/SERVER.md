# راهنمای نصب و به‌روزرسانی سرور

این بسته فقط پنل مدیریت مالک ماکان است. بک‌اند پیش‌فرض `http://94.184.32.84:8090` و مستندات آن [Swagger](http://94.184.32.84:8090/swagger/index.html) هستند. مقدار `BACKEND_BASE_URL` شامل مسیر `/swagger` نمی‌شود. درخواست‌های مرورگر به خود پنل و از پنل به بک‌اند ارسال می‌شوند.

## مشخصات استقرار فعلی

| مورد              | مقدار                                   |
| ----------------- | --------------------------------------- |
| دامنه پنل         | `https://management.makanapp.org`       |
| صفحه ورود         | `https://management.makanapp.org/login` |
| مسیر سرور         | `/var/www/makanapp/management`          |
| پروژه Docker      | `makan-management-panel`                |
| پورت داخلی میزبان | `127.0.0.1:3101`                        |
| پورت داخل کانتینر | `3000`                                  |

دامنه باید به سرور میزبان پنل اشاره کند و پورت‌های ورودی 80 و 443 در دسترس باشند. پنل به Docker، Nginx و گواهی HTTPS نیاز دارد. بک‌اند روی سرور جداگانه است؛ دیتابیس محلی لازم نیست.

## نصب اولیه

بسته `MakanManagement-server-YYYYMMDD.tar.gz` و فایل `.sha256` کنارش را به `/tmp` سرور منتقل کنید. `YYYYMMDD` را با تاریخ نام بسته جایگزین کنید.

```bash
cd /tmp
sha256sum -c MakanManagement-server-YYYYMMDD.tar.gz.sha256
sudo mkdir -p /var/www/makanapp/management
sudo tar -xzf MakanManagement-server-YYYYMMDD.tar.gz -C /var/www/makanapp/management
cd /var/www/makanapp/management
sudo bash ./setup.sh
```

پوشه نصب اولیه باید مخصوص مدیریت و خالی از سورس برنامه‌های دیگر باشد. اسکریپت وابستگی‌های لازم را آماده می‌کند، کلید نشست تصادفی را در نصب تازه می‌سازد، Nginx و HTTPS همین دامنه را تنظیم و برنامه را می‌سازد و اجرا می‌کند. ارتقای کلی سیستم‌عامل و فعال‌کردن اجباری فایروال انجام نمی‌شوند. سرویس‌ها و گواهی‌های دامنه‌های دیگر حذف نمی‌شوند.

## به‌روزرسانی نسخه موجود

پس از انتقال بسته تازه و فایل checksum به `/tmp`:

```bash
cd /tmp
sha256sum -c MakanManagement-server-YYYYMMDD.tar.gz.sha256
sudo tar -xzf MakanManagement-server-YYYYMMDD.tar.gz -C /var/www/makanapp/management
cd /var/www/makanapp/management
sudo bash ./setup.sh --update
```

بسته، فایل خصوصی `.env.docker`، نشست‌ها یا volume را ندارد؛ نصب موجود آن‌ها را حفظ می‌کند. `--update` کد جدید را می‌سازد و فقط سرویس مدیریت را به‌روز می‌کند؛ Nginx و گواهی موجود دوباره تنظیم نمی‌شوند. فایل‌های ناشناخته مقصد خودکار پاک نمی‌شوند. پوشه قدیمی وب‌اپ را با سورس مدیریت ادغام نکنید.

آدرس قبلی بدون پورت در `.env.docker` به `http://94.184.32.84:8090` تبدیل می‌شود. کلید نشست و تنظیمات مجوزها حفظ می‌شوند. اگر بک‌اند متفاوتی عمداً تنظیم کرده‌اید، مقدار آن حفظ می‌شود؛ برای همین سرور، `BACKEND_BASE_URL=http://94.184.32.84:8090` را در فایل خصوصی تنظیم کنید.

## اجرای سریع بدون ساخت دوباره

```bash
cd /var/www/makanapp/management
sudo bash ./setup.sh --start
```

این گزینه از image موجود استفاده می‌کند و برای تغییر کد کافی نیست. پس از تغییر کد `--update` لازم است. اگر image موجود نیست، ابتدا نصب یا به‌روزرسانی را اجرا کنید. ساخت سنگین ممکن است چند دقیقه طول بکشد؛ برنامه فعلی تا زمان موفقیت ساخت روشن می‌ماند. بررسی سلامت حداکثر 240 ثانیه پس از شروع کانتینر منتظر می‌ماند و در صورت آماده‌بودن زودتر تمام می‌شود.

## تعمیر و بررسی

```bash
# گزارش خواندنی؛ کلیدها و env چاپ نمی‌شوند
sudo bash ./setup.sh --diagnose
# تعمیر تنظیم دامنه و HTTPS همراه با ساخت برنامه
sudo bash ./setup.sh --repair
# فقط تعمیر HTTPS، بدون build
sudo bash ./setup.sh --ssl-only
# وضعیت و لاگ
sudo docker compose --project-name makan-management-panel --env-file .env.docker ps
sudo docker compose --project-name makan-management-panel --env-file .env.docker logs --tail 100 web
```

پس از نصب، هویت برنامه و خود صفحه ورود مالک مستقیم، از Nginx محلی و از دامنه عمومی بررسی می‌شوند. صرف پاسخ 200 از وب‌اپ دیگری موفقیت محسوب نمی‌شود. اگر ساخت یا بررسی نهایی شکست بخورد، پیام موفقیت صادر نمی‌شود.

در تداخل پورت 3101، کانتینر یا فرایند دیگری متوقف نمی‌شود. در تنظیم تکراری دامنه، `--diagnose` را اجرا و دامنه مدیریت را فقط در یک سایت فعال نگه دارید. خطای TLS را با `-k` یا خاموش‌کردن بررسی گواهی دور نزنید.

## تنظیمات خصوصی

`.env.docker` را با مجوز محدود نگه دارید و با فایل نمونه جایگزین نکنید. `SESSION_SECRET` باید 64 کاراکتر hex تصادفی باشد؛ تعویض آن نشست‌های قبلی را بی‌اعتبار می‌کند. تنظیمات عمومی:

```dotenv
MAKAN_PORT=3101
BACKEND_BASE_URL=http://94.184.32.84:8090
APP_ORIGIN=https://management.makanapp.org
COOKIE_SECURE=true
PLATFORM_OWNER_ROLE_KEYS='["PlatformOwner"]'
ALLOW_UNCONFIGURED_OWNER_OTP_TESTING=false
PERMISSION_BINDINGS='{}'
```

ورود فقط با نقش واقعی `PlatformOwner` و مجوز `platform.access` مجاز است؛ هر عملیات مجوز مستقل دارد. شماره همراه باید 11 رقم با شروع 09 و کد ورود دقیقاً 6 رقم باشد. PWA و Push به HTTPS و آماده‌بودن سرویس بک‌اند نیاز دارند.
