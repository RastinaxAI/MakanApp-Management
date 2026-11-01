# پنل مدیریت ماکان

## استقرار روی سرور management.makanapp.org

این مخزن، پنل مدیریت مالک با همان طراحی سرمه‌ای و روشنِ صفحهٔ محلی `http://127.0.0.1:3000/login` است. نشانی اصلی ورود روی سرور `https://management.makanapp.org/login` است. مسیر قدیمی `/enter` نیز همین فرم مدیریت را نمایش می‌دهد تا لینک‌ها و هدایت‌های ذخیره‌شدهٔ مرورگر به حلقهٔ هدایت نرسند.

بک‌اند فعال پنل `http://94.184.32.84` است؛ مستندات آن در `http://94.184.32.84/swagger/index.html` قرار دارد. مقدار `BACKEND_BASE_URL` فقط نشانی سرور است و نباید شامل `/swagger` باشد. اسکریپت راه‌اندازی نشانی قدیمی با پورت 8090 را به نشانی جدید تبدیل می‌کند و کلید خصوصی نشست را حفظ می‌کند. درخواست‌های مرورگر به مسیرهای هم‌دامنهٔ پنل می‌روند و سرور پنل با API ارتباط می‌گیرد.

### رفع نمایش صفحهٔ وب‌اپ روی دامنهٔ مدیریت

صفحهٔ درست باید عنوان «ورود به پنل مدیریت»، بخش سرمه‌ای «مدیریت یکپارچه پلتفرم ماکان» و توضیح ورود مالک را داشته باشد. صفحهٔ «به ماکان خوش آمدید» مربوط به وب‌اپ است.

اگر از بستهٔ آمادهٔ `MakanManagement-server-20261101.tar.gz` استفاده می‌کنید، آن را در `/tmp` سرور قرار دهید و اجرا کنید:

```bash
sudo mkdir -p /var/www/makanapp/management
sudo tar -xzf /tmp/MakanManagement-server-20261101.tar.gz -C /var/www/makanapp/management
cd /var/www/makanapp/management
sudo bash ./setup.sh --repair
```

بسته شامل سورس و ورودی‌های ساخت همین پنل است و فایل خصوصی `.env.docker`، کلیدها، نشست‌ها، `node_modules` و `.next` را ندارد. اگر این مسیر قبلاً سورس پروژهٔ دیگری را داشته است، ابتدا آن پوشه را با نام پشتیبان نگه دارید و بسته را در پوشهٔ خالی مدیریت قرار دهید؛ فقط `.env.docker` مخصوص مدیریت را از نصب قبلی حفظ کنید. سورس وب‌اپ و مدیریت را روی هم ادغام نکنید.

بستهٔ استقرار همین پنل یا سورس کامل همین مخزن را در `/var/www/makanapp/management` قرار دهید، فایل خصوصی `.env.docker` موجود روی سرور را حفظ کنید و سپس اجرا کنید:

```bash
cd /var/www/makanapp/management
chmod +x setup.sh
sudo ./setup.sh --repair
```

این دستور image مدیریت را از همین سورس دوباره می‌سازد و کانتینر اختصاصی آن را دوباره ایجاد می‌کند. علاوه بر هویت `/api/health`، محتوای واقعی صفحهٔ ورود را از پورت داخلی، Nginx محلی و دامنهٔ عمومی بررسی می‌کند. نمایش HTML یک برنامهٔ دیگر، حتی با پاسخ `200`، خطای استقرار محسوب می‌شود و پیام موفقیت چاپ نمی‌شود.

اگر تنظیم تکراری `server_name management.makanapp.org` وجود داشته باشد، اسکریپت خطای روشن می‌دهد و تنظیمات قبلی همین سایت را برمی‌گرداند. برای دیدن فایل‌های سایت‌های فعال از `sudo ./setup.sh --diagnose` استفاده کنید؛ دامنهٔ مدیریت باید فقط در سایت اختصاصی مدیریت تعریف شده باشد. برای خطای گواهی، از حالت `--ssl-only` استفاده کنید و خطای TLS را در مرورگر نادیده نگیرید.

### اجرای سریع روی Ubuntu

