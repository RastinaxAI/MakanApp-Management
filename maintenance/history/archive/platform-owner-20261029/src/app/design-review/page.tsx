import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrandMark } from '@/components/ui/brand';
import { directions, directionInfo, isReviewEnabled } from '@/features/design-review/model';
import styles from '@/features/design-review/review.module.css';
export const dynamic = 'force-dynamic';
export default function DesignReviewIndex() {
  if (!isReviewEnabled(process.env.MAKAN_DESIGN_REVIEW)) notFound();
  return (
    <main className={styles.index} dir="rtl">
      <header className={styles.indexTop}>
        <div className={styles.brand}>
          <BrandMark />
          <strong>ماکان</strong>
          <span>اتاق طراحی</span>
        </div>
        <span className={styles.sampleBadge}>نمونهٔ توسعه · بدون اتصال به سرویس</span>
      </header>
      <section className={styles.indexIntro}>
        <span className={styles.eyebrow}>یک برند، سه تجربه</span>
        <h1>ماکانِ بعدی را با هم انتخاب کنیم.</h1>
        <p>
          دو کار یکسان، در سه چیدمان متفاوت: مدیریت پلن‌ها و پیام‌رسان. لوگو، فونت، رنگ اصلی و
          داده‌ها ثابت‌اند؛ ناوبری و اولویت اطلاعات تغییر می‌کنند.
        </p>
      </section>
      <div className={styles.directionGrid}>
        {directions.map((direction) => {
          const info = directionInfo[direction];
          return (
            <article key={direction} className={styles.directionCard}>
              <div className={`${styles.miniature} ${styles[direction]}`} aria-hidden="true">
                <div className={styles.miniNav} />
                <div className={styles.miniMain}>
                  <i />
                  <div>
                    <b />
                    <b />
                    <b />
                  </div>
                  <em />
                  <em />
                  <em />
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.row}>
                  <span className={styles.eyebrow}>
                    {info.number} / {info.name}
                  </span>
                  {direction === 'atlas' && <span className={styles.recommended}>پیشنهاد ما</span>}
                </div>
                <h2>{info.label}</h2>
                <p>{info.description}</p>
                <p className={styles.fine}>
                  <strong>مزیت:</strong> {info.strength}
                </p>
                <p className={styles.fine}>
                  <strong>محدودیت:</strong> {info.limitation}
                </p>
                <div className={styles.previewLinks}>
                  <Link className={styles.primary} href={`/design-review/${direction}/plans`}>
                    مدیریت پلن‌ها
                  </Link>
                  <Link className={styles.secondary} href={`/design-review/${direction}/messenger`}>
                    پیام‌رسان
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <section className={styles.reviewNote}>
        <h2>چطور مقایسه کنیم؟</h2>
        <p>
          در هر نمونه جستجو، فیلتر، جزئیات پلن، ساخت پیش‌نویس و گفت‌وگوی محلی را امتحان کنید. از
          نوار بالای صفحه وضعیت‌های بارگذاری، خالی، خطا و پایان دسترسی را ببینید. هیچ پیام یا تغییری
          به سرور ارسال نمی‌شود. قیمت، سهمیه و سیاست‌های باز محصول در این نمونه تعیین نشده‌اند.
        </p>
        <p>
          <strong>پیشنهاد: اطلس.</strong> جدول خوانا برای مدیران و چیدمان آشنای پیام‌رسان، با الگوی
          فهرست و جزئیات در موبایل، تعادل مناسب‌تری دارد. انتخاب نهایی هنوز انجام نشده است.
        </p>
      </section>
    </main>
  );
}
