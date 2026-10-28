# ماتریس صفحات و اقدام‌های رابط

وضعیت جاری ۲۴ اکتبر: ۵۵ نگاشت صریح عملیات از قرارداد جدید همراه برنامه شده‌اند و دیگر به پرکردن دستی همه PERMISSION_BINDINGS نیاز نیست. هر عملیات فقط با permission واقعی حساب فعال است؛ reset مدیریتی MFA بدون نگاشت تأییدشده بسته می‌ماند. ایجاد سازمان اکنون مسیر مرحله‌ای با انتخاب کاربر/پلن، بازبینی و رسید قابل پیگیری دارد. فیلترهای شناسه مرتبط و فرم‌های پلتفرمی از انتخاب‌گر استفاده می‌کنند. جدول زیر سابقه پوشش مسیرهاست و عبارت‌های «نگاشت باز» باید با این به‌روزرسانی خوانده شوند.

تمام نام‌های permission عملیاتی پلتفرم در انتظار نگاشت رسمی‌اند؛ به جای حدس‌زدن در این جدول نوشته نشده‌اند. کلید هر عملیات دقیقاً به `PERMISSION_BINDINGS` و سپس عضویت در `permissions[]` حساب وصل می‌شود. Context سازمانی در سرور باید `Organization + Manager` باشد. backend مجوز نهایی را دوباره بررسی می‌کند.

