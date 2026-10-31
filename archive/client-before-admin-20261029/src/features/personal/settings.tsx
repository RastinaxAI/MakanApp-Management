'use client';
import Link from 'next/link';
import { ArrowRight, Ban, ChevronLeft, Moon, Palette, ShieldCheck, Sun } from 'lucide-react';
import { useThemePreference } from './theme';
import { Button } from '@/components/ui/button';
import s from './personal.module.css';
export function PersonalSettings() {
  return (
    <>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>حساب من</span>
          <h1>تنظیمات</h1>
          <p>برنامه را متناسب با خودتان تنظیم کنید.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/personal/profile">
            <ArrowRight size={18} />
            حساب من
          </Link>
        </Button>
      </div>
      <section className={s.settingsList} aria-label="بخش‌های تنظیمات">
        {[
          {
            href: '/personal/settings/appearance',
            title: 'ظاهر برنامه',
            description: 'انتخاب حالت روشن یا تاریک',
            icon: Palette,
          },
          {
            href: '/personal/settings/privacy',
            title: 'حریم خصوصی',
            description: 'پیام مستقیم، شمارهٔ همراه و آخرین بازدید',
            icon: ShieldCheck,
          },
          {
            href: '/personal/settings/blocked',
            title: 'حساب‌های مسدودشده',
            description: 'مشاهده و رفع مسدودی حساب‌ها',
            icon: Ban,
          },
        ].map((item) => (
          <Link href={item.href} key={item.href}>
            <span className={s.settingIcon}>
              <item.icon size={23} />
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <ChevronLeft size={20} />
          </Link>
        ))}
      </section>
    </>
  );
}
export function AppearanceSettings() {
  const { theme, changeTheme, error } = useThemePreference();
  return (
    <>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>تنظیمات</span>
          <h1>ظاهر برنامه</h1>
          <p>انتخاب شما روی همین مرورگر ذخیره می‌شود.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/personal/settings">
            <ArrowRight size={18} />
            تنظیمات
          </Link>
        </Button>
      </div>
      <fieldset className={s.themeOptions}>
        <legend>حالت نمایش</legend>
        {(
          [
            { value: 'light', title: 'روشن', icon: Sun },
            { value: 'dark', title: 'تاریک', icon: Moon },
          ] as const
        ).map((item) => (
          <label
            key={item.value}
            className={`${s.themeOption} ${theme === item.value ? s.themeSelected : ''}`}
          >
            <input
              type="radio"
              name="appearance"
              value={item.value}
              checked={theme === item.value}
              onChange={() => changeTheme(item.value)}
            />
            <span
              className={`${s.themeMiniature} ${item.value === 'dark' ? s.themeMiniatureDark : ''}`}
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
            </span>
            <strong>
              <item.icon size={19} />
              {item.title}
            </strong>
          </label>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </>
  );
}