| تنظیم | مقدار |
| --- | --- |
| رکورد DNS | `A` با نام `management` و مقدار `89.46.217.168` |
| مسیر پروژه | `/var/www/makanapp/management` |
| نشانی ورود | `https://management.makanapp.org/login` |
| ایمیل SSL | `rastinaxoffice@gmail.com` |
| ارتباط داخلی Nginx با برنامه | `127.0.0.1:3101` |

۱. رکورد DNS را تنظیم کنید و تا انتشار آن صبر کنید. پورت‌های `80` و `443` در فایروال ارائه‌دهندهٔ سرور باز باشند. اگر DNS دارای پروکسی است، برای راه‌اندازی اولیه آن را روی DNS only بگذارید.

۲. مسیر را بسازید و **کل پروژه** را در آن قرار دهید:

```bash
sudo mkdir -p /var/www/makanapp/management
```

فایل `setup.sh` باید مستقیماً در همین مسیر باشد. `Dockerfile`، `compose.yaml`، فایل‌های تنظیمات Next.js، `package.json` و `package-lock.json`، `.env.docker.example` و پوشه‌های `src`، `public`، `scripts` و `contracts` را منتقل کنید. `node_modules`، `.next`، فایل‌های env محلی و پوشه‌های نشست را منتقل نکنید. در به‌روزرسانی‌ها، `.env.docker` موجود روی سرور را حفظ کنید.

۳. نصب اولیه و اجرای پنل:

```bash
cd /var/www/makanapp/management
chmod +x setup.sh
sudo ./setup.sh
```

اسکریپت وابستگی‌ها و Docker را آماده می‌کند، فایل تنظیمات و کلید نشست خصوصی را در نصب تازه می‌سازد، HTTPS را تنظیم می‌کند و سپس پنل را می‌سازد و اجرا می‌کند. پیش از ارتقای بسته‌ها، وجود فایل‌های ضروری پروژه بررسی می‌شود. لازم نیست روی سرور جداگانه `npm install` یا `npm run build` اجرا کنید.

۴. بعد از پیام موفقیت، نشانی ورود را باز کنید:

```text
https://management.makanapp.org/login
```

برای انتشار نسخه‌های بعدی، فایل‌های جدید پروژه را جایگزین کنید و اجرا کنید:

```bash
cd /var/www/makanapp/management
sudo ./setup.sh --repair
```

| کار | دستور در پوشهٔ پروژه |
| --- | --- |
| وضعیت برنامه | `sudo docker compose --project-name makan-management-panel --env-file .env.docker ps` |
| مشاهدهٔ خطاهای برنامه | `sudo docker compose --project-name makan-management-panel --env-file .env.docker logs --tail 100 web` |
| بررسی بدون تغییر تنظیمات | `sudo ./setup.sh --diagnose` |
| اصلاح SSL بدون ساخت دوبارهٔ برنامه | `sudo ./setup.sh --ssl-only` |
| راهنمای گزینه‌های اسکریپت | `./setup.sh --help` |

**این پنل به اجرای Next.js نیاز دارد.** Nginx درخواست‌ها را به کانتینر برنامه می‌فرستد؛ فایل `.next` به‌تنهایی یک سایت استاتیک قابل آپلود نیست. نسخهٔ جداگانهٔ اسکریپت SPA کنار گذاشته شده و فایل اصلی `setup.sh` تنها مسیر راه‌اندازی این پروژه است. ساخت صفحهٔ موقت `index.html` و تنظیم `try_files` برای این پنل استفاده نمی‌شود.

دستورهای این بخش باید روی سرور Ubuntu اجرا شوند. بررسی محلی فایل‌ها، تأییدکنندهٔ اجرای نصب، DNS یا صدور گواهی روی سرور `89.46.217.168` نیست.

### جزئیات استقرار و عیب‌یابی

اسکریپت `setup.sh` پنل فعلی Next.js را با Docker می‌سازد و اجرا می‌کند. Nginx دامنهٔ مدیریت را به برنامه روی `127.0.0.1:3101` می‌فرستد؛ پورت داخلی کانتینر `3000` است. نشانی عمومی `https://management.makanapp.org` است.

مدیریت با پروژهٔ Docker به نام `makan-management-panel`، ایمیج `makan-management-panel:local` و volume نشست `makan-management-panel_management_sessions` اجرا می‌شود. نام‌ها و پورت قدیمیِ مشترک با وب‌اپ استفاده نمی‌شوند؛ اسکریپت هیچ کانتینر یا volume قدیمی را متوقف یا حذف نمی‌کند. پس از این جداسازی، ورود دوباره به پنل لازم است و نشست‌های قبلی در volume قبلی باقی می‌مانند.

