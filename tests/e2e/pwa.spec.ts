import { test, expect, type Page } from '@playwright/test';
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('شماره همراه', { exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  await page.getByLabel('کد ورود', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('نمای کلی');
}
test.beforeEach(async ({ request }) => {
  await request.post('http://127.0.0.1:4100/__control', { data: { reset: true } });
});
async function browserPushStub(page: Page) {
  await page.addInitScript(() => {
    let permission: NotificationPermission = 'default';
    let subscription: any = null;
    const calls = { permission: 0, subscribe: 0, unsubscribe: 0, localTest: 0 };
    (window as any).__pushCalls = calls;
    Object.defineProperty(Notification, 'permission', {
      configurable: true,
      get: () => permission,
    });
    Notification.requestPermission = async () => {
      calls.permission++;
      permission = 'granted';
      return permission;
    };
    PushManager.prototype.getSubscription = async () => subscription;
    PushManager.prototype.subscribe = async () => {
      calls.subscribe++;
      subscription = {
        endpoint: 'https://push.example.invalid/authorized-test-subscription',
        toJSON: () => ({
          endpoint: 'https://push.example.invalid/authorized-test-subscription',
          keys: { p256dh: 'fixture-public-encryption-key', auth: 'fixture-encryption-auth' },
        }),
        unsubscribe: async () => {
          calls.unsubscribe++;
          subscription = null;
          return true;
        },
      };
      return subscription;
    };
    ServiceWorkerRegistration.prototype.showNotification = async () => {
      calls.localTest++;
    };
  });
}
async function settings(page: Page) {
  await login(page);
  await page.goto('/admin/account?tab=notifications');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect(
    page.getByRole('heading', { name: 'اعلان‌های این مرورگر', exact: true }),
  ).toBeVisible();
}

test('manifest, icons, worker headers and static-only cache are installable', async ({
  page,
  request,
}) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    lang: 'fa',
    dir: 'rtl',
    display: 'standalone',
    start_url: '/admin',
    scope: '/',
  });
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src);
    expect(image.status()).toBe(200);
    const bytes = await image.body();
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  }
  const worker = await request.get('/sw.js');
  expect(worker.headers()['service-worker-allowed']).toBe('/');
  expect(worker.headers()['cache-control']).toContain('no-store');
  await page.goto('/login');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const urls = await page.evaluate(async () => {
    const result: string[] = [];
    for (const key of await caches.keys())
      for (const r of await (await caches.open(key)).keys()) result.push(new URL(r.url).pathname);
    return result;
  });
  expect(urls).toContain('/offline.html');
  expect(urls.every((path) => path === '/offline.html' || path.startsWith('/icons/'))).toBe(true);
});

test('offline navigation never restores cached account or API data', async ({ page, context }) => {
  await login(page);
  await page.goto('/admin/users');
  await expect(page.getByRole('link', { name: /کاربر آزمایشی/ })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'ارتباط اینترنت برقرار نیست' })).toBeVisible();
  await expect(page.getByText('کاربر آزمایشی', { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      fetch('/api/session').then(
        () => false,
        () => true,
      ),
    ),
  ).toBe(true);
  await context.setOffline(false);
});

test('permission is requested only on enable, registration uses the real API contract and disable revokes it', async ({
  page,
  request,
}) => {
  await browserPushStub(page);
  await settings(page);
  expect(await page.evaluate(() => (window as any).__pushCalls.permission)).toBe(0);
  await page.getByRole('button', { name: 'فعال‌سازی اعلان مرورگر', exact: true }).click();
  await expect(page.getByText('اعلان‌ها روی این مرورگر فعال‌اند.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__pushCalls.permission)).toBe(1);
  const state = await (await request.get('http://127.0.0.1:4100/__inspect')).json();
  const event = state.events.find((e: any) => e.path === '/api/v1/notifications/devices/web-push');
  expect(event.body).toMatchObject({
    endpoint: 'https://push.example.invalid/authorized-test-subscription',
    expectedVersion: null,
  });
  await page.getByRole('button', { name: 'آزمون نمایش روی این دستگاه', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'ارسال Push از سرور را بررسی نمی‌کند' }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__pushCalls.localTest)).toBe(1);
  await page.getByRole('button', { name: 'خاموش کردن اعلان‌ها', exact: true }).click();
  await expect(
    page.getByText('اعلان‌های این حساب روی این مرورگر خاموش شدند.', { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('makan-push-device'))).toBeNull();
  expect(await page.evaluate(() => (window as any).__pushCalls.unsubscribe)).toBe(1);
});

test('missing server configuration never opens a browser permission prompt', async ({
  page,
  request,
}) => {
  await request.post('http://127.0.0.1:4100/__control', { data: { pushConfigured: false } });
  await browserPushStub(page);
  await settings(page);
  await expect(
    page.getByText('سرویس ارسال اعلان در سرور هنوز آماده نیست. با پشتیبانی سامانه تماس بگیرید.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'فعال‌سازی اعلان مرورگر', exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__pushCalls.permission)).toBe(0);
});

test('backend registration failure cleans the new subscription and does not claim activation', async ({
  page,
  request,
}) => {
  await browserPushStub(page);
  await settings(page);
  await expect(
    page.getByRole('button', { name: 'فعال‌سازی اعلان مرورگر', exact: true }),
  ).toBeEnabled();
  await request.post('http://127.0.0.1:4100/__control', {
    data: {
      failPath: '/devices/web-push',
      failMethod: 'POST',
      status: 503,
      code: 'PROVIDER_UNAVAILABLE',
      errorOnce: true,
    },
  });
  await page.getByRole('button', { name: 'فعال‌سازی اعلان مرورگر', exact: true }).click();
  await expect(page.locator('.form-message.error[role="alert"]')).toBeVisible();
  await expect(page.getByText('اعلان‌ها روی این مرورگر فعال‌اند.', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('makan-push-device'))).toBeNull();
  await expect.poll(() => page.evaluate(() => (window as any).__pushCalls.unsubscribe)).toBe(1);
});

test('logout revokes the push device and unsubscribes before the owner session ends', async ({
  page,
  request,
}) => {
  await browserPushStub(page);
  await settings(page);
  await page.getByRole('button', { name: 'فعال‌سازی اعلان مرورگر', exact: true }).click();
  await expect(page.getByText('اعلان‌ها روی این مرورگر فعال‌اند.', { exact: true })).toBeVisible();
  await page.locator('.account-trigger').click();
  await page.getByText('خروج از حساب', { exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  const state = await (await request.get('http://127.0.0.1:4100/__inspect')).json();
  expect(state.pushDevices).toEqual([]);
  expect(
    state.events.some(
      (e: any) => e.method === 'DELETE' && e.path.endsWith('/00000000-0000-4000-8000-000000000012'),
    ),
  ).toBe(true);
});

test('personal notifications can be marked read and remain usable on narrow phones', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await settings(page);
  await expect(
    page.getByRole('heading', { name: 'اعلان حساب آزمایشی', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'خواندم', exact: true }).click();
  await expect(page.getByRole('button', { name: 'خواندم', exact: true })).toHaveCount(0);
  await page.getByLabel('فقط خوانده‌نشده‌ها').check();
  await expect(page.getByText('اعلانی برای نمایش وجود ندارد.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: 'maintenance/generated/screenshots/pwa-notifications-mobile.png', fullPage: true });
});
