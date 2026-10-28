from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parent
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.5), Inches(11)
sec.top_margin, sec.bottom_margin = Inches(.68), Inches(.65)
sec.left_margin = sec.right_margin = Inches(.78)
sec.header_distance = sec.footer_distance = Inches(.3)

def font_style(style, size, bold=False):
    style.font.name = 'Tahoma'
    style.font.size = Pt(size)
    style.font.bold = bold
    style.font.italic = False
    style.font.color.rgb = RGBColor(0, 0, 0)
    rp = style.element.get_or_add_rPr()
    rf = rp.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts'); rp.append(rf)
    for key in list(rf.attrib):
        if 'Theme' in key: del rf.attrib[key]
    for attr in ('ascii', 'hAnsi', 'cs', 'eastAsia'):
        rf.set(qn('w:' + attr), 'Tahoma')
    sz = OxmlElement('w:szCs'); sz.set(qn('w:val'), str(size * 2)); rp.append(sz)
    if bold:
        b = OxmlElement('w:bCs'); rp.append(b)

for name, size, bold in [('Normal', 11, False), ('Title', 19, True), ('Subtitle', 12, False), ('Heading 1', 12, True)]:
    font_style(doc.styles[name], size, bold)
    pf = doc.styles[name].paragraph_format
    pf.line_spacing = 1.3
    pf.space_after = Pt(6)
    pp = doc.styles[name].element.get_or_add_pPr()
    borders = pp.find(qn('w:pBdr'))
    if borders is not None: pp.remove(borders)
doc.styles['Heading 1'].paragraph_format.space_before = Pt(10)
doc.styles['Heading 1'].paragraph_format.space_after = Pt(5)
doc.styles['Title'].paragraph_format.space_after = Pt(5)

def para(text, style=None, before=None, after=None):
    p = doc.add_paragraph(style=style)
    # Word mirrors physical justification in a bidi paragraph.
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    ppr = p._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi'); ppr.append(bidi)
    r = p.add_run(text)
    rp = r._r.get_or_add_rPr()
    rf = OxmlElement('w:rFonts')
    for attr in ('ascii', 'hAnsi', 'cs', 'eastAsia'):
        rf.set(qn('w:' + attr), 'Tahoma')
    rp.append(rf)
    rtl = OxmlElement('w:rtl'); rp.append(rtl)
    lang = OxmlElement('w:lang'); lang.set(qn('w:bidi'), 'fa-IR'); lang.set(qn('w:val'), 'fa-IR'); rp.append(lang)
    if before is not None: p.paragraph_format.space_before = Pt(before)
    if after is not None: p.paragraph_format.space_after = Pt(after)
    return p

para('گزارش خلاصه فعالیت‌های پروژه ماکان', 'Title')
para('طراحی و پیاده‌سازی پنل مدیریت MakanApp', 'Subtitle')
p = para('تاریخ تنظیم گزارش  ۳۰ مهر ۱۴۰۵', after=12)
p.runs[0].font.size = Pt(10)

para('نسخه اولیه پنل مدیریت و حالت نمایشی مستقل آماده بررسی است. فعالیت‌های این مرحله شامل تحلیل قراردادهای سرویس، پیاده‌سازی رابط و زیرساخت دسترسی، آزمون و تهیه مستندات بوده است. پذیرش اتصال زنده پس از فراهم‌شدن حساب آزمایشی انجام می‌شود.')

para('فعالیت‌های انجام‌شده', 'Heading 1')
items = [
    '۱. بررسی سند تحویل و قرارداد OpenAPI سرور و تدوین فهرست صفحات، عملیات API، مجوزها و ابهام‌های نیازمند پیگیری از تیم بک‌اند.',
    '۲. راه‌اندازی پروژه با Next.js و TypeScript و ساخت رابط فارسی راست‌به‌چپ، با حالت روشن و تیره و چیدمان متناسب با موبایل، تبلت و دسکتاپ.',
    '۳. پیاده‌سازی جریان ورود با رمز یک‌بارمصرف، مدیریت نشست و نگهداری رمزگذاری‌شده توکن‌ها در سرور؛ جداسازی دسترسی مدیریت پلتفرم و مدیریت سازمان.',
    '۴. توسعه صفحات سازمان‌ها، کاربران، نقش‌ها، آموزش، اشتراک و امور مالی، عملیات و سوابق رویدادها؛ همچنین مدیریت افراد، کلاس‌ها، ثبت‌نام، حضور و گزارش‌های سازمانی.',
    '۵. افزودن حالت نمایشی بدون حساب با داده‌های آزمایشی و نشان دائمی؛ امکان مرور صفحات، جست‌وجو و فیلتر، بدون تماس با سرویس واقعی یا ثبت تغییرات.',
    '۶. تهیه راهنمای فارسی نصب و اجرا، ماتریس صفحات و API و مستندات استقرار، آزمون‌ها و محدودیت‌های باقی‌مانده.'
]
for item in items:
    p = para(item, after=6)
    p.paragraph_format.keep_together = True

para('نتایج بررسی و آزمون', 'Heading 1')
para('ساخت نسخه نهایی و بررسی TypeScript موفق بوده و ۲۸ تست واحد پاس شده است. ۱۹ سناریوی مرورگر با سرور آزمایشی و ۵ سناریوی حالت نمایشی بررسی شدند؛ ایراد چیدمان موبایل اصلاح و آزمون مرتبط دوباره با موفقیت اجرا شد. در حالت نمایشی هیچ درخواست API یا نشست واقعی ایجاد نشد.')

para('اقدام‌های بعدی', 'Heading 1')
para('ساخت حساب آزمایشی مجاز برای آزمون ورود و عملیات واقعی، دریافت نگاشت رسمی مجوزها و تأیید اتصال امن به بک‌اند لازم است. نسخه فعلی برای بررسی محلی و مرور نمایشی آماده است؛ تأیید بهره‌برداری واقعی و انتشار روی میزبان خارجی هنوز انجام نشده است.')

doc.core_properties.title = 'گزارش خلاصه فعالیت‌های پروژه ماکان'
doc.core_properties.subject = 'گزارش فعالیت طراحی و پیاده‌سازی پنل مدیریت'
doc.core_properties.author = ''
doc.core_properties.last_modified_by = ''
doc.core_properties.keywords = 'MakanApp, گزارش کار'
path = ROOT / 'MakanApp_Work_Report.docx'
doc.save(path)
print(path)