برای رفع تداخل وب‌اپ و مدیریت، **کل نسخهٔ جدید پروژه** را در مسیر استقرار قرار دهید، فایل خصوصی `.env.docker` را حفظ کنید و اجرا کنید:

```bash
cd /var/www/makanapp/management
sudo bash ./setup.sh --repair
```

حالت `--repair` مدیریت را با نام و پورت مستقل می‌سازد، گواهی دامنهٔ مدیریت و هدایت HTTPS را تنظیم می‌کند و هویت برنامه را مستقیماً و از طریق Nginx و دامنه بررسی می‌کند. ارتقای کلی سیستم و فعال‌سازی اجباری UFW در این حالت انجام نمی‌شوند. اگر پورت `3101` یا نام پروژهٔ جدید متعلق به سرویس دیگری باشد، پیش از تغییر تنظیمات Nginx یا کانتینرهای برنامه متوقف می‌شود؛ هیچ فرایندی را برای آزادکردن پورت نمی‌بندد.

بازکردن `http://management.makanapp.org/` با پاسخ `301` به `https://management.makanapp.org/` هدایت می‌شود. سایر مسیرهای HTTP نیز با حفظ مسیر و پارامترها به HTTPS می‌روند؛ فقط مسیر تأیید گواهی مستثناست. ریشهٔ HTTPS به `/login` می‌رود. هر دو مسیر `/login` و `/enter` همان فرم مدیریت مالک را نمایش می‌دهند. برای انتشار تغییرات برنامه، نسخهٔ جدید پروژه را روی سرور قرار دهید و `sudo ./setup.sh --repair` را اجرا کنید. برای اصلاح هدایت HTTP و گواهی، همان حالت `--ssl-only` کافی است و image برنامه را تغییر نمی‌دهد.

### اصلاح سریع SSL

اگر صفحه ۴۰۴ Nginx می‌بینید یا اسکریپت به خطا خورده است، نسخه جدید فایل را روی سرور قرار دهید و گزارش زیر را بگیرید. این دستور تنظیمات را تغییر نمی‌دهد و فایل env یا کلیدهای خصوصی را نمایش نمی‌دهد:

```bash
sudo bash ./setup.sh --diagnose
```

گزارش، وضعیت سرویس Nginx، نام سایت‌های تنظیم‌شده، کانتینر مدیریت، پورت `3101`، هویت برنامه و پاسخ مستقیم برنامه و دامنه را نشان می‌دهد. خطای `404`، قطع اتصال برنامه و خطای گواهی به‌صورت جداگانه مشخص می‌شوند. خروجی همین دستور را برای عیب‌یابی ارسال کنید.

برای اصلاح هدایت `http://management.makanapp.org/` به `https://management.makanapp.org/` و گواهی همین دامنه، نسخه جدید `setup.sh` را روی سرور جایگزین کنید و در پوشه همان فایل اجرا کنید:

```bash
sudo bash ./setup.sh --ssl-only
```

بررسی نتیجه (بدون نادیده‌گرفتن خطای گواهی):

```bash
curl -I http://management.makanapp.org/
curl -I https://management.makanapp.org/
```

پاسخ دستور اول باید `301` و هدر `Location: https://management.makanapp.org/` باشد. دستور دوم باید بدون خطای SSL پاسخ بگیرد؛ هدایت بعدی به `/login` مربوط به ورود برنامه است. اگر گواهی معتبر شود ولی برنامه پاسخ `200` ندهد، اسکریپت کد پاسخ `/login` را جداگانه هشدار می‌دهد.

این حالت به فایل‌های پروژه و Docker نیاز ندارد و بدون ارتقای کلی بسته‌های سیستم، ساخت برنامه یا تغییر کلید نشست، تنظیمات و گواهی `management.makanapp.org` را اصلاح می‌کند. تنظیمات سایت‌های دیگر و گواهی `app.makanapp.org` تغییر نمی‌کنند. اگر گواهی معتبر همین دامنه از قبل وجود داشته باشد، حتی با نام پوشه‌ای مانند `management.makanapp.org-0001`، همان گواهی استفاده می‌شود؛ در غیر این صورت گواهی اختصاصی از Let's Encrypt دریافت می‌شود.

