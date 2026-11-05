import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
const id = '00000000-0000-4000-8000-000000000001';
const classId = '00000000-0000-4000-8000-000000000006';
const membership = '00000000-0000-4000-8000-000000000004';
const detail = '/api/admin/v1/personal-class-requests/' + id;
const grantPath = `/api/admin/v1/personal-classes/${classId}/academic-permissions/${membership}`;
const control = async (data: Record<string, unknown>) =>
  fetch('http://127.0.0.1:4100/__control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
const inspect = async () =>
  (await (await fetch('http://127.0.0.1:4100/__inspect')).json()) as {
    events: { path: string; method: string; body: Record<string, unknown> }[];
    reads: string[];
    accountCursorRequests: (string | null)[];
  };
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('شماره همراه', { exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  await page.getByLabel('کد ورود', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('نمای کلی');
}
async function headers(page: Page) {
  const s = await (await page.request.get('/api/session')).json();
  return { Origin: new URL(page.url()).origin, 'X-Makan-Context': s.revision };
}
async function review(page: Page) {
  await page.goto('/admin/personal-class-requests/' + id);
  await expect(page.locator('h1')).toHaveText('کلاس شخصی آزمایشی');
  await page.getByRole('button', { name: 'ثبت تصمیم بررسی', exact: true }).click();
  return page.getByRole('dialog');
}
const invalidation = (key: string) => ({
  eventId: '00000000-0000-4000-8000-000000000022',
  streamVersion: 'opaque-22',
  conversation: null,
  invalidation: {
    eventId: '00000000-0000-4000-8000-000000000022',
    streamVersion: 'opaque-22',
    key,
    resourceId: id,
    contextRevision: 'fixture-context',
    occurredAtUtc: new Date().toISOString(),
  },
});
test.beforeEach(async () => {
  await control({ reset: true });
});
test('reviews a real request version without treating approval as readiness or suggested manager authority', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/personal-classes');
  await page.getByRole('link', { name: /^کلاس شخصی آزمایشی/ }).click();
  await page.getByRole('button', { name: 'ثبت تصمیم بررسی', exact: true }).click();
  const d = page.getByRole('dialog');
  await expect(d.getByLabel('تصمیم بررسی', { exact: true }).locator('option')).toHaveCount(3);
  expect(
    await d
      .getByLabel('تصمیم بررسی', { exact: true })
      .locator('option')
      .evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value)),
  ).toEqual(['NeedsChanges', 'Approved', 'Rejected']);
  await d.getByLabel('تصمیم بررسی', { exact: true }).selectOption('Approved');
  await d.getByLabel('دلیل این اقدام', { exact: true }).fill('تأیید تشکیل پس از بررسی');
  await d.getByRole('button', { name: 'ثبت تصمیم بررسی', exact: true }).click();
  await expect(d).not.toBeVisible();
  const event = (await inspect()).events.find((e) => e.path.endsWith('/review'));
  expect(event?.body).toEqual({
    expectedVersion: 'AAAAAAAAAAE=',
    decision: 'Approved',
    reason: 'تأیید تشکیل پس از بررسی',
    finalManagerUserId: null,
  });
  await expect(page.getByText(/درخواست تأیید شده است/)).toBeVisible();
  await expect(page.getByText('در حال آماده‌سازی', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ثبت تصمیم بررسی', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'پرونده کلاس و مجوزهای آموزشی', exact: true }).click();
  await expect(page).toHaveURL('/admin/personal-classes/' + classId);
});
test('review conflict requires explicit fresh version and preserves reason', async ({ page }) => {
  await login(page);
  const d = await review(page);
  await d.getByLabel('دلیل این اقدام', { exact: true }).fill('اصلاح توضیحات');
  await control({ personalVersion: 'AAAAAAAAAAI=' });
  await d.getByRole('button', { name: 'ثبت تصمیم بررسی', exact: true }).click();
  await expect(d.getByRole('button', { name: 'ثبت تصمیم بررسی', exact: true })).toBeDisabled();
  await d.getByRole('button', { name: 'دریافت وضعیت تازه و حفظ ورودی', exact: true }).click();
  await expect(d.getByLabel('دلیل این اقدام', { exact: true })).toHaveValue('اصلاح توضیحات');
  await d.getByRole('button', { name: 'ثبت تصمیم بررسی', exact: true }).click();
  await expect(d).not.toBeVisible();
  const events = (await inspect()).events.filter((e) => e.path.endsWith('/review'));
  expect(events).toHaveLength(2);
  expect(events[1].body.expectedVersion).toBe('AAAAAAAAAAI=');
});
test('read permission cannot review or grant academic privileges', async ({ page }) => {
  await control({ platformPermissions: ['platform.access', 'platform.personal_classes.read'] });
  await login(page);
  await page.goto('/admin/personal-class-requests/' + id);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ثبت تصمیم بررسی', exact: true })).toHaveCount(0);
  const h = await headers(page);
  expect(
    (
      await page.request.post('/api/backend' + detail + '/review', {
        headers: h,
        data: { expectedVersion: 'AAAAAAAAAAE=', decision: 'Approved', reason: 'بررسی' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.get(
        `/api/backend/api/admin/v1/personal-classes/${classId}/academic-permissions`,
        { headers: h },
      )
    ).status(),
  ).toBe(403);
});
test('grant-only owner sees the academic section without gaining the review queue', async ({
  page,
}) => {
  await control({
    platformPermissions: [
      'platform.access',
      'platform.personal_classes.academic_permissions.manage',
    ],
  });
  await login(page);
  await expect(
    page.locator('.sidebar').getByRole('link', { name: 'کلاس‌های شخصی', exact: true }),
  ).toBeVisible();
  await page.goto('/admin/personal-classes');
  await expect(
    page.getByRole('heading', { name: 'درخواست‌های تشکیل کلاس', exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('شناسه کلاس', { exact: true }).fill(classId);
  await page.getByRole('button', { name: 'مشاهده مجوزها و سوابق', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'اعطای مجوز به عضویت', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText('برای انتخاب مدیر، مجوز مشاهده اعضای کلاس نیز لازم است.'),
  ).toBeVisible();
});
test('grant uses automatically read membership version, null first grant and identical payload after uncertain failure', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/personal-classes/' + classId);
  await page.getByRole('button', { name: 'اعطای مجوز به عضویت', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByRole('radio', { name: 'انتخاب مدیر آزمایشی', exact: true }).check();
  await expect(d.getByText('اطلاعات عضویت و مجوز جاری از سرور دریافت شده‌اند.')).toBeVisible();
  await expect(d.getByLabel('نسخه جاری دوره عضویت', { exact: true })).toHaveCount(0);
  await d.getByRole('checkbox', { name: 'ساخت تکلیف', exact: true }).check();
  await d.getByRole('checkbox', { name: 'ارزیابی و نمره‌دهی', exact: true }).check();
  await d.getByLabel('دلیل این اقدام', { exact: true }).fill('اعطای اختیار آموزشی');
  await control({
    failPath: '/academic-permissions/',
    failMethod: 'PUT',
    status: 503,
    code: 'DEPENDENCY_UNAVAILABLE',
    errorOnce: true,
  });
  await d.getByRole('button', { name: 'اعطای مجوز به عضویت', exact: true }).click();
  await expect(d.getByRole('alert')).toBeVisible();
  await expect(d.getByLabel('دلیل این اقدام', { exact: true })).toBeDisabled();
  await d.getByRole('button', { name: 'ارسال مجدد همین درخواست', exact: true }).click();
  await expect(d).not.toBeVisible();
  const events = (await inspect()).events.filter((e) => e.path === grantPath);
  expect(events).toHaveLength(2);
  expect(events[0].body).toEqual(events[1].body);
  expect(events[1].body).toMatchObject({
    capabilities: 'AuthorAssignments, Grade',
    expectedMembershipVersion: 'AAAAAAAAAAI=',
    expectedGrantVersion: null,
    reason: 'اعطای اختیار آموزشی',
  });
  expect(events[1].body.clientOperationId).toMatch(/^[0-9a-f-]{36}$/);
});
test('grant conflict reloads both independent versions and preserves reason without manual rowversion', async ({
  page,
}) => {
  await control({ grantVersion: 'AAAAAAAAAAM=', grantCapabilities: 'Grade' });
  await login(page);
  await page.goto('/admin/personal-classes/' + classId);
  await page.getByRole('button', { name: 'تغییر یا لغو مجوز', exact: true }).click();
  const d = page.getByRole('dialog');
  await expect(d.getByText('اطلاعات عضویت و مجوز جاری از سرور دریافت شده‌اند.')).toBeVisible();
  await d.getByLabel('دلیل این اقدام', { exact: true }).fill('اصلاح اختیار');
  await control({ grantVersion: 'AAAAAAAAAAQ=', membershipVersion: 'AAAAAAAAAAU=' });
  await d.getByRole('button', { name: 'تغییر یا لغو مجوز', exact: true }).click();
  await expect(d.getByRole('button', { name: 'تغییر یا لغو مجوز', exact: true })).toBeDisabled();
  await d.getByRole('button', { name: 'دریافت وضعیت تازه و حفظ ورودی', exact: true }).click();
  await expect(d.getByLabel('دلیل این اقدام', { exact: true })).toHaveValue('اصلاح اختیار');
  await expect(d.getByLabel('نسخه جاری دوره عضویت', { exact: true })).toHaveCount(0);
  await d.getByRole('checkbox', { name: 'ارزیابی و نمره‌دهی', exact: true }).uncheck();
  await d.getByRole('button', { name: 'تغییر یا لغو مجوز', exact: true }).click();
  await expect(d).not.toBeVisible();
  const events = (await inspect()).events.filter((e) => e.path === grantPath);
  expect(events[1].body).toMatchObject({
    capabilities: 'None',
    expectedMembershipVersion: 'AAAAAAAAAAU=',
    expectedGrantVersion: 'AAAAAAAAAAQ=',
  });
});
test('new commands reject malformed versions, non-review decisions and oversized pages before forwarding', async ({
  page,
}) => {
  await login(page);
  const h = await headers(page);
  for (const data of [
    { expectedVersion: 'fake', decision: 'Approved', reason: 'بررسی' },
    { expectedVersion: 'AAAAAAAAAAE=', decision: 'Draft', reason: 'بررسی' },
    { expectedVersion: 'AAAAAAAAAAE=', decision: 'Approved', reason: '   ' },
  ])
    expect(
      (await page.request.post('/api/backend' + detail + '/review', { headers: h, data })).status(),
    ).toBe(400);
  expect(
    (
      await page.request.get('/api/backend/api/admin/v1/personal-class-requests?pageSize=101', {
        headers: h,
      })
    ).status(),
  ).toBe(400);
  expect((await inspect()).events.filter((e) => e.path.endsWith('/review'))).toHaveLength(0);
});
test('moderation expansion and removal require review and enforce together', async ({ page }) => {
  await control({
    platformPermissions: ['platform.access', 'fixture.manage', 'platform.moderation.review'],
  });
  await login(page);
  const h = await headers(page);
  for (const action of ['expanded-context', 'enforce-content-removal'])
    expect(
      (
        await page.request.post(`/api/backend/api/admin/v1/moderation/cases/${id}/${action}`, {
          headers: h,
          data: { expectedVersion: 'fixture', reason: 'بررسی' },
        })
      ).status(),
    ).toBe(403);
  expect(
    (await inspect()).events.filter((e) => /expanded-context|enforce-content-removal/.test(e.path)),
  ).toHaveLength(0);
});
test('request read models and realtime bridge do not expose private conversation or learner payloads', async ({
  page,
}) => {
  await login(page);
  const h = await headers(page);
  const detailResponse = await page.request.get('/api/backend' + detail, { headers: h });
  expect(detailResponse.status()).toBe(200);
  expect(await detailResponse.text()).not.toContain('DO_NOT_EXPOSE_PRIVATE_ANSWER');
  const event = invalidation('personalClassFormation');
  await control({
    accountChanges: [{ ...event, privateLearnerAnswer: 'PRIVATE', privateMessageBody: 'PRIVATE' }],
  });
  const realtime = await page.request.get('/api/realtime', { headers: h });
  expect(realtime.status()).toBe(200);
  expect(realtime.headers()['cache-control']).toContain('no-store');
  const data = await realtime.json();
  expect(data.events).toEqual([
    { eventId: event.eventId, streamVersion: event.streamVersion, key: 'personalClassFormation' },
  ]);
  expect(JSON.stringify(data)).not.toContain('PRIVATE');
  expect(data).not.toHaveProperty('changes');
  expect(
    (
      await page.request.get('/api/backend/api/v1/realtime/account-inbox/changes', { headers: h })
    ).status(),
  ).toBe(404);
});
test('formation invalidation refetches authoritative detail and deduplicates repeated delivery', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/personal-class-requests/' + id);
  await expect(page.locator('h1')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await control({
    personalStatus: 'Approved',
    accountChanges: [invalidation('personalClassFormation')],
  });
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText(/درخواست تأیید شده است/)).toBeVisible();
  await page.waitForLoadState('networkidle');
  const count = (await inspect()).reads.filter((p) => p === detail).length;
  const polled = page.waitForResponse((r) => r.url().includes('/api/realtime'));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await polled;
  await page.waitForLoadState('networkidle');
  expect((await inspect()).reads.filter((p) => p === detail).length).toBe(count);
});
test('stream resync reloads the snapshot and starts with a fresh cursor', async ({ page }) => {
  await login(page);
  await page.goto('/admin/personal-class-requests/' + id);
  await expect(page.locator('h1')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await control({ resyncOnce: true });
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(async () => (await inspect()).accountCursorRequests.at(-1)).toBe(null);
  await expect(page.locator('h1')).toHaveText('کلاس شخصی آزمایشی');
});

test('a resource-specific 403 refreshes permissions once and remains an error without a reload loop', async ({
  page,
}) => {
  await login(page);
  await page.waitForLoadState('networkidle');
  const before = (await inspect()).reads.filter((p) => p === '/api/v1/me').length;
  await control({ failPath: '/personal-class-requests/', status: 403, code: 'AUTH_FORBIDDEN' });
  await page.goto('/admin/personal-class-requests/' + id);
  await expect(page.locator('.error-state[role="alert"]')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(
    (await inspect()).reads.filter((p) => p === '/api/v1/me').length - before,
  ).toBeLessThanOrEqual(2);
  await expect(page.locator('.bootstrap')).toHaveCount(0);
});
test('new detail and grant form fit mobile and tablet widths', async ({ page }) => {
  await login(page);
  await fs.mkdir('maintenance/generated/integration-80c2e61', { recursive: true });
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/admin/personal-class-requests/' + id);
    await expect(page.locator('h1')).toHaveText('کلاس شخصی آزمایشی');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `maintenance/generated/integration-80c2e61/request-${width}.png`,
      fullPage: true,
    });
    await page.goto('/admin/personal-classes/' + classId);
    await page.getByRole('button', { name: 'اعطای مجوز به عضویت', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('dialog').getByRole('button', { name: 'بستن', exact: true }).click();
  }
});

test('shows actual class members while only current Managers are selectable for a platform base grant', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/personal-classes/' + classId + '?tab=members');
  await expect(page.getByText('معلم آزمایشی', { exact: true })).toBeVisible();
  await page.goto('/admin/personal-classes/' + classId);
  await page.getByRole('button', { name: 'اعطای مجوز به عضویت', exact: true }).click();
  const d = page.getByRole('dialog');
  await expect(d.getByRole('radio', { name: 'انتخاب مدیر آزمایشی', exact: true })).toBeVisible();
  await expect(d.getByRole('radio', { name: /معلم/ })).toHaveCount(0);
  await expect(d.getByRole('button', { name: 'اعطای مجوز به عضویت', exact: true })).toBeDisabled();
  await d.getByLabel('جست‌وجوی مدیر کلاس', { exact: true }).fill('پیدا نمی‌شود');
  await expect(d.getByText('مدیر فعالی با این جست‌وجو پیدا نشد.')).toBeVisible();
});

test('a member who stops being Manager cannot receive another platform grant after conflict reload', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/personal-classes/' + classId);
  await page.getByRole('button', { name: 'اعطای مجوز به عضویت', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByRole('radio', { name: 'انتخاب مدیر آزمایشی', exact: true }).check();
  await expect(d.getByText('اطلاعات عضویت و مجوز جاری از سرور دریافت شده‌اند.')).toBeVisible();
  await d.getByRole('checkbox', { name: 'ساخت تکلیف', exact: true }).check();
  await d.getByLabel('دلیل این اقدام', { exact: true }).fill('آزمون تغییر نقش');
  await control({ membershipRole: 'Teacher', membershipCanGrant: false });
  await d.getByRole('button', { name: 'اعطای مجوز به عضویت', exact: true }).click();
  await d.getByRole('button', { name: 'دریافت وضعیت تازه و حفظ ورودی', exact: true }).click();
  await expect(d.getByText(/این عضویت دیگر مدیر فعال/).first()).toBeVisible();
  await expect(d.getByRole('button', { name: 'اعطای مجوز به عضویت', exact: true })).toBeDisabled();
  expect((await inspect()).events.filter((e) => e.path === grantPath)).toHaveLength(1);
});

test('published member query bounds are checked and membership data stays metadata only', async ({
  page,
}) => {
  await login(page);
  const h = await headers(page);
  const root = `/api/backend/api/admin/v1/personal-classes/${classId}/memberships`;
  for (const query of [
    'pageSize=101',
    'activeOnly=yes',
    'search=' + encodeURIComponent('x'.repeat(101)),
  ])
    expect((await page.request.get(root + '?' + query, { headers: h })).status()).toBe(400);
  const data = await page.request.get(root + '?activeOnly=true&role=Manager', { headers: h });
  expect(data.status()).toBe(200);
  expect((await data.json()).items[0].membershipVersion).toBe('AAAAAAAAAAI=');
  expect(await data.text()).not.toContain('privateAnswer');
});
