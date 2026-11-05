'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Activity,
  ArrowUpLeft,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronLeft,
  Flag,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  MessagesSquare,
  Moon,
  ScrollText,
  ShieldCheck,
  Sun,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import Link from '@/components/ui/app-link';
import { BrandMark } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAccess } from '@/features/access-context/provider';
import { NotificationBell } from '@/features/pwa/notifications';
import { canOpenSection } from '@/lib/permissions';
import { GlobalSearch } from './global-search';
import type { LucideIcon } from 'lucide-react';

const groups: { label: string; items: [string, string, LucideIcon, string][] }[] = [
  { label: 'میز کار', items: [['', 'نمای کلی', LayoutDashboard, '']] },
  {
    label: 'مدیریت',
    items: [
      ['organizations', 'سازمان‌ها', Building2, '/api/admin/v1/organizations'],
      ['users', 'کاربران', Users, '/api/admin/v1/users'],
      ['education', 'آموزش', GraduationCap, '/api/admin/v1/education/classes'],
      ['personal-classes', 'کلاس‌های شخصی', GraduationCap, '/api/admin/v1/personal-class-requests'],
      ['library', 'منابع کتابخانه', BookOpen, '/api/admin/v1/library/sources'],
    ],
  },
  {
    label: 'تجاری',
    items: [
      ['commerce', 'پلن‌ها و اشتراک‌ها', Layers3, '/api/admin/v1/commerce/plans'],
      ['finance', 'مالی', Wallet, '/api/admin/v1/finance/orders'],
    ],
  },
  {
    label: 'نظارت و کنترل',
    items: [
      ['moderation', 'رسیدگی به گزارش‌ها', Flag, '/api/admin/v1/moderation/cases'],
      ['messaging', 'اطلاعات پیام‌رسان', MessagesSquare, '/api/admin/v1/messaging/conversations'],
      ['roles', 'نقش‌ها و دسترسی‌ها', ShieldCheck, '/api/admin/v1/roles'],
      ['operations', 'عملیات سامانه', Activity, '/api/admin/v1/operations/health'],
      ['audit', 'رویدادهای مدیریتی', ScrollText, '/api/admin/v1/audit-logs'],
    ],
  },
  { label: 'حساب من', items: [['account', 'حساب و امنیت', UserRound, '']] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { session, can, logout } = useAccess();
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const [dark, setDark] = useState(false);
  const [offline, setOffline] = useState(false);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const active = (slug: string) =>
    (slug === 'personal-classes' && pathname.startsWith('/admin/personal-class-requests')) ||
    pathname === '/admin' + (slug ? '/' + slug : '') ||
    (!!slug && pathname.startsWith('/admin/' + slug + '/'));
  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(([slug, , , permission]) => canOpenSection(slug, permission, can)),
    }))
    .filter((g) => g.items.length);
  const current = groups.flatMap((g) => [...g.items]).find(([slug]) => active(slug));
  useEffect(() => {
    try {
      const enabled = localStorage.getItem('makan-theme') === 'dark';
      setDark(enabled);
      document.documentElement.dataset.theme = enabled ? 'dark' : 'light';
    } catch {}
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    setMobile(false);
  }, [pathname]);
  const navigation = (
    <>
      <Link href="/admin" className="brand" onClick={() => setMobile(false)}>
        <BrandMark />
        <span>
          ماکان<small>مدیریت پلتفرم</small>
        </span>
      </Link>
      <nav aria-label="ناوبری اصلی" className="nav-list">
        {visibleGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="sidebar-label">{group.label}</div>
            {group.items.map(([slug, title, Icon]) => (
              <Link
                key={slug}
                href={'/admin' + (slug ? '/' + slug : '')}
                onClick={() => setMobile(false)}
                className={'nav-item' + (active(slug) ? ' active' : '')}
                aria-current={active(slug) ? 'page' : undefined}
              >
                <Icon size={19} strokeWidth={1.7} />
                <span>{title}</span>
                {active(slug) && <span className="nav-active-dot" />}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <a
        href="/guides/makan-owner-guide.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="sidebar-help"
      >
        <BookOpen size={20} />
        <span>
          <strong>راهنمای کار با پنل</strong>
          <small>قدم‌به‌قدم همراه شما</small>
        </span>
        <ArrowUpLeft size={17} />
      </a>
    </>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <aside className="sidebar">{navigation}</aside>
      <Dialog open={mobile} onOpenChange={setMobile}>
        {mobile && (
          <DialogContent
            title="منوی مدیریت"
            description="بخش موردنظر را انتخاب کنید."
            side
            className="navigation-sheet"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              mobileTrigger.current?.focus();
            }}
          >
            <div className="mobile-nav">{navigation}</div>
          </DialogContent>
        )}
      </Dialog>
      <div className="workspace">
        {offline && (
          <div className="offline-banner" role="status">
            ارتباط شبکه قطع است؛ اطلاعات ممکن است به‌روز نباشد.
          </div>
        )}
        <header className="topbar">
          <div className="topbar-start">
            <Button
              ref={mobileTrigger}
              className="mobile-menu"
              size="icon"
              variant="ghost"
              aria-label="باز کردن منو"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </Button>
            <div className="topbar-location">
              <span>پنل مدیریت</span>
              <ChevronLeft size={14} />
              <strong>{current?.[1] ?? 'جزئیات'}</strong>
            </div>
          </div>
          <div className="topbar-end">
            <GlobalSearch />
            <span className="topbar-divider" />
            <NotificationBell />
            <Button
              size="icon"
              variant="ghost"
              aria-label={dark ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تیره'}
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.dataset.theme = next ? 'dark' : 'light';
                try {
                  localStorage.setItem('makan-theme', next ? 'dark' : 'light');
                } catch {}
              }}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </Button>
            <DropdownMenu.Root dir="rtl">
              <DropdownMenu.Trigger asChild>
                <button className="account-trigger">
                  <span className="avatar">{(session.user.displayName || 'م').slice(0, 1)}</span>
                  <span className="account-name">
                    {session.user.displayName || 'مالک پلتفرم'}
                    <small>مالک پلتفرم</small>
                  </span>
                  <ChevronDown size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="dropdown" align="end" sideOffset={10}>
                  <DropdownMenu.Item asChild>
                    <Link href="/admin/account">
                      <UserRound size={17} />
                      حساب و امنیت
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <a
                      href="/guides/makan-owner-guide.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <BookOpen size={17} />
                      راهنمای کار با پنل
                    </a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item className="text-danger" onSelect={() => void logout()}>
                    <LogOut size={17} />
                    خروج از حساب
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>
            ماکان<span className="footer-dot">·</span>فضای مدیریت پلتفرم
          </span>
          <span>زمان‌ها به وقت تهران</span>
        </footer>
      </div>
      <nav className="mobile-bottom-nav" aria-label="دسترسی سریع موبایل">
        {(
          [
            ['', 'خانه', LayoutDashboard, ''],
            ['organizations', 'سازمان‌ها', Building2, '/api/admin/v1/organizations'],
            ['users', 'کاربران', Users, '/api/admin/v1/users'],
          ] as const
        )
          .filter(([slug, , , permission]) => canOpenSection(slug, permission, can))
          .map(([slug, title, Icon]) => (
            <Link
              key={slug}
              href={'/admin' + (slug ? '/' + slug : '')}
              className={active(slug) ? 'active' : ''}
              aria-current={active(slug) ? 'page' : undefined}
            >
              <Icon size={21} />
              <span>{title}</span>
            </Link>
          ))}
        <button onClick={() => setMobile(true)} aria-label="بخش‌های بیشتر">
          <Menu size={21} />
          <span>بیشتر</span>
        </button>
      </nav>
    </div>
  );
}
