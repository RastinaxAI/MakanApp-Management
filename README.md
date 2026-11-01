# پنل مدیریت ماکان

پنل فارسی مالک پلتفرم، با همان طراحی سرمه‌ای و روشن. ورود فقط برای `PlatformOwner` همراه با `platform.access` است و مجوز هر عملیات جدا بررسی می‌شود. شماره همراه 11 رقمی با شروع 09 و کد ورود دقیقاً 6 رقمی است.

## اتصال فعال

- بک‌اند: `http://94.184.32.84:8090`
- مستندات API: [Swagger](http://94.184.32.84:8090/swagger/index.html)
- پنل سرور: [ورود مدیریت](https://management.makanapp.org/login)
- ارتباط داخلی Nginx با برنامه: `127.0.0.1:3101`

`BACKEND_BASE_URL` فقط origin بک‌اند است؛ `/swagger/index.html` را در این متغیر ننویسید. آدرس قبلی بدون پورت در تنظیمات شناخته‌شده به آدرس بالا مهاجرت می‌کند. درخواست‌ها از واسط هم‌دامنه پنل به سرور API می‌روند؛ کلیدها و توکن‌ها وارد کد مرورگر نمی‌شوند.

## بسته آماده ارسال به سرور

در پوشه `release` یک فایل `MakanManagement-server-YYYYMMDD.tar.gz`، فایل checksum و فهرست فایل‌ها تولید می‌شود. این بسته فقط سورس و فایل‌های لازم اجرای پنل را دارد؛ تاریخچه، تست، `node_modules`، `.next`، نشست‌ها و env خصوصی داخل آن نیستند.

برای ساخت مجدد بسته از نسخه کامل توسعه، پیش از ارسال به سرور:

```powershell
npm run release:package
```

بسته و فایل `.sha256` کنارش را به `/tmp` سرور منتقل کنید. `YYYYMMDD` را با تاریخ نام بسته عوض کنید و برای **به‌روزرسانی نصب موجود** اجرا کنید:

```bash
cd /tmp
sha256sum -c MakanManagement-server-YYYYMMDD.tar.gz.sha256
sudo tar -xzf MakanManagement-server-YYYYMMDD.tar.gz -C /var/www/makanapp/management
cd /var/www/makanapp/management
sudo bash ./setup.sh --update
```

در **نصب تازه** ابتدا پوشه اختصاصی `/var/www/makanapp/management` را بسازید، بسته را در آن استخراج و `sudo bash ./setup.sh` را اجرا کنید. پیش‌نیاز DNS و HTTPS و راهنمای کامل در [SERVER.md](docs/SERVER.md) است. فایل خصوصی `.env.docker` نصب موجود را با نمونه جایگزین نکنید.

## دستورهای سرور

| کار                               | دستور در پوشه `/var/www/makanapp/management` |
| --------------------------------- | -------------------------------------------- |
| نصب اولیه                         | `sudo bash ./setup.sh`                       |
| به‌روزرسانی کد                    | `sudo bash ./setup.sh --update`              |
| اجرای image موجود، بدون build     | `sudo bash ./setup.sh --start`               |
| تعمیر Nginx و HTTPS و ساخت برنامه | `sudo bash ./setup.sh --repair`              |
| فقط تعمیر HTTPS                   | `sudo bash ./setup.sh --ssl-only`            |
| گزارش وضعیت بدون تغییر            | `sudo bash ./setup.sh --diagnose`            |

`--update` تنظیم SSL را دوباره نمی‌نویسد؛ `--start` اصلاً برنامه را نمی‌سازد. نصب و آپدیت ارتقای کلی سیستم‌عامل انجام نمی‌دهند. برنامه فعلی تا موفقیت build روشن می‌ماند. بررسی سلامت و هویت واقعی صفحه مالک پس از اجرا انجام می‌شود. این مخزن سایت استاتیک نیست؛ `.next` به‌تنهایی قابل آپلود نیست.

## اجرای محلی ویندوز

با Docker Desktop روشن و `.env.docker` موجود:

```powershell
docker compose --env-file .env.docker up -d --wait --wait-timeout 240
```

پورت از `MAKAN_PORT` می‌آید و پیش‌فرض 3101 است. `APP_ORIGIN` باید با نشانی بازشده برابر باشد. برای اعمال کد تازه:

```powershell
docker compose --env-file .env.docker up -d --build --wait --wait-timeout 240
```

برای توسعه با Node.js نسخه 22 یا جدیدتر، نمونه env را فقط در نصب تازه در `.env.local` کپی و کلید نشست تصادفی را تنظیم کنید؛ سپس `npm ci` و `npm run dev` را اجرا کنید. راهنمای توسعه، تست و قرارداد در [DEVELOPMENT.md](docs/DEVELOPMENT.md) است.

## ساختار مرتب پروژه

| مسیر                    | کاربرد                                         |
| ----------------------- | ---------------------------------------------- |
| `src`                   | کد فعال پنل و واسط API                         |
| `public`                | لوگو، PWA و راهنمای تصویری کاربر               |
| `contracts`             | قرارداد و نگاشت مجوزهای بک‌اند                 |
| `scripts`               | ابزارهای فعال توسعه و ساخت بسته                |
| `tests`                 | آزمون‌های جاری و fixtureها                     |
| `docs`                  | راهنمای جاری سرور، توسعه، API و تصاویر راهنما  |
| `maintenance/history`   | سوابق قدیمی، خارج از اجرای برنامه و بسته سرور  |
| `maintenance/generated` | خروجی موقت ساخت مستندات و آزمون‌ها؛ gitignored |
| `release`               | بسته آماده ارسال به سرور؛ gitignored           |

[راهنمای تصویری قابل ارسال (PDF)](public/guides/makan-owner-guide.pdf) در منوی خود پنل نیز در دسترس است. پرونده‌ها و نشست‌های خصوصی cache آفلاین نمی‌شوند. فایل‌های env و پوشه‌های نشست، خصوصی و جدا از بسته انتشار هستند.
