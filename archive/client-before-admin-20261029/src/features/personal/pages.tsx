'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageCircle,
  UserRound,
  BookOpen,
  Sparkles,
  Wallet,
  GraduationCap,
  Pencil,
  ShieldCheck,
  LogOut,
  Settings,
} from 'lucide-react';
import { usePersonal, usePersonalApi } from './provider';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton, label } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import s from './personal.module.css';
import { ageVerificationLabels, ageCategoryLabels, messagingNextLabels } from './status-labels';
import { ProfileAvatar, ProfilePhotoEditor } from './profile-photo';
import { displayDateOnly, localToday, profilePatch } from './profile-model';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';

export function PersonalHome() {
  const { session } = usePersonal();
  const spaces =
    usePersonalApi<components['schemas']['WorkspaceResult'][]>('/api/v1/workspaces/me');
  const organizationCount = spaces.data
    ? new Set(spaces.data.filter((w) => w.organizationId).map((w) => w.organizationId)).size
    : null;
  const cards = [
    {
      title: 'پیام‌ها و مخاطبین',
      description: 'گفت‌وگوها و دفترچهٔ مخاطبین خود را ببینید.',
      href: '/personal/messages',
      icon: MessageCircle,
    },
    {
      title: 'حساب و پروفایل',
      description: 'اطلاعات فردی و وضعیت امکان ارتباط خود را بررسی کنید.',
      href: '/personal/profile',
      icon: UserRound,
    },
    {
      title: 'آموزشگاه‌های من',
      description: 'عضویت‌ها و نقش‌های مجاز خود را انتخاب کنید.',
      href: '/personal/education',
      icon: GraduationCap,
    },
    {
      title: 'منابع من',
      description: 'فضای منابع شخصی، مستقل از آموزشگاه.',
      href: '/personal/resources',
      icon: BookOpen,
    },
    {
      title: 'یادگیری با AI',
      description: 'منابع و محل مصرف را پیش از شروع بشناسید.',
      href: '/personal/ai',
      icon: Sparkles,
    },
    {
      title: 'اشتراک و مصرف',
      description: 'حق استفاده و مصرف فردی را جدا از سازمان ببینید.',
      href: '/personal/subscription',
      icon: Wallet,
    },
  ];
  return (
    <>
      <div className={s.heading}>
        <span>{session.context.workspaceType === 'Personal' ? 'فضای شخصی' : 'فضای آموزشگاه'}</span>
        <h1>
          {session.user.firstName ? `${session.user.firstName}، خوش آمدید` : 'به ماکان خوش آمدید'}
        </h1>
        <p>گفت‌وگو و یادگیری شما، در یک فضای روشن.</p>
      </div>
      {!session.user.isProfileComplete && (
        <div className={s.notice}>
          <UserRound size={22} />
          <p>
            <strong>پروفایل شما نیاز به تکمیل دارد</strong>
            <span>اطلاعات خواسته‌شده را بررسی کنید؛ وضعیت ارتباطات جداگانه مشخص می‌شود.</span>
          </p>
          <Button asChild variant="outline">
            <Link href="/personal/profile/edit">تکمیل پروفایل</Link>
          </Button>
        </div>
      )}
      {spaces.isError ? (
        <ErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />
      ) : organizationCount === 0 ? (
        <div className={s.personalNote}>
          <ShieldCheck size={20} />
          <p>هنوز عضو آموزشگاهی نیستید. حساب و امکانات شخصی مجاز شما برقرار است.</p>
        </div>
      ) : organizationCount !== null ? (
        <p className={s.muted}>فضاهای آموزشگاهی شما از بخش «آموزشگاه» در دسترس‌اند.</p>
      ) : null}
      <div className={s.cards}>
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <span className={s.cardIcon}>
              <card.icon size={24} />
            </span>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <span className={s.cardAction}>
              مشاهده <span aria-hidden="true">←</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
export function PersonalProfile() {
  const { session, logout } = usePersonal();
  const status = usePersonalApi<components['schemas']['MessagingStatusResult']>(
    '/api/v1/me/messaging-status',
  );
  const user = session.user;
  return (
    <>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>حساب من</span>
          <h1>پروفایل شما</h1>
          <p>اطلاعات فردی، وضعیت تکمیل و امکان ارتباط.</p>
        </div>
        <div className={s.actions}>
          <Button asChild variant="outline">
            <Link href="/personal/settings">
              <Settings size={18} />
              تنظیمات
            </Link>
          </Button>
          <Button asChild>
            <Link href="/personal/profile/edit">
              <Pencil size={17} />
              ویرایش پروفایل
            </Link>
          </Button>
        </div>
      </div>
      <section className={s.profileCard}>
        <div className={s.profileIdentity}>
          <ProfileAvatar
            photo={user.profilePhoto}
            name={user.displayName || user.firstName || 'حساب من'}
            className={s.largeAvatar}
          />
          <div>
            <h2>
              {user.displayName ||
                [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                'حساب ماکان'}
            </h2>
            <p>{user.username ? <bdi dir="ltr">@{user.username}</bdi> : 'نام کاربری ثبت نشده'}</p>
            <span className={s.status}>
              {user.isProfileComplete ? 'پروفایل تکمیل‌شده' : 'نیازمند تکمیل اطلاعات'}
            </span>
          </div>
        </div>
        <dl className={s.profileFields}>
          <div>
            <dt>نام</dt>
            <dd>{user.firstName || 'ثبت نشده'}</dd>
          </div>
          <div>
            <dt>نام خانوادگی</dt>
            <dd>{user.lastName || 'ثبت نشده'}</dd>
          </div>
          <div>
            <dt>نام نمایشی</dt>
            <dd>{user.displayName || 'ثبت نشده'}</dd>
          </div>
          <div>
            <dt>تاریخ تولد خوداظهاری</dt>
            <dd>{displayDateOnly(user.dateOfBirth)}</dd>
          </div>
          <div>
            <dt>شمارهٔ همراه حساب</dt>
            <dd>
              <bdi dir="ltr">{user.phoneNumber}</bdi>
            </dd>
          </div>
        </dl>
      </section>
      <section className={s.profileCard}>
        <h2>وضعیت امکان ارتباط</h2>
        <p className={s.muted}>اطلاعات خوداظهاری پروفایل، تأیید سن یا مجوز ارتباط ایجاد نمی‌کند.</p>
        {status.isPending ? (
          <LoadingSkeleton />
        ) : status.isError ? (
          <ErrorState error={status.error} onRetry={() => void status.refetch()} />
        ) : (
          <dl className={s.profileFields}>
            <div>
              <dt>وضعیت بررسی سن</dt>
              <dd>{ageVerificationLabels[status.data.verificationStatus]}</dd>
            </div>
            <div>
              <dt>ردهٔ سن ثبت‌شده</dt>
              <dd>{ageCategoryLabels[status.data.effectiveAgeCategory]}</dd>
            </div>
            <div>
              <dt>اقدام بعدی حساب</dt>
              <dd>{messagingNextLabels[status.data.nextAction]}</dd>
            </div>
          </dl>
        )}
        <p className={s.muted}>
          تاریخ تولد در ویرایش پروفایل اختیاری است و به معنی تأیید سن نیست. برای اصلاح اطلاعات مربوط
          به تأیید سن، از مسیر پشتیبانی حساب پیگیری کنید.
        </p>
      </section>
      <AccountIdentifier id={user.id} />
      <Button variant="outline" onClick={() => void logout()}>
        <LogOut size={17} />
        خروج از حساب
      </Button>
    </>
  );
}
export function PersonalProfileEdit() {
  const { session, call, reload } = usePersonal(),
    router = useRouter();
  const [values, setValues] = useState({
    firstName: session.user.firstName ?? '',
    lastName: session.user.lastName ?? '',
    displayName: session.user.displayName ?? '',
    username: session.user.username ?? '',
    dateOfBirth: session.user.dateOfBirth ?? '',
  });
  const [busy, setBusy] = useState(false),
    [photoBusy, setPhotoBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const dirty = Object.entries(values).some(
    ([key, value]) => value !== (session.user[key as keyof typeof values] ?? ''),
  );
  return (
    <>
      <div className={s.heading}>
        <span>حساب من / ویرایش</span>
        <h1>ویرایش پروفایل</h1>
        <p>اطلاعات حساب شما در همهٔ فضاها ثابت می‌ماند.</p>
      </div>
      <ProfilePhotoEditor disabled={busy || dirty} onBusyChange={setPhotoBusy} />
      <form
        className={s.editForm}
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || photoBusy) return;
          setBusy(true);
          setError(undefined);
          try {
            await call('/api/v1/me/profile', {
              method: 'PATCH',
              body: JSON.stringify(profilePatch(values)),
            });
            await reload();
            router.replace('/personal/profile');
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        {(
          [
            { key: 'firstName', label: 'نام' },
            { key: 'lastName', label: 'نام خانوادگی' },
            { key: 'displayName', label: 'نام نمایشی' },
            { key: 'username', label: 'نام کاربری' },
          ] as const
        ).map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              value={values[field.key]}
              disabled={busy || photoBusy}
              autoComplete={
                field.key === 'firstName'
                  ? 'given-name'
                  : field.key === 'lastName'
                    ? 'family-name'
                    : field.key === 'username'
                      ? 'username'
                      : 'nickname'
              }
              dir={field.key === 'username' ? 'ltr' : undefined}
              onChange={(e) =>
                setValues((previous) => ({ ...previous, [field.key]: e.target.value }))
              }
            />
          </label>
        ))}
        <label htmlFor="profile-birth-date">تاریخ تولد (اختیاری)</label>
        <JalaliDateInput
          id="profile-birth-date"
          aria-describedby="birth-date-preview birth-date-help"
          value={values.dateOfBirth}
          max={localToday()}
          disabled={busy || photoBusy}
          onValueChange={(dateOfBirth) => setValues((previous) => ({ ...previous, dateOfBirth }))}
        />
        <p id="birth-date-preview" className={s.muted}>
          {values.dateOfBirth ? displayDateOnly(values.dateOfBirth) : 'تاریخ تولد وارد نشده است.'}
        </p>
        <p id="birth-date-help" className={s.muted}>
          این تاریخ فقط در پروفایل خودتان نمایش داده می‌شود و تأیید سن یا مجوز ارتباط ایجاد نمی‌کند.
          خالی‌گذاشتن این فیلد، تاریخ ثبت‌شدهٔ قبلی را حفظ می‌کند.
        </p>
        {!!error && <ErrorState error={error} />}
        <div className={s.actions}>
          <Button type="submit" disabled={busy || photoBusy}>
            {busy ? 'در حال ثبت…' : 'ثبت تغییرات'}
          </Button>
          <Button asChild variant="outline" disabled={busy || photoBusy}>
            <Link href="/personal/profile">بازگشت به پروفایل</Link>
          </Button>
        </div>
        <p className={s.muted}>ویرایش این اطلاعات، نقش آموزشی یا نشان رسمی جدید ایجاد نمی‌کند.</p>
      </form>
    </>
  );
}
function AccountIdentifier({ id }: { id: string }) {
  const [copied, setCopied] = useState(false),
    [failed, setFailed] = useState(false);
  return (
    <section className={s.profileCard}>
      <h2>شناسهٔ حساب</h2>
      <p className={s.muted}>
        برای معرفی حساب خود به مدیر آموزشگاه، در صورت تمایل این شناسه را در اختیار او بگذارید.
        شناسهٔ حساب، کد ورود نیست؛ بررسی رابطهٔ والد و فرزند همچنان لازم است.
      </p>
      <p>
        <bdi dir="ltr">{id}</bdi>
      </p>
      <Button
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(id);
            setCopied(true);
            setFailed(false);
          } catch {
            setFailed(true);
          }
        }}
      >
        کپی شناسهٔ حساب
      </Button>
      {copied && <p role="status">شناسه کپی شد.</p>}
      {failed && <p role="status">کپی خودکار انجام نشد؛ شناسه را انتخاب و کپی کنید.</p>}
    </section>
  );
}
export function PersonalPending({ area }: { area: 'resources' | 'ai' | 'subscription' }) {
  const info = {
    resources: {
      title: 'منابع من',
      text: 'مدیریت منابع شخصی و آماده‌سازی آن‌ها برای یادگیری هنوز در دسترس نیست.',
    },
    ai: {
      title: 'یادگیری با AI',
      text: 'این خدمت در حال حاضر فعال نیست. انتخاب منابع، مدل و محل مصرف پیش از شروع مشخص خواهد شد.',
    },
    subscription: {
      title: 'اشتراک و مصرف شخصی',
      text: 'اطلاعات اشتراک فردی و مسیر خرید آن هنوز در دسترس نیست. اشتراک آموزشگاه از حساب شخصی شما جداست.',
    },
  }[area];
  return (
    <>
      <div className={s.heading}>
        <span>فضای شخصی</span>
        <h1>{info.title}</h1>
      </div>
      <section className={s.profileCard}>
        <EmptyState title="این بخش هنوز آمادهٔ استفاده نیست" description={info.text} />
        <Button asChild variant="outline">
          <Link href="/personal">بازگشت به خانه</Link>
        </Button>
      </section>
    </>
  );
}
