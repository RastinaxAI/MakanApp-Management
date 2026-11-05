# راهنمای نصب و به‌روزرسانی سرور

این راهنما برای بستهٔ `MakanManagement-server-20261105.tar.gz`، اتصال `vNext` و اسکریپت همین بسته به‌روز شده است. `setup.sh` را همراه کل بسته منتقل کنید تا فایل‌های کلاس شخصی، realtime و قرارداد جدید هم روی سرور باشند.

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

بسته و checksum را از ویندوز منتقل کنید. حساب و نشانی زیر همان سرور معرفی‌شده در این پروژه‌اند؛ اگر حساب SSH را عوض کرده‌اید، مقدار مقصد را جایگزین کنید:

```powershell
cd C:\Users\OmidrezaBagheriyan\Desktop\MakanManagement
scp .\release\MakanManagement-server-20261105.tar.gz .\release\MakanManagement-server-20261105.tar.gz.sha256 omid@89.46.217.168:/tmp/
ssh omid@89.46.217.168
```

داخل نشست سرور، در نصب تازه اجرا کنید:

```bash
sudo bash -e <<'INSTALL'
cd /tmp
sha256sum -c MakanManagement-server-20261105.tar.gz.sha256
install -d -m 755 /var/www/makanapp/management
tar --no-same-owner --no-same-permissions -xzf MakanManagement-server-20261105.tar.gz -C /var/www/makanapp/management
cd /var/www/makanapp/management
bash ./setup.sh
INSTALL
```

پوشه نصب اولیه باید مخصوص مدیریت و خالی از سورس برنامه‌های دیگر باشد. اسکریپت وابستگی‌های لازم را آماده می‌کند، کلید نشست تصادفی را در نصب تازه می‌سازد، Nginx و HTTPS همین دامنه را تنظیم و برنامه را می‌سازد و اجرا می‌کند. ارتقای کلی سیستم‌عامل و فعال‌کردن اجباری فایروال انجام نمی‌شوند. سرویس‌ها و گواهی‌های دامنه‌های دیگر حذف نمی‌شوند.

## به‌روزرسانی نسخه موجود

برای این ارتقا روی نصب موجود، بلوک زیر checksum را کنترل، از سورس قبلی پشتیبان تهیه و بسته تازه را نصب می‌کند. پشتیبان سورس پیش از استخراج ساخته می‌شود؛ پشتیبان خود اسکریپت پس از استخراج، مربوط به تنظیمات و image است. اگر دستور خطا بدهد، ادامهٔ بلوک اجرا نمی‌شود:

```bash
sudo bash -e <<'UPDATE'
umask 077
cd /tmp
sha256sum -c MakanManagement-server-20261105.tar.gz.sha256
test -d /var/www/makanapp/management
install -d -m 700 /var/backups/makanapp-management
release_backup=$(mktemp -d /var/backups/makanapp-management/release.XXXXXX)
tar -czf "$release_backup/source-before.tar.gz" \
    --exclude='./node_modules' --exclude='./.next' --exclude='./.git' \
    --exclude='./maintenance' --exclude='./release' \
    --exclude='./.makan-sessions' --exclude='./.makan-test-sessions' \
    -C /var/www/makanapp/management .
printf 'Source backup: %s\n' "$release_backup"
tar --no-same-owner --no-same-permissions -xzf MakanManagement-server-20261105.tar.gz -C /var/www/makanapp/management
cd /var/www/makanapp/management
bash ./setup.sh --update
UPDATE
```

بسته، فایل خصوصی `.env.docker`، نشست‌ها یا volume را ندارد؛ نصب موجود آن‌ها را حفظ می‌کند. `--update` کد جدید را می‌سازد و فقط سرویس مدیریت را به‌روز می‌کند؛ Nginx و گواهی موجود دوباره تنظیم نمی‌شوند. فایل‌های ناشناخته مقصد خودکار پاک نمی‌شوند. پوشه قدیمی وب‌اپ را با سورس مدیریت ادغام نکنید.

