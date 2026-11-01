'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  Sparkles,
  GraduationCap,
  MessageCircle,
  UserRound,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { BrandMark } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { ErrorState, label } from '@/components/ui/states';
import { usePersonal, usePersonalApi } from './provider';
import type { components } from '@/generated/api/schema';
import s from './personal.module.css';
import { useThemePreference } from './theme';
import { ProfileAvatar } from './profile-photo';
const nav = [
  { href: '/personal/education', name: 'آموزشگاه', icon: GraduationCap },
  { href: '/personal/assistant', name: 'دستیار ماکان', icon: Sparkles },
  { href: '/personal/messages', name: 'پیام‌ها', icon: MessageCircle },
  { href: '/personal/profile', name: 'حساب من', icon: UserRound },
];
export function PersonalShell({ children }: { children: ReactNode }) {
  const { session, logout, selectWorkspace } = usePersonal();
  const pathname = usePathname();
  useThemePreference();
  const messageLayout =
    pathname === '/personal/messages' || /^\/personal\/messages\/[0-9a-f-]{36}$/i.test(pathname);
  const [picker, setPicker] = useState(false),
    [error, setError] = useState<unknown>();
  const spaces =
    usePersonalApi<components['schemas']['WorkspaceResult'][]>('/api/v1/workspaces/me');
  const name =
    session.user.displayName ||
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') ||
    'حساب من';
  const active = spaces.data?.find(
    (w) => w.membershipId === session.context.membershipId && w.role === session.context.activeRole,
  );
  const navigation = (
    <nav aria-label="ناوبری حساب شخصی" className={s.nav}>
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={
            pathname === item.href ||
            (item.href === '/personal/education' && pathname === '/personal') ||
            (item.href === '/personal/assistant' && pathname === '/personal/ai') ||
            (item.href === '/personal/profile' &&
              (pathname.startsWith('/personal/settings') || pathname === '/personal/privacy')) ||
            (item.href === '/personal/messages' && pathname === '/personal/contacts') ||
            (item.href !== '/personal' && pathname.startsWith(item.href + '/'))
              ? 'page'
              : undefined
          }
        >
          <item.icon size={21} />
          <span>{item.name}</span>
        </Link>
      ))}
    </nav>
  );
  return (
    <div className={s.shell}>
      <a className="skip-link" href="#personal-content">
        رفتن به محتوای اصلی
      </a>
      <aside className={s.sidebar}>
        <Link href="/personal/education" className={s.brand}>
          <BrandMark />
          <span>
            ماکان<small>فضای کار شما</small>
          </span>
        </Link>
        {navigation}
        <div className={s.sidebarBottom}>
          <ShieldCheck size={21} />
          <p>
            فضای شخصی شما<small>مستقل از عضویت در آموزشگاه</small>
          </p>
        </div>
      </aside>
      <div className={s.workspace}>
        <header className={s.header}>
          <Link href="/personal/education" className={s.mobileBrand} aria-label="ماکان؛ آموزشگاه">
            <BrandMark />
            <span>ماکان</span>
          </Link>
          <Dialog open={picker} onOpenChange={setPicker}>
            <DialogTrigger asChild>
              <button
                className={s.context}
                aria-label={
                  'فضای کار: ' +
                  (active?.organizationName ?? 'شخصی') +
                  '، نقش: ' +
                  (session.context.activeRole ? label(session.context.activeRole) : 'فرد عادی')
                }
              >
                <span className={s.contextLabel}>
                  <strong>
                    {session.context.activeRole ? label(session.context.activeRole) : 'فرد عادی'}
                  </strong>
                  <small>
                    {session.context.workspaceType === 'Personal'
                      ? 'فضای شخصی'
                      : (active?.organizationName ?? 'آموزشگاه فعال')}
                  </small>
                </span>
                <ChevronDown size={16} />
              </button>
            </DialogTrigger>
            <DialogContent
              title="انتخاب فضای کار"
              description="حساب شخصی شما با تغییر آموزشگاه باقی می‌ماند."
            >
              <div className={s.spaceList}>
                {spaces.isError ? (
                  <ErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />
                ) : spaces.isPending ? (
                  <p role="status">در حال دریافت فضاهای مجاز…</p>
                ) : (
                  spaces.data.map((space, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        void selectWorkspace({
                          workspaceType: space.workspaceType,
                          membershipId: space.membershipId,
                          role: space.role,
                        }).catch(setError)
                      }
                    >
                      <GraduationCap size={20} />
                      <span>
                        {space.organizationName ?? space.displayName}
                        <small>{label(space.role ?? space.workspaceType)}</small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
          <div className={s.headerEnd}>
            <Link href="/personal/profile" className={s.account}>
              <ProfileAvatar photo={session.user.profilePhoto} name={name} className={s.avatar} />
              <span>{name}</span>
            </Link>
            <Button
              size="icon"
              variant="ghost"
              aria-label="خروج از حساب شخصی"
              onClick={() => void logout().catch(setError)}
            >
              <LogOut size={19} />
            </Button>
          </div>
        </header>
        <main
          className={`${s.main} ${messageLayout ? s.messageMain : ''} ${pathname.startsWith('/personal/assistant') || pathname === '/personal/ai' ? s.assistantMain : ''}`}
          id="personal-content"
        >
          {!!error && <ErrorState error={error} />}
          {children}
        </main>
        <div className={s.mobileNav}>{navigation}</div>
      </div>
    </div>
  );
}