اسکریپت پیش از تغییر، از سه فایل تنظیمات و لینک سایت مدیریت در `/var/backups/makanapp-management/ssl.*` نسخه پشتیبان می‌گیرد. در صورت شکست صدور گواهی، بررسی تنظیمات یا بررسی HTTPS محلی، فایل‌های قبلی را برمی‌گرداند. Nginx با reload تغییرات را اعمال می‌کند؛ تنظیمات پیش‌فرض و سایت‌های دیگر حذف نمی‌شوند.

صدور و تمدید از مسیر `/.well-known/acme-challenge/` روی HTTP انجام می‌شود؛ این مسیر از هدایت به HTTPS مستثناست. بقیه درخواست‌های HTTP پس از آماده‌شدن گواهی به HTTPS می‌روند. اسکریپت نام دامنه، زنجیره اعتماد و اعتبار زمانی گواهی را بررسی می‌کند و reload پس از تمدید را تنظیم می‌کند.

حالت `--ssl-only` کانتینر جدید مدیریت را نمی‌سازد و تداخل استقرار قدیمی را برطرف نمی‌کند. برای نخستین جداسازی از وب‌اپ، `--repair` را اجرا کنید. اگر مدیریت روی پورت `3101` اجرا نباشد، حالت SSL ممکن است گواهی را اصلاح کند ولی صفحه همچنان `502` بدهد. پیش‌نیاز DNS و بازبودن پورت‌های `80` و `443` در مرحله زیر آمده است.

### مرحله ۱: تنظیمات DNS

پیش از اجرای اسکریپت، رکورد زیر را در مدیریت DNS دامنه `makanapp.org` تنظیم کنید:

| نوع رکورد | نام | مقدار (IPv4 سرور) |
| --- | --- | --- |
| `A` | `management` | `89.46.217.168` |

تا انتشار رکورد و پاسخ‌دادن دامنه با همین IP صبر کنید. اگر رکورد `AAAA` دارید، آن را نیز به همین سرور هدایت کنید یا رکورد نامعتبر را حذف کنید. پورت‌های ورودی `80` و `443` باید در فایروال ارائه‌دهنده باز باشند؛ اسکریپت دسترسی‌های `OpenSSH` و `Nginx Full` را در UFW باز و فایروال را فعال می‌کند.

### مرحله ۲: قرار دادن پروژه و اجرای اسکریپت

روی Ubuntu، پوشه استقرار را ایجاد کنید:

```bash
sudo mkdir -p /var/www/makanapp/management
```

**کل فایل‌های پروژه** را در این مسیر قرار دهید؛ `Dockerfile`، `compose.yaml`، `package.json`، `package-lock.json`، `.env.docker.example`، پوشه‌های `src`، `scripts` و دیگر ورودی‌های ساخت باید داخل همین مسیر باشند. فایل‌های خصوصی محیط توسعه، `node_modules` و `.next` را منتقل نکنید. برای به‌روزرسانی، فایل خصوصی `.env.docker` موجود روی سرور را حفظ کنید.

فایل `setup.sh` همراه پروژه است. اگر لازم است آن را دستی بسازید، در همین پوشه `cat > setup.sh` را اجرا کنید، محتوای کامل اسکریپت را بچسبانید و بعد از آخرین خط Enter و سپس `Ctrl+D` بزنید.

```bash
cd /var/www/makanapp/management
chmod +x setup.sh
sudo ./setup.sh
```

اسکریپت بسته‌های سیستم را به‌روزرسانی و ارتقا می‌دهد و Nginx، UFW، Certbot و ابزارهای لازم Docker را نصب می‌کند. اگر Docker، Compose و Buildx نصب باشند، نصب موجود استفاده می‌شود. هنگام نصب اولیه، فایل `.env.docker` با مجوز `600` و کلید نشست تصادفی ساخته می‌شود. در اجرای مجدد، کلید نشست و تنظیمات بک‌اند و مجوزها حفظ می‌شوند و فقط تنظیمات انتشار زیر اعمال می‌شوند:

```dotenv
MAKAN_PORT=3101
COMPOSE_PROJECT_NAME=makan-management-panel
APP_ORIGIN=https://management.makanapp.org
COOKIE_SECURE=true
```

