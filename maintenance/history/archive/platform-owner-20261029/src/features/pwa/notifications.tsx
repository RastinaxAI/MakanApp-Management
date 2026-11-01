'use client';
import { useEffect, useState } from 'react';
import { Bell, BellOff, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from '@/components/ui/app-link';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/data-view';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { useAccess } from '@/features/access-context/provider';
import { request } from '@/lib/api/client';
import { useApi } from '@/lib/api/hooks';
import { date, number } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';
import { usePwa } from './provider';
import { InstallPanel } from './install';
import { currentDevice, enablePush, disablePush, type Device } from './push-client';

const configurationPath = '/api/v1/notifications/devices/web-push/configuration';
function useUnreadCount() {
  const { session, guard, can } = useAccess();
  return useQuery({
    queryKey: [session.user.id, session.revision, 'notification-unread'],
    queryFn: ({ signal }) =>
      request<components['schemas']['NotificationUnreadCount']>(
        '/api/backend/api/v1/notifications/unread-count',
        { signal },
        guard,
      ),
    enabled: can('/api/v1/notifications/unread-count'),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
}
export function NotificationBell() {
  const unread = useUnreadCount();
  return (
    <Link
      className="notification-bell button button-ghost button-icon"
      href="/admin/account?tab=notifications"
      aria-label="اعلان‌های من"
    >
      <Bell size={19} />
      {(unread.data?.count ?? 0) > 0 && (
        <span
          className="notification-count"
          aria-label={`${number(unread.data!.count)} اعلان خوانده‌نشده`}
        >
          {unread.data!.count > 99 ? '۹۹+' : number(unread.data!.count)}
        </span>
      )}
    </Link>
  );
}
export function NotificationSettings() {
  const { session, guard } = useAccess();
  const { registration, ready, secure, error: workerError } = usePwa();
  const config = useApi<components['schemas']['WebPushClientConfiguration']>(configurationPath);
  const devices = useApi<components['schemas']['PushDevicePageResult']>(
    '/api/v1/notifications/devices?includeRevoked=true&page=1&pageSize=100',
  );
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'unsupported',
  );
  const [supported, setSupported] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    const available =
      'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
    setSupported(available);
    if (available) setPermission(Notification.permission);
    const stored = currentDevice();
    setDevice(stored?.userId.toLowerCase() === session.user.id.toLowerCase() ? stored : null);
    if (registration && 'pushManager' in registration)
      void registration.pushManager
        .getSubscription()
        .then((sub) => setSubscribed(!!sub))
        .catch(() => {});
    const refresh = () => {
      if (available) setPermission(Notification.permission);
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [registration, ready, session.user.id]);
  const registered =
    !!device && devices.data?.items.some((item) => item.id === device.id && item.isActive);
  async function enable() {
    if (
      !registration?.active ||
      !config.data?.isConfigured ||
      !config.data.vapidPublicKey ||
      !supported
    )
      return;
    setError(undefined);
    setMessage('');
    setBusy(true);
    try {
      // Permission is requested directly from this click, never automatically after page load.
      const granted =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
      setPermission(granted);
      if (granted !== 'granted') {
        setMessage(
          'اجازه اعلان صادر نشد. در صورت تمایل، آن را از تنظیمات همین سایت در مرورگر فعال کنید.',
        );
        return;
      }
      const value = await enablePush(
        registration,
        session.user.id,
        config.data.vapidPublicKey,
        guard,
      );
      setDevice(value);
      setSubscribed(true);
      await devices.refetch();
      setMessage('این مرورگر برای دریافت اعلان‌های حساب شما در سرور ثبت شد.');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    setError(undefined);
    setMessage('');
    setBusy(true);
    try {
      await disablePush(session.user.id, guard);
      setDevice(null);
      setSubscribed(false);
      await devices.refetch();
      setMessage('اعلان‌های این حساب روی این مرورگر خاموش شدند.');
    } catch (e) {
      setError(e);
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }
  async function localTest() {
    setError(undefined);
    try {
      await registration?.showNotification('آزمون اعلان ماکان', {
        body: 'نمایش اعلان روی این دستگاه فعال است. این پیام آزمون محلی است.',
        icon: '/icons/makan-192.png',
        dir: 'rtl',
        lang: 'fa',
        tag: 'makan-local-test',
        data: { url: '/admin/account?tab=notifications' },
      });
      setMessage(
        'اعلان آزمایشی روی همین دستگاه نمایش داده شد؛ این آزمون، ارسال Push از سرور را بررسی نمی‌کند.',
      );
    } catch (e) {
      setError(e);
    }
  }
  return (
    <>
      <Panel title="نصب پنل روی دستگاه">
        <InstallPanel />
      </Panel>
      <Panel
        title="اعلان‌های این مرورگر"
        description="با فعال‌سازی، این دستگاه برای دریافت اعلان‌های حساب شما ثبت می‌شود."
      >
        <p className="pwa-status">
          <Bell size={19} />
          {registered && subscribed && permission === 'granted'
            ? 'اعلان‌ها روی این مرورگر فعال‌اند.'
            : 'اعلان‌ها روی این مرورگر فعال نیستند.'}
        </p>
        {!secure && (
          <p className="notice">
            برای فعال‌سازی اعلان‌ها، نشانی امن HTTPS پنل را باز کنید. آدرس محلی رایانه فقط روی همان
            رایانه کار می‌کند.
          </p>
        )}
        {secure && !supported && (
          <p className="notice">
            این مرورگر از اعلان‌های وب پشتیبانی نمی‌کند. در iPhone و iPad ابتدا پنل را به Home
            Screen اضافه و از آیکون آن باز کنید.
          </p>
        )}
        {permission === 'denied' && (
          <p className="notice">
            اعلان این سایت در مرورگر مسدود شده است. از تنظیمات سایت، Notifications را روی Allow
            بگذارید و به این صفحه برگردید.
          </p>
        )}
        {config.isPending ? (
          <LoadingSkeleton />
        ) : config.isError ? (
          <ErrorState error={config.error} onRetry={() => void config.refetch()} />
        ) : (
          !config.data.isConfigured && (
            <p className="notice">
              سرویس ارسال اعلان در سرور هنوز آماده نیست. با پشتیبانی سامانه تماس بگیرید.
            </p>
          )
        )}
        {workerError && (
          <p role="alert">آماده‌سازی اعلان کامل نشد. اتصال را بررسی و صفحه را تازه کنید.</p>
        )}
        {devices.isError && (
          <ErrorState error={devices.error} onRetry={() => void devices.refetch()} />
        )}
        <div className="pwa-actions">
          {!registered && (
            <Button
              disabled={
                busy ||
                !secure ||
                !supported ||
                !registration?.active ||
                devices.isPending ||
                !config.data?.isConfigured ||
                !config.data.vapidPublicKey ||
                permission === 'denied'
              }
              onClick={() => void enable()}
            >
              <Bell size={18} />
              {busy ? 'در حال ثبت…' : 'فعال‌سازی اعلان مرورگر'}
            </Button>
          )}
          {(device || subscribed) && (
            <Button variant="outline" disabled={busy} onClick={() => void disable()}>
              <BellOff size={18} />
              خاموش کردن اعلان‌ها
            </Button>
          )}
          <Button
            variant="outline"
            disabled={busy || !registration?.active || permission !== 'granted'}
            onClick={() => void localTest()}
          >
            آزمون نمایش روی این دستگاه
          </Button>
        </div>
        {message && (
          <p className="form-message mt-4" role="status">
            {message}
          </p>
        )}
        {error instanceof Error && (
          <p className="form-message error mt-4" role="alert">
            {error.message}
          </p>
        )}
        <p className="field-help mt-4">
          روی صفحه قفل فقط پیام عمومی نمایش داده می‌شود. برای دیدن جزئیات وارد پنل شوید. خروج از
          حساب، اعلان‌های همین مرورگر را خاموش می‌کند. تنظیمات بی‌صدا و ذخیره باتری دستگاه نیز بر
          دریافت اعلان اثر دارند.
        </p>
      </Panel>
      <NotificationInbox />
    </>
  );
}
function NotificationInbox() {
  const { guard } = useAccess();
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>();
  const q = useApi<components['schemas']['NotificationPage']>(
    `/api/v1/notifications?Page=${page}&PageSize=10&UnreadOnly=${unreadOnly}`,
  );
  const unread = useUnreadCount();
  async function markRead(id: string) {
    setBusy(id);
    setError(undefined);
    try {
      await request('/api/backend/api/v1/notifications/' + id + '/read', { method: 'POST' }, guard);
      await Promise.all([
        q.refetch(),
        cache.invalidateQueries({
          predicate: (query) => query.queryKey.includes('notification-unread'),
        }),
      ]);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }
  return (
    <Panel
      title="اعلان‌های من"
      description="اعلان‌های همین حساب از سرور دریافت می‌شوند؛ این فهرست با وضعیت عملیات ارسال اعلان سامانه متفاوت است."
    >
      <div className="pwa-actions">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => {
              setUnreadOnly(event.target.checked);
              setPage(1);
            }}
          />
          فقط خوانده‌نشده‌ها
        </label>
        <Button
          size="icon"
          variant="ghost"
          aria-label="به‌روزرسانی اعلان‌ها"
          onClick={() => void Promise.all([q.refetch(), unread.refetch()])}
        >
          <RefreshCw size={17} />
        </Button>
      </div>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {!q.data.items.length && <p className="field-help mt-4">اعلانی برای نمایش وجود ندارد.</p>}
          <div className="notification-list">
            {q.data.items.map((item) => (
              <article
                className="notification-item"
                key={item.id}
                data-unread={!item.readAtUtc || undefined}
              >
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <small>{date(item.createdAtUtc, true)}</small>
                </div>
                {!item.readAtUtc && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy === item.id}
                    onClick={() => void markRead(item.id)}
                  >
                    {busy === item.id ? 'در حال ثبت…' : 'خواندم'}
                  </Button>
                )}
              </article>
            ))}
          </div>
          <div className="pagination-controls mt-4">
            <Button
              variant="outline"
              disabled={page === 1 || q.isFetching}
              onClick={() => setPage((value) => value - 1)}
            >
              قبلی
            </Button>
            <span>
              صفحه {number(page)} · {number(q.data.totalCount)} اعلان
            </span>
            <Button
              variant="outline"
              disabled={page * 10 >= q.data.totalCount || q.isFetching}
              onClick={() => setPage((value) => value + 1)}
            >
              بعدی
            </Button>
          </div>
        </>
      )}
      {error instanceof Error && (
        <p role="alert" className="form-message error mt-4">
          {error.message}
        </p>
      )}
    </Panel>
  );
}
