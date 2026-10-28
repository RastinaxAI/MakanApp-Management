"""Generate the owner guide and change report using the previous project report's layout."""
import json
import sys
import re
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'docx'
OUT.mkdir(parents=True, exist_ok=True)

def new_document():
    doc = Document(ROOT / 'reports' / 'MakanApp_Work_Report.docx')
    body = doc._element.body
    for child in list(body):
        if child.tag != qn('w:sectPr'):
            body.remove(child)
    for name, size in [('Normal', 11), ('Title', 18), ('Heading 1', 12), ('Subtitle', 11)]:
        style = doc.styles[name]
        style.font.name = 'Tahoma'
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.font.italic = False
        pf = style.paragraph_format
        pf.line_spacing = 1.25
        pf.space_after = Pt(6)
    doc.core_properties.author = ''
    doc.core_properties.last_modified_by = ''
    return doc

def p(doc, text, style=None, ltr=False, size=None):
    para = doc.add_paragraph(style=style)
    para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pp = para._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi'); bidi.set(qn('w:val'), '0' if ltr else '1'); pp.append(bidi)
    token = r'[./]?[A-Za-z0-9_][A-Za-z0-9_./:{}\[\]=+"\-]*'
    parts = [text] if ltr else re.split(f'({token}(?: +{token})*)', text)
    for part in filter(None, parts):
        latin = ltr or bool(re.match(r'[A-Za-z0-9_./]', part))
        r = para.add_run(part)
        r.font.name = 'Tahoma'
        r.font.italic = False
        r.font.bold = style in ('Title', 'Heading 1')
        rp = r._r.get_or_add_rPr()
        rf = rp.get_or_add_rFonts()
        for attr in ('ascii', 'hAnsi', 'cs', 'eastAsia'):
            rf.set(qn('w:' + attr), 'Tahoma')
        rtl = OxmlElement('w:rtl'); rtl.set(qn('w:val'), '0' if latin else '1'); rp.append(rtl)
        bold = OxmlElement('w:bCs'); bold.set(qn('w:val'), '1' if r.font.bold else '0'); rp.append(bold)
        italic = OxmlElement('w:iCs'); italic.set(qn('w:val'), '0'); rp.append(italic)
        if size:
            r.font.size = Pt(size)
        actual_size = size or (18 if style == 'Title' else 12 if style == 'Heading 1' else 11)
        sz = OxmlElement('w:szCs'); sz.set(qn('w:val'), str(actual_size * 2)); rp.append(sz)
        lang = OxmlElement('w:lang')
        lang.set(qn('w:bidi'), 'en-US' if latin else 'fa-IR')
        lang.set(qn('w:val'), 'en-US' if latin else 'fa-IR')
        rp.append(lang)
    if ltr:
        para.paragraph_format.space_after = Pt(3)
    return para

def heading(doc, text):
    return p(doc, text, 'Heading 1')

guide = new_document()
guide.core_properties.title = 'راهنمای استفاده از پنل مالک ماکان'
p(guide, 'راهنمای استفاده از پنل مالک ماکان', 'Title')
p(guide, 'نسخه ۲ آبان ۱۴۰۵', size=10)
p(guide, 'این راهنما روش ورود و بررسی پنل اختصاصی مالک پلتفرم را توضیح می‌دهد. اتصال به محیط تست تنظیم شده است؛ فعال‌شدن ورود واقعی به تعیین کلید نقش مالک از طرف بک‌اند و داشتن حساب مجاز نیاز دارد.')
heading(guide, 'روش ورود')
p(guide, '۱. برنامه را اجرا کنید و صفحه ورود را در آدرس زیر باز کنید.')
p(guide, 'http://127.0.0.1:3000/login', ltr=True)
p(guide, '۲. شماره همراه حساب مالک را وارد کنید و «دریافت کد ورود» را بزنید. سپس کد معتبر را وارد و «تأیید و ورود» را انتخاب کنید. بنا بر اعلام شما، کد محیط تست 123456 است؛ تأیید آن همچنان بر عهده API است و فرانت آن را ثابت یا خودکار قبول نمی‌کند.')
p(guide, '۳. سرور پس از تأیید کد، هویت پلتفرمی و نقش مالک را بررسی می‌کند. فقط حساب تأییدشده وارد پنل می‌شود. حساب‌های مدیر مدرسه، معلم، والد، دانش‌آموز و مدیر پلتفرمی غیرمالک رد می‌شوند.')
p(guide, '۴. برای پایان کار از منوی حساب، «خروج از حساب» را بزنید. در صورت لغو نقش مالک، درخواست بعدی مسدود و نشست محلی حذف می‌شود.')
heading(guide, 'مجوز صفحات و عملیات')
p(guide, 'مالک‌بودن به‌تنهایی همه قابلیت‌ها را باز نمی‌کند. هر منو و عملیات به مجوز برگشتی بک‌اند و نگاشت تأییدشده آن نیاز دارد. نبود مجوز، دسترسی مستقیم به API را نیز مسدود می‌کند. فضای مدرسه فقط با عضویت و زمینه دسترسی معتبر همان سازمان باز می‌شود.')
heading(guide, 'مرور نمایشی بدون حساب')
p(guide, 'برای بررسی ظاهر صفحات، «مشاهده نسخه نمایشی بدون حساب» را بزنید یا آدرس زیر را باز کنید. بنر دائمی داده‌های آزمایشی مشخص است؛ این حالت فقط خواندنی است و هیچ نشست واقعی یا درخواست API ایجاد نمی‌کند.')
p(guide, 'http://127.0.0.1:3000/demo/admin', ltr=True)
heading(guide, 'پیام‌های قابل انتظار')
p(guide, '«فقط برای مالک پلتفرم»: این حساب مجاز نیست و باید با حساب مالک وارد شوید. «ورود مالک هنوز پیکربندی نشده»: مسئول راه‌اندازی باید کلید واقعی نقش را ثبت کند. خطای سرویس، دسترسی ایجاد نمی‌کند؛ پس از رفع اختلال دوباره تلاش کنید.')