| صفحه / هدف | Context و دسترسی | Method و خانواده مسیر واقعی | فرم / همزمانی | وضعیت اتصال |
|---|---|---|---|---|
| `/login` ورود OTP | حساب؛ بدون ارسال خودکار OTP | POST `/api/v1/auth/otp/challenges`, `/verify` | شماره/کد، ارقام فارسی، انقضا و resend از UTC سرور | ساخته‌شده؛ با Backend تست جدا بررسی می‌شود |
| `/admin` نمای کلی | پلتفرم؛ هر metric مجوز GET خودش را دارد | GET organizations/users/education/classes/moderation/cases و health | فقط totalCount؛ خطا صفر نمی‌شود؛ روند ساختگی ندارد | اتصال نوشته شده؛ پذیرش زنده نیازمند حساب |
| `/admin/organizations` فهرست و ایجاد | permission مستقل list و provisioning | GET organizations، POST provisioning | clientOperationId ثابت در همان فرم؛ مرحله request.status جدا از HTTP موفق | ساخته‌شده؛ نگاشت permission باز |
| `/admin/organizations/{id}` | permission مستقل detail و هر action | GET detail/suspension-impact، POST suspend/reactivate | تعلیق فقط پس از impact موفق؛ reason؛ بدون version فرضی | ساخته‌شده؛ نگاشت permission باز |
| تب اعضای سازمان | permission مستقل هر action | GET memberships، POST invitations، PUT membership/role، DELETE membership | fromRole/toRole، expiresAtUtc، reason؛ بدنه DELETE حفظ می‌شود | ساخته‌شده؛ نگاشت permission باز |
| تب کلاس‌های سازمان | permission GET کلاس‌ها | GET education/classes با organizationId ثابت | فیلتر و pagination واقعی | ساخته‌شده |
| `/admin/users` و `{id}` | permission مستقل list/detail/actions | GET users/detail، POST suspend/reactivate/session revoke | maskedPhone بدون بازسازی؛ دلیل برای actionها؛ همه/تک نشست | ساخته‌شده؛ پذیرش زنده باز |
| سن ارتباطی و reset MFA کاربر | permissionهای مستقل و step-up معتبر | communication-age، verifications/resolve، mfa/users/{id}/reset | expectedVersion فقط در DTO سن؛ reason برای reset | ساخته‌شده؛ code واقعی step-up باز |
| `/admin/education` و `{classId}` | GET هر read model مستقل | classes/detail، teachers/enrollments/assignments/exams | آرایه untyped فراگیر استفاده نمی‌شود؛ ثبت‌نام‌ها نوع‌دار؛ truncated آشکار | ساخته‌شده؛ هیچ mutation پلتفرمی آموزشی اضافه نشده |
| `/admin/roles` | کاتالوگ و انتساب مجوزهای جدا | GET roles/role-assignments، POST assignment، DELETE assignment | roleKey از کاتالوگ؛ reason و handling تعارض آخرین مالک | ساخته‌شده؛ نگاشت permission باز |
| `/admin/moderation` و `{caseId}` | permission مجزا برای جزئیات، زمینه، اقدام، evidence | GET cases/detail/evidence، POST start-review/actions/resolve/dismiss/enforce/expanded-context | expectedVersion opaque، reason، یادداشت؛ step-up بدون replay خودکار | ساخته‌شده؛ پذیرش واقعی شواهد و code باز |
| `/admin/messaging` | permission metadata | GET messaging/conversations | فقط metadata؛ route متن خصوصی در allowlist نیست | ساخته‌شده |
| `/admin/commerce` و `{planId}` | permission جدا برای هر بخش | plans/detail/versions/publish/subscriptions/provisioning | version فقط publish؛ entitlements/quotas به صورت ردیف فرم | ساخته‌شده؛ checkout واقعی غیرفعال |
| تغییر اشتراک در جزئیات سازمان | permission override مستقل | POST commerce/organizations/{id}/subscription-override | planVersionId/endsAtUtc/reason | ساخته‌شده |
| `/admin/finance` و `{orderId}` | permission read مستقل | GET finance/orders/detail | currency از سرور؛ بدون حدس ریال/تومان | ساخته‌شده |
| `/admin/operations` | مجوز مستقل health/notifications/jobs | GET operations/* | read-only؛ restart/retry/cancel خیالی وجود ندارد | ساخته‌شده |
| `/admin/audit` | permission audit read | GET audit-logs | فیلترهای واقعی؛ نتیجه عددی بدون تفسیر حدسی enum | ساخته‌شده |
| `/admin/account` | حساب جاری؛ MFA فقط حساب پلتفرم معتبر | GET me/auth/sessions/mfa، PATCH me/profile، POST/DELETE جلسات، MFA enrollment/confirm/verify/recovery/regenerate | اطلاعات محرمانه MFA فقط حافظه موقت؛ status cache فاقد secret | ساخته‌شده؛ پذیرش MFA واقعی باز |
| انتخاب فضای کاری | نشست معتبر | GET workspaces/me/current، POST select | Personal/Organization واقعی؛ membershipId/role؛ revision سرور و لغو cache بین تب‌ها | ساخته‌شده؛ با Backend تست جدا بررسی می‌شود |
| `/organization` | Context Manager | GET dashboards/manager | فقط داده‌های نوع‌دار؛ sessionsMissingMeetingLink مبهم کنار گذاشته شده | ساخته‌شده |
| `/organization/people` و `{id}` | Context Manager و مجوز Backend | GET/POST people، GET/PATCH detail، POST end/invitations/revoke | clientOperationId، expectedRowVersion و expectedPersonRowVersion مطابق DTO؛ canEditNames رعایت می‌شود | ساخته‌شده؛ لیست مستقل دعوت‌ها gap دارد |
| `/organization/guardians` و `{id}` | Context Manager و مجوز Backend | GET/POST guardian-relations، GET detail، POST activate/end/revoke | expectedRowVersion/reason؛ بدون گسترش مجوز چت خصوصی | ساخته‌شده |
| `/organization/classes` و `{id}` | Context Manager و مجوز Backend | GET/POST classes، POST periods/courses، teachers/enrollments/end، sessions/schedule-rules | انواع شناسه جدا؛ رسید ایجاد قابل کپی؛ ending از رسید و گزارش ثبت‌نام | ساخته‌شده؛ کاتالوگ دوره/درس و انتساب‌های قدیمی gap دارند |
| `/organization/schedule` و `/sessions/{id}` | Context Manager و مجوز Backend | GET schedule/session/attendance، PATCH session/attendance، PUT attendance، POST complete/cancel | rowVersion opaque؛ اصلاح حضور با reason؛ تغییر برنامه از رسید الگو | ساخته‌شده |
| `/organization/reports` | Context Manager و مجوز Backend | GET reports/manager/enrollments/attendance/assessments/teacher-workload/classes/{id} | پارامترهای **Case-sensitive** جاری مانند PageNumber و ClassId حفظ می‌شوند | ساخته‌شده |

حالت‌های مشترک: Loading، Empty، Error، Forbidden، Offline، Rate Limited با زمان انتظار، Session Expired. فرم‌ها علاوه بر این، Conflict 409/412 و رد سیاست 422 دارند. unknown enum در مرز schema به خطای قرارداد منجر می‌شود و هرگز وضعیت موفق یا permission مثبت تلقی نمی‌شود.

نوع Request/Response، required/nullable و enum دقیق هر ردیف در `api-matrix.md` و snapshot و typeهای generated ثبت شده‌اند. «ساخته‌شده» به معنای تأیید موفقیت عملیاتی Backend یا provider نیست.