بک‌اند پیش‌فرض `http://94.184.32.84` است؛ برای محیط دیگر مقدار `BACKEND_BASE_URL` را در `.env.docker` پیش از استقرار تنظیم کنید. این فایل خصوصی است؛ آن را منتشر نکنید و مجوز آن را باز نکنید.

ساخت نخست به دریافت بسته‌های Ubuntu، image پایه Node.js و بسته‌های npm نیاز دارد. اسکریپت ابتدا Nginx و SSL را مستقل از برنامه آماده می‌کند و سپس image برنامه را می‌سازد و حداکثر ۲۴۰ ثانیه برای سلامت کانتینر صبر می‌کند. بنابراین شکست build مانع آماده‌شدن گواهی نمی‌شود. در صورت خطا، اجرا متوقف می‌شود؛ پس از رفع علت همان دستور را دوباره بزنید.

گواهی SSL با ایمیل `rastinaxoffice@gmail.com` صادر می‌شود، HTTP به HTTPS هدایت و تایمر تمدید Certbot فعال می‌شود. مسیر `/api/health` باید پاسخ `{"application":"makan-management-panel","status":"ok"}` بدهد؛ پاسخ `200` از صفحهٔ ورودِ سرویس دیگر به‌عنوان سلامت مدیریت پذیرفته نمی‌شود. در پایان، هویت برنامه و پاسخ HTTPS مسیر `/login` بررسی می‌شوند. برای بررسی دستی، نشانی زیر را باز کنید:

```text
https://management.makanapp.org/login
```

### مرحله ۳: انتشار نسخه‌های بعدی پنل مدیریت

مسیر ثابت استقرار:

```text
/var/www/makanapp/management
```

این پروژه خروجی استاتیک SPA ندارد؛ فایل‌های منبع نسخه جدید را در همین مسیر قرار دهید و `.env.docker` را حفظ کنید. ساخت نهایی داخل Docker انجام می‌شود. برای انتشار تغییرات برنامه، بدون اجرای دوباره ارتقای بسته‌های سیستم:

```bash
cd /var/www/makanapp/management
sudo bash ./setup.sh --repair
```

نشست‌ها در volume اختصاصی مدیریت می‌مانند. سرویس فقط روی loopback منتشر می‌شود و پورت `3101` را در فایروال باز نکنید. کل پروژه را با `chmod -R 755` تغییر ندهید؛ فایل تنظیمات خصوصی باید با مجوز `600` باقی بماند. کانتینر با کاربر غیر root اجرا می‌شود.

برای بررسی وضعیت و خطاها:

```bash
cd /var/www/makanapp/management
sudo docker compose --project-name makan-management-panel --env-file .env.docker ps
sudo docker compose --project-name makan-management-panel --env-file .env.docker logs --tail 100 web
sudo nginx -t
sudo systemctl status certbot.timer --no-pager
```

تنظیمات Nginx در `/etc/nginx/sites-available/makanapp-management.conf` و تنظیمات واسط برنامه در `/etc/nginx/snippets/makanapp-management-proxy.conf` قرار می‌گیرند. اجرای مجدد اسکریپت این دو فایل را پس از پشتیبان‌گیری بازنویسی می‌کند. شکست build یا بررسی سلامت، تنظیمات SSL آماده‌شده را حذف نمی‌کند؛ بازسازی کانتینر ممکن است وقفه کوتاه ایجاد کند.

---

پنل فارسی و راست‌چین مدیریت پلتفرم؛ ورود فقط با نقش واقعی `PlatformOwner` و مجوز `platform.access` در بک‌اند. شماره‌ای در کد مجاز نشده است. هر عملیات نیز مجوز مستقل خودش را لازم دارد.

## اجرای سریع روی همین ویندوز

در نخستین انتقال به نسخهٔ مستقل، تنظیمات Docker محلی را روی `MAKAN_PORT=3101` و `APP_ORIGIN=http://127.0.0.1:3101` قرار دهید و دستور ساخت بخش بعد را اجرا کنید. ایمیج و volume قدیمی برای پنل جدید استفاده نمی‌شوند.

Docker Desktop را با Linux containers روشن کنید. در PowerShell وارد پوشه پروژه شوید:

```powershell
cd 'C:\Users\OmidrezaBagheriyan\Desktop\MakanManagement'
docker compose --project-name makan-management-panel --env-file .env.docker up -d --wait --wait-timeout 240
```

سپس [صفحه ورود](http://127.0.0.1:3101/login) را باز کنید. این دستور نسخه ساخته‌شده را اجرا می‌کند؛ در اجرای روزمره ساخت دوباره لازم نیست. فایل خصوصی `.env.docker` در نصب موجود را بازنویسی نکنید.

بعد از تغییر کد، نصب اولیه یا دریافت نسخه جدید، ساخت و اجرا را با این دستور انجام دهید:

```powershell
docker compose --project-name makan-management-panel --env-file .env.docker up -d --build --force-recreate --wait --wait-timeout 240
```

ساخت نخست و به‌روزرسانی ممکن است چند دقیقه طول بکشد. دانلود وابستگی‌ها و ساخت داخل Docker به سرعت شبکه و منابع Docker Desktop وابسته‌اند. تا نمایش `Healthy` صبر کنید؛ `--wait-timeout` زمان انتظار سلامت کانتینر است، نه سقف زمان ساخت. این حداکثر مهلت است؛ به‌محض آماده‌بودن سرویس، فرمان زودتر تمام می‌شود.

## آماده‌سازی روی رایانه تازه

پیش‌نیاز Docker: Docker Desktop، WSL2 و Linux containers. برای اجرای Docker نیازی به نصب Node.js روی میزبان یا دیتابیس محلی نیست. بک‌اند فعلی روی `http://94.184.32.84` اجرا می‌شود.

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
| `MAKAN_PORT`                           | `3101`                                                                                    |
| `APP_ORIGIN`                           | `http://127.0.0.1:3101`                                                                   |
| `BACKEND_BASE_URL`                     | `http://94.184.32.84`                                                                |
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
docker compose --project-name makan-management-panel --env-file .env.docker ps
# لاگ؛ Ctrl+C فقط نمایش لاگ را می‌بندد
docker compose --project-name makan-management-panel --env-file .env.docker logs -f --tail 100 web
# توقف با حفظ نشست‌ها
docker compose --project-name makan-management-panel --env-file .env.docker down
# اجرای دوباره نسخه موجود
docker compose --project-name makan-management-panel --env-file .env.docker up -d --wait --wait-timeout 240
# اعمال تغییر تنظیمات بدون ساخت دوباره کد
docker compose --project-name makan-management-panel --env-file .env.docker up -d --force-recreate --wait --wait-timeout 240
```

برای تغییر پورت، `MAKAN_PORT` و پورت `APP_ORIGIN` را با هم در `.env.docker` تغییر دهید، سپس کانتینر را با `--force-recreate` بالا بیاورید. برای مثال هر دو را روی 3010 تنظیم کنید و `http://127.0.0.1:3010/login` را باز کنید. `restart` فایل env جدید را نمی‌خواند.

## اجرا بدون Docker

Node.js نسخه ۲۲ یا جدیدتر و npm لازم است. فقط در نصب تازه، `.env.example` را در `.env.local` کپی کنید و `SESSION_SECRET` را با کلید تصادفی ۶۴ کاراکتر hex پر کنید. برای تولید کلید روی رایانه خودتان:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm ci
npm run dev
```

`APP_ORIGIN` باید با نشانی اجرا یکسان باشد. اجرای بدون Docker به‌صورت پیش‌فرض روی پورت 3000 و Docker مدیریت روی پورت 3101 است. برای توسعه روی پورت جدا، `APP_ORIGIN` در `.env.local` را به `http://127.0.0.1:3100` تغییر دهید و اجرا کنید:

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

آزمون استقرار با Python 3، OpenSSL، Nginx و CLI مربوط به Docker Compose، بدون نیاز به روشن‌بودن Docker daemon:

```bash
python3 tests/deployment/test_setup.py
```

این آزمون در پوشه‌های موقت و پورت‌های محلی آزمایشی اجرا می‌شود؛ نصب بسته‌ها، تغییر سرویس‌ها و عملیات Docker شبیه‌سازی می‌شوند. فایل‌های واقعی Nginx یا env تغییر نمی‌کنند. در صورت نبود Nginx روی PATH، مسیر باینری آن را در `MAKAN_TEST_NGINX_BIN` تنظیم کنید.

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