guide.add_page_break()
p(guide, 'راهنمای راه‌اندازی و پذیرش اتصال', 'Title')
heading(guide, 'تنظیمات مسئول فنی')
p(guide, 'در پوشه پروژه، وابستگی‌ها را با npm ci نصب کنید. برای راه‌اندازی جدید، .env.example را به .env.local کپی و SESSION_SECRET را با مقدار تصادفی ۳۲ بایتی hex تنظیم کنید. فایل محیط موجود را بدون پشتیبان بازنویسی نکنید.')
p(guide, 'BACKEND_BASE_URL=http://94.184.32.84:8090', ltr=True, size=10)
p(guide, 'APP_ORIGIN=http://127.0.0.1:3000', ltr=True, size=10)
p(guide, 'PLATFORM_OWNER_ROLE_KEYS=[]', ltr=True, size=10)
p(guide, 'کلید دقیق نقش مالک را از پاسخ مجاز roles در GET /api/admin/v1/me و کاتالوگ GET /api/admin/v1/roles تأیید کنید و در آرایه بالا قرار دهید. مقدار [] عمداً ورود و ارسال OTP را می‌بندد. نام واقعی در سند و OpenAPI عمومی مشخص نشده؛ هیچ نامی برای آن حدس زده نشده است.')
p(guide, 'وجود platform.access در permissions نیز الزامی است. برای هر قابلیت، PERMISSION_BINDINGS را با نگاشت رسمی METHOD و مسیر به permission تنظیم کنید. مقدار خالی، قابلیت‌های تأییدنشده را می‌بندد؛ نقش مالک این محدودیت را دور نمی‌زند. پس از تغییر متغیرها، برنامه را دوباره اجرا کنید.')
p(guide, 'npm run dev', ltr=True, size=10)
p(guide, 'برای بررسی نسخه ساخت‌شده، ابتدا npm run build و سپس npm start را اجرا کنید. مقدار APP_ORIGIN باید دقیقاً با آدرس مرورگر یکسان باشد؛ localhost و 127.0.0.1 متفاوت‌اند.')
heading(guide, 'روند کنترل دسترسی')
p(guide, 'توکن OTP فقط در سرور دریافت می‌شود. پیش از ایجاد cookie، پاسخ PlatformMeResult اعتبارسنجی و userId آن با حساب واردشده تطبیق داده می‌شود. پاسخ‌های 401 و 403، نقش نامعتبر، نبود مجوز یا پاسخ ناقص، پنل را باز نمی‌کنند. درخواست خروج برای نشست بالادست ردشده ارسال می‌شود؛ موفقیت آن به پاسخ API وابسته است.')
p(guide, 'صفحات محافظت‌شده، API نشست و تمام درخواست‌های BFF دوباره مالک‌بودن را از بک‌اند بررسی می‌کنند. پاسخ‌های خطا با داده نمایشی جایگزین نمی‌شوند. MFA پلتفرم از OTP ورود جدا باقی مانده است.')
heading(guide, 'پذیرش نهایی محیط واقعی')
p(guide, 'با حساب‌های آزمایشی مجاز، ورود موفق مالک و رد هر چهار نقش مدرسه و نقش پلتفرمی غیرمالک را بررسی کنید؛ سپس لغو نقش حین نشست، دسترسی مستقیم به صفحات و API و مجوز مستقل هر عملیات را امتحان کنید. آزمون دارای نشست زنده هنوز انجام نشده است؛ شماره همراه مالک و کلید نقش تأییدشده ارائه نشده‌اند.')
p(guide, 'اتصال فعلی به بک‌اند HTTP است. برای استقرار نهایی، HTTPS یا مسیر شبکه امن، cookie امن و تنظیمات نشست مطابق docs/deployment.md لازم است. این تحویل شامل انتشار خارجی یا تغییر بک‌اند نیست.')
guide.save(OUT / 'MakanApp_Owner_User_Guide.docx')
if '--guide-only' in sys.argv:
    print('Created owner user guide')
    sys.exit(0)

