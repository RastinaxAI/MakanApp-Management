'use client';
import Link from '@/components/ui/app-link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  ShieldCheck,
  Flag,
  MessagesSquare,
  Layers3,
  Wallet,
  Activity,
  ScrollText,
  UserRound,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Sun,
  ArrowLeftRight,
  BookOpen,
  Link2,
  CalendarDays,
  FileChartColumn,
  PanelRightClose,
} from 'lucide-react';
import { useAccess } from '@/features/access-context/provider';
import { useApi } from '@/lib/api/hooks';
import type { components } from '@/generated/api/schema';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { label } from '@/components/ui/states';
import { canOpenSection } from '@/lib/permissions';
import { GlobalSearch } from './global-search';
import { NotificationBell } from '@/features/pwa/notifications';
import { BrandMark } from '@/components/ui/brand';
import atlas from './atlas.module.css';
const adminItems = [
  ['', 'نمای کلی', LayoutDashboard, ''],
  ['organizations', 'سازمان‌ها', Building2, '/api/admin/v1/organizations'],
  ['users', 'کاربران', Users, '/api/admin/v1/users'],
  ['education', 'آموزش', GraduationCap, '/api/admin/v1/education/classes'],
  ['roles', 'نقش‌ها و دسترسی‌ها', ShieldCheck, '/api/admin/v1/roles'],
  ['moderation', 'رسیدگی به گزارش‌ها', Flag, '/api/admin/v1/moderation/cases'],
  ['messaging', 'اطلاعات پیام‌رسان', MessagesSquare, '/api/admin/v1/messaging/conversations'],
  ['commerce', 'پلن‌ها و اشتراک‌ها', Layers3, '/api/admin/v1/commerce/plans'],
  ['finance', 'مالی', Wallet, '/api/admin/v1/finance/orders'],
  ['operations', 'عملیات سامانه', Activity, '/api/admin/v1/operations/health'],
  ['audit', 'رویدادهای مدیریتی', ScrollText, '/api/admin/v1/audit-logs'],
  ['account', 'حساب و امنیت', UserRound, ''],
] as const;
const orgItems = [
  ['', 'نمای سازمان', LayoutDashboard, '/api/v1/dashboards/manager'],
  ['people', 'افراد سازمان', Users, '/api/v1/organization/people'],
  ['guardians', 'روابط سرپرستی', Link2, '/api/v1/organization/guardian-relations'],
  ['classes', 'کلاس‌ها', BookOpen, '/api/v1/academic/classes'],
  ['schedule', 'برنامه و جلسات', CalendarDays, '/api/v1/academic/schedule'],
  ['reports', 'گزارش‌های آموزشی', FileChartColumn, '/api/v1/reports/manager/enrollments'],
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const { session, can, logout } = useAccess();
  const pathname = usePathname();
  const organization = pathname.startsWith('/organization');
  const [mobile, setMobile] = useState(false),
    [workspace, setWorkspace] = useState(false),
    [dark, setDark] = useState(false);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const value = localStorage.getItem('makan-theme') === 'dark';
    setDark(value);
    document.documentElement.dataset.theme = value ? 'dark' : 'light';
  }, []);
  useEffect(() => setMobile(false), [pathname]);
  const workspaces = useApi<components['schemas']['WorkspaceResult'][]>(
    '/api/v1/workspaces/me',
    organization,
  );
  const currentWorkspace = workspaces.data?.find(
    (w) =>
      w.organizationId === session.context?.organizationId &&
      w.role === session.context?.activeRole,
  );
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const items = organization ? orgItems : adminItems;
  const base = organization ? '/organization' : '/admin';
  const navigation = (
    <>
      <Link href={base} className="brand">
        <BrandMark />
        <span>
          ماکان<span className="brand-sub">پنل مدیریت</span>
        </span>
        <span className="brand-version">ADMIN</span>
      </Link>
      <div className="sidebar-label">{organization ? 'فضای سازمان' : 'مدیریت پلتفرم'}</div>
      <nav aria-label="ناوبری اصلی" className="nav-list">
        {items
          .filter((item) =>
            organization ? !item[3] || can(item[3]) : canOpenSection(item[0], item[3], can),
          )
          .map(([slug, title, Icon]) => (
            <Link
              key={slug}
              href={`${base}${slug ? '/' + slug : ''}`}
              className={`nav-item ${pathname === `${base}${slug ? '/' + slug : ''}` || (slug && pathname.startsWith(`${base}/${slug}/`)) ? 'active' : ''}`}
              aria-current={
                pathname === `${base}${slug ? '/' + slug : ''}` ||
                (slug && pathname.startsWith(`${base}/${slug}/`))
                  ? 'page'
                  : undefined
              }
            >
              <Icon size={19} />
              <span>{title}</span>
            </Link>
          ))}
      </nav>
      <div className="sidebar-bottom">
        <ShieldCheck size={22} />
        <div>
          <strong>فضای مدیریت ماکان</strong>
          <span>اقدام‌ها متناسب با دسترسی حساب شما</span>
        </div>
      </div>
    </>
  );
  return (
    <div className={`app-shell ${atlas.shell}`}>
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
            ارتباط شبکه قطع است؛ داده‌های نمایش‌داده‌شده ممکن است قدیمی باشند.
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
            <span className="topbar-section">
              {organization ? 'مدیریت سازمان' : 'مدیریت پلتفرم'}
            </span>
            {organization && (
              <>
                <span className="topbar-divider" />
                <button className="workspace-button" onClick={() => setWorkspace(true)}>
                  <span className="workspace-avatar">
                    <Building2 size={17} />
                  </span>
                  <span>
                    {currentWorkspace?.organizationName ??
                      (session.context?.organizationId ? 'سازمان فعال' : 'انتخاب سازمان')}
                    <small>{label(session.context?.activeRole ?? '')}</small>
                  </span>
                  <ArrowLeftRight size={15} />
                </button>
              </>
            )}
          </div>
          <div className="topbar-end">
            {!organization && <GlobalSearch />}
            <NotificationBell />
            <Button
              size="icon"
              variant="ghost"
              aria-label={dark ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تیره'}
              onClick={() => {
                const v = !dark;
                setDark(v);
                document.documentElement.dataset.theme = v ? 'dark' : 'light';
                localStorage.setItem('makan-theme', v ? 'dark' : 'light');
              }}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </Button>
            <DropdownMenu.Root dir="rtl">
              <DropdownMenu.Trigger asChild>
                <button className="account-trigger">
                  <span className="avatar">
                    {(session.user.displayName ?? session.user.firstName ?? 'ک').slice(0, 1)}
                  </span>
                  <span className="account-name">
                    {session.user.displayName ?? 'حساب کاربری'}
                    <small>
                      {session.platform?.roles.join('، ') ||
                        label(session.context?.activeRole ?? 'Personal')}
                    </small>
                  </span>
                  <ChevronDown size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="dropdown" align="end">
                  <DropdownMenu.Item asChild>
                    <Link href="/admin/account">
                      <UserRound size={16} />
                      حساب و امنیت
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <a
                      href="/guides/makan-owner-guide.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <BookOpen size={16} />
                      راهنمای کار با پنل
                    </a>
                  </DropdownMenu.Item>
                  {organization && (
                    <DropdownMenu.Item onSelect={() => setWorkspace(true)}>
                      <ArrowLeftRight size={16} />
                      تغییر فضای کاری
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item className="text-danger" onSelect={() => void logout()}>
                    <LogOut size={16} />
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
          <span>ماکان · مدیریت یکپارچه آموزش</span>
          <span>زمان‌ها به وقت تهران نمایش داده می‌شوند</span>
        </footer>
      </div>
      {organization && <WorkspaceDialog open={workspace} onOpenChange={setWorkspace} />}
    </div>
  );
}
function WorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { session, switchWorkspace, changing } = useAccess();
  const q = useApi<components['schemas']['WorkspaceResult'][]>('/api/v1/workspaces/me', open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="انتخاب فضای کاری"
        description="فضای سازمان و نقش شما با تأیید سرور تغییر می‌کند."
      >
        <div className="workspace-list">
          {session.platform && (
            <Button asChild variant="outline">
              <Link href="/admin" onClick={() => onOpenChange(false)}>
                <ShieldCheck size={18} />
                مدیریت پلتفرم
              </Link>
            </Button>
          )}
          {q.data?.map((w, index) => (
            <Button
              key={index}
              variant="outline"
              disabled={changing || (w.workspaceType === 'Organization' && w.role !== 'Manager')}
              onClick={() =>
                void switchWorkspace({
                  workspaceType: w.workspaceType,
                  membershipId: w.membershipId,
                  role: w.role,
                }).then(() => onOpenChange(false))
              }
            >
              <Building2 size={18} />
              {w.organizationName ?? w.displayName} · {label(w.role ?? w.workspaceType)}
            </Button>
          ))}
          {q.isError && <p role="alert">دریافت فضای کاری ممکن نشد.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