در بلوک بالا برای ارتقای این نسخه از `--update` استفاده شده؛ تنظیم HTTPS موجود حفظ می‌شود. برای تعمیر تنظیم همین دامنه همراه با build، از `bash ./setup.sh --repair` استفاده کنید. برای ارسال نسخه بعدی، تاریخ نام بسته و checksum را در فرمان‌ها عوض کنید.

برای اولین به‌روزرسانی به نسخه دارای کتابخانه، پس از `--update` یک بار `sudo bash ./setup.sh --ssl-only` را نیز اجرا کنید. تنظیم اختصاصی Nginx پنل سقف بدنه را به `21m` می‌رساند تا فایل ۲۰ مگابایتی همراه سربار فرم پذیرفته شود. سقف خود فایل در برنامه همچنان ۲۰ مگابایت است. بدون این مرحله، تنظیم قدیمی Nginx ممکن است حتی فایل یک مگابایتی را با ۴۱۳ رد کند. این دستور از تنظیمات همین سایت پشتیبان می‌گیرد و برنامه را دوباره نمی‌سازد.

اگر از `--repair` استفاده کردید، تنظیم سقف بارگذاری همان‌جا انجام شده و اجرای جداگانهٔ `--ssl-only` لازم نیست.

## پشتیبان و بازگشت

در حالت‌های ساخت، اسکریپت پوشه‌ای با نام `app.*` در `/var/backups/makanapp-management` می‌سازد و مسیرش را چاپ می‌کند. `env.before` تنظیمات قبل از آماده‌سازی، `env.deployed` تنظیمات آمادهٔ اجرا و `compose.yaml` فایل استقرار بارگذاری‌شده است. در صورت وجود image با برچسب `makan-management-panel:local` و هویت درست مدیریت پیش از build، شناسه آن در `previous-image-id` ذخیره و برچسب `makan-management-panel:previous` به آن داده می‌شود. پوشه با مجوز ۷۰۰ و فایل‌های خصوصی با مجوز ۶۰۰ نگه‌داری می‌شوند.

برای بازگشت فقط برنامه به image قبلی:

```bash
cd /var/www/makanapp/management
sudo docker image inspect makan-management-panel:previous --format '{{.Id}}'
sudo docker image tag makan-management-panel:previous makan-management-panel:local
sudo bash ./setup.sh --start
```

`--start` image را دوباره نمی‌سازد و برچسب پشتیبان را بازنویسی نمی‌کند. rollback تنظیمات، سورس و volume نشست را تغییر نمی‌دهد. برچسب `previous` در ساخت بعدی جایگزین می‌شود؛ برای نگه‌داری بلندمدتِ یک نسخه، قبل از آپدیت بعدی به آن برچسب دیگری بدهید. اگر image قبلی موجود نباشد، اسکریپت اعلام می‌کند و بازگشت image برای آن نصب در دسترس نیست.

پشتیبان‌های سورس و env دارای اطلاعات خصوصی‌اند و باید روی همین سرور بمانند. بازیابی env فقط در صورت خرابی یا حذف فایل خصوصی لازم است؛ مسیر چاپ‌شده را جایگزین نمونه کنید:

```bash
sudo install -o root -g root -m 600 /var/backups/makanapp-management/app.EXAMPLE/env.deployed /var/www/makanapp/management/.env.docker
```

پشتیبان Nginx/HTTPS در پوشه مستقل `ssl.*` ذخیره می‌شود. بازگشت image، نسخه بک‌اند یا دیتابیس را برنمی‌گرداند.

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

اگر کانتینر مدیریت موجود باشد ولی این فایل حذف شده باشد، اسکریپت متوقف می‌شود و کلید تازه نمی‌سازد. ابتدا فایل خصوصی را از پشتیبان برگردانید. اگر پشتیبان ندارید و کانتینر قبلی هنوز موجود است، تنظیمات اصلی را باید مدیر سرور بدون چاپ کلیدها از همان کانتینر بازیابی کند؛ فایل نمونه جایگزین تنظیمات قبلی نیست.

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