evidence = json.loads((ROOT / 'docs' / 'owner-test-summary.json').read_text(encoding='utf-8-sig'))
if evidence['productionBuild'] != 'passed' or evidence['browser']['failed'] != 0:
    raise RuntimeError('Final report requires successful validation evidence')

report = new_document()
report.core_properties.title = 'گزارش پیاده‌سازی ورود اختصاصی مالک ماکان'
p(report, 'گزارش پیاده‌سازی ورود اختصاصی مالک ماکان', 'Title')
p(report, 'تاریخ گزارش ۲ آبان ۱۴۰۵', size=10)
p(report, 'ورود پنل به حساب مالک پلتفرم محدود شد و اتصال سروری به محیط تست پورت ۸۰۹۰ تنظیم شد. منطق دسترسی با راهنمای Platform Owner تطبیق داده شد. فعال‌سازی ورود زنده منتظر کلید دقیق نقش مالک و حساب آزمایشی مجاز است.')
heading(report, 'تغییرات انجام‌شده')
for text in [
    '۱. دریافت OpenAPI زنده، مقایسه قرارداد و تولید مجدد نوع‌ها و ماتریس API؛ قرارداد شامل ۲۹۰ مسیر و ۵۵۴ schema است و ۱۱۴ عملیات منتخب در برنامه ثبت شده‌اند.',
    '۲. افزودن کنترل سروری پس از OTP و پیش از ایجاد نشست؛ تطبیق userId، نقش دقیق مالک و مجوز platform.access. نام نقش از پیکربندی سرور خوانده می‌شود و مقدار نامشخص باعث بسته‌ماندن ورود است.',
    '۳. تکرار کنترل در صفحات، API نشست و تمام درخواست‌های BFF؛ لغو نقش مالک، نشست محلی را حذف می‌کند. نقش‌های مدرسه و مدیر پلتفرمی غیرمالک اجازه ورود ندارند.',
    '۴. حفظ کنترل جداگانه مجوز هر منو و اقدام و زمینه عضویت سازمان؛ تغییر متن صفحه ورود و پیام خطای فارسی، همراه با حفظ نسخه نمایشی مستقل و فقط خواندنی.',
    '۵. افزودن آزمون‌های مالک و غیرمالک، تطبیق هویت، لغو نقش و دسترسی مستقیم؛ به‌روزرسانی راهنمای نصب، اتصال و مستندات تحویل.',
]:
    p(report, text)
heading(report, 'نتیجه آزمون‌ها')
unit = evidence['unit']['passed']
browser = evidence['browser']['passed']
digits = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')
p(report, f'{str(unit).translate(digits)} تست واحد و {str(browser).translate(digits)} سناریوی مرورگر با بک‌اند آزمایشی پاس شدند. بررسی TypeScript و ساخت نسخه نهایی موفق بود. سناریوهای مرورگر شامل رد نقش‌های غیرمالک، مجوز مستقل عملیات، لغو نقش، مسیرهای قبلی و نسخه نمایشی در موبایل و دسکتاپ است.')
p(report, 'Swagger و OpenAPI زنده پاسخ 200 دادند؛ سه درخواست بدون ورود به مسیرهای هویت و کاتالوگ نقش‌ها پاسخ 401 با کد AUTH_REQUIRED داشتند. هیچ OTP یا عملیات تغییردهنده‌ای روی سرویس واقعی اجرا نشد.')
heading(report, 'موارد باقی‌مانده برای بهره‌برداری')
p(report, 'کلید نقش مالک باید توسط بک‌اند تأیید و در PLATFORM_OWNER_ROLE_KEYS ثبت شود؛ مقدار فعلی [] است. نگاشت رسمی مجوز عملیات نیز باید تکمیل شود. سپس آزمون ورود زنده با شماره مالک انجام می‌شود. کد ثابت تست اعلام شده، اما شماره حساب ارائه نشده است. استقرار نهایی به اتصال امن و تنظیمات نشست نیاز دارد؛ انتشار خارجی انجام نشده است.')
report.save(OUT / 'MakanApp_Owner_Implementation_Report.docx')
print('Created owner user guide and implementation report')
