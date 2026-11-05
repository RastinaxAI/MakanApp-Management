import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
const id = '00000000-0000-4000-8000-000000000001';
const path = '/api/v1/sources/' + id;
const control = async (data: Record<string, unknown>) =>
  fetch('http://127.0.0.1:4100/__control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
const inspect = async () =>
  (await (await fetch('http://127.0.0.1:4100/__inspect')).json()) as {
    events: { method: string; path: string; body: Record<string, unknown> }[];
    reads: string[];
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
  const session = await (await page.request.get('/api/session')).json();
  return { 'X-Makan-Context': session.revision, Origin: new URL(page.url()).origin };
}
test.beforeEach(async () => {
  await control({ reset: true });
});
test('catalog uses exact capitalized server pagination and resets Page when searching', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/library');
  await expect(page.getByRole('link', { name: /^راهنمای کتابخانه/ })).toBeVisible();
  await page.getByRole('button', { name: 'صفحه بعد', exact: true }).click();
  await expect(page).toHaveURL(/Page=2/);
  await expect(page.getByRole('link', { name: /^منبع 20/ })).toBeVisible();
  await page.getByLabel('جست‌وجو', { exact: true }).fill('راهنمای');
  await page.getByRole('button', { name: 'اعمال فیلتر', exact: true }).click();
  await expect(page).toHaveURL(/Search=/);
  expect(new URL(page.url()).searchParams.has('Page')).toBe(false);
  await expect(page.getByRole('link', { name: /^راهنمای کتابخانه/ })).toBeVisible();
});
test('uploads a file and creates a Library source with a stable operation ID and no school class', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/library');
  await page.getByRole('button', { name: 'افزودن منبع', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('عنوان منبع', { exact: true }).fill('منبع جدید');
  await d.getByLabel('فایل منبع', { exact: true }).setInputFiles({
    name: 'guide.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-test'),
  });
  await d.getByLabel('دلیل این اقدام', { exact: true }).fill('ثبت آزمایشی');
  await control({
    failPath: '/library/sources',
    failMethod: 'POST',
    status: 503,
    code: 'DEPENDENCY_UNAVAILABLE',
    errorOnce: true,
  });
  await d.getByRole('button', { name: 'افزودن منبع', exact: true }).click();
  await expect(d.getByRole('alert')).toBeVisible();
  await d.getByRole('button', { name: 'افزودن منبع', exact: true }).click();
  await expect(page).toHaveURL('/admin/library/' + id);
  const { events } = await inspect();
  const creates = events.filter((e) => e.path === '/api/admin/v1/library/sources');
  expect(creates).toHaveLength(2);
  expect(creates[1].body).toEqual(creates[0].body);
  expect(creates[0].body).toMatchObject({
    scope: 'Library',
    classId: null,
    fileAssetId: id,
    reason: 'ثبت آزمایشی',
  });
  expect(creates[0].body.clientOperationId).toMatch(/^[0-9a-f-]{36}$/);
  expect(events.filter((e) => e.path === '/api/v1/files')).toHaveLength(1);
});
test('shared source and upload endpoints require a current independent Library permission', async ({
  page,
}) => {
  await control({ platformPermissions: ['platform.access', 'fixture.manage'] });
  await login(page);
  await expect(
    page.locator('.sidebar').getByRole('link', { name: 'منابع کتابخانه', exact: true }),
  ).toHaveCount(0);
  const h = await headers(page);
  expect((await page.request.get('/api/backend' + path, { headers: h })).status()).toBe(403);
  expect(
    (
      await page.request.post('/api/library/upload', {
        headers: h,
        multipart: {
          File: { name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') },
        },
      })
    ).status(),
  ).toBe(403);
  expect((await inspect()).reads).not.toContain(path);
});
test('does not fetch private school or personal source content even with the Library permission', async ({
  page,
}) => {
  await login(page);
  const h = await headers(page);
  for (const sourceScope of ['Class', 'Personal', 'Organization']) {
    await control({ sourceScope });
    expect(
      (await page.request.get('/api/backend' + path + '/content', { headers: h })).status(),
    ).toBe(404);
  }
  expect((await inspect()).reads).not.toContain(path + '/content');
});
test('checks canDownload on the server and honors the selected revision', async ({ page }) => {
  await login(page);
  await page.goto('/admin/library/' + id);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'دریافت فایل این بازبینی', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('guide.pdf');
  await control({ sourceCanDownload: false });
  const h = await headers(page);
  expect(
    (
      await page.request.get('/api/backend' + path + '/content?revision=1', { headers: h })
    ).status(),
  ).toBe(403);
  expect(
    (await page.request.get('/api/backend' + path + '?revision=0', { headers: h })).status(),
  ).toBe(400);
});
test('stale source publication retains reason, blocks resubmission and explicitly reloads version', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/library/' + id);
  await page.getByRole('button', { name: 'انتشار منبع', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('دلیل این اقدام', { exact: true }).fill('انتشار پس از بررسی');
  await control({ sourceVersion: 'concurrent-v2' });
  await d.getByRole('button', { name: 'انتشار منبع', exact: true }).click();
  await expect(d.getByRole('button', { name: 'انتشار منبع', exact: true })).toBeDisabled();
  await expect(d.getByLabel('دلیل این اقدام', { exact: true })).toHaveValue('انتشار پس از بررسی');
  await d.getByRole('button', { name: 'دریافت نسخه تازه و حفظ ورودی', exact: true }).click();
  await d.getByRole('button', { name: 'انتشار منبع', exact: true }).click();
  await expect(d).not.toBeVisible();
  const publishes = (await inspect()).events.filter((e) => e.path.endsWith('/publish'));
  expect(publishes).toHaveLength(2);
  expect(publishes[1].body.expectedVersion).toBe('concurrent-v2');
  await expect(page.getByRole('button', { name: 'ویرایش پیش‌نویس', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'نسخه جدید منبع', exact: true })).toBeVisible();
});
test('rejects forged school scope, class and unknown parameters before forwarding', async ({
  page,
}) => {
  await login(page);
  const h = await headers(page);
  for (const query of ['Scope=Personal', 'ClassId=' + id, 'Page=0', 'Page=1&Page=2', 'Unknown=1'])
    expect(
      (
        await page.request.get('/api/backend/api/admin/v1/library/sources?' + query, { headers: h })
      ).status(),
    ).toBe(400);
  expect(
    (
      await page.request.post('/api/backend/api/admin/v1/library/sources', {
        headers: h,
        data: {
          clientOperationId: id,
          scope: 'Personal',
          classId: null,
          title: 'x',
          description: null,
          fileAssetId: id,
          reason: 'x',
        },
      })
    ).status(),
  ).toBe(400);
  expect((await inspect()).events.filter((e) => e.path.includes('/library'))).toHaveLength(0);
});
for (const status of [403, 404, 422, 429, 503])
  test('catalog shows an independent error state for HTTP ' + status, async ({ page }) => {
    await login(page);
    await control({ failPath: '/library/sources', status, code: 'LIBRARY_TEST_FAILURE' });
    await page.goto('/admin/library');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText('LIBRARY_TEST_FAILURE', { exact: true })).toBeVisible();
    await expect(page.getByText('هنوز موردی ثبت نشده است', { exact: true })).toHaveCount(0);
  });
test('Library stays within mobile and tablet viewports', async ({ page }) => {
  await login(page);
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/admin/library/' + id);
    await expect(page.locator('h1')).toHaveText('راهنمای کتابخانه');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await fs.mkdir('maintenance/generated/integration-154c437', { recursive: true });
    await page.screenshot({
      path: `maintenance/generated/integration-154c437/library-${width}.png`,
      fullPage: true,
    });
  }
});

test('upload rejects other origins, missing files, empty files and excessive declared size', async ({
  page,
}) => {
  await login(page);
  const h = await headers(page);
  expect(
    (
      await page.request.post('/api/library/upload', {
        headers: { ...h, Origin: 'https://unrelated.example' },
        multipart: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (await page.request.post('/api/library/upload', { headers: h, multipart: {} })).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post('/api/library/upload', {
        headers: h,
        multipart: {
          File: { name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) },
        },
      })
    ).status(),
  ).toBe(413);
  const oversized = Buffer.alloc(20 * 1024 * 1024 + 1, 1);
  expect(
    (
      await page.request.post('/api/library/upload', {
        headers: h,
        multipart: { File: { name: 'large.pdf', mimeType: 'application/pdf', buffer: oversized } },
      })
    ).status(),
  ).toBe(413);
  expect((await inspect()).events.filter((e) => e.path === '/api/v1/files')).toHaveLength(0);
});

test('new revision uses its own file and current version; published content has no draft editor', async ({
  page,
}) => {
  await control({ sourcePublished: true });
  await login(page);
  await page.goto('/admin/library/' + id);
  await expect(page.getByRole('button', { name: 'ویرایش پیش‌نویس', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'نسخه جدید منبع', exact: true }).click();
  const d = page.getByRole('dialog');
  await d
    .getByLabel('فایل منبع', { exact: true })
    .setInputFiles({
      name: 'revision.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-revision'),
    });
  await d.getByLabel('دلیل این اقدام', { exact: true }).fill('بازبینی دوم');
  await d.getByRole('button', { name: 'نسخه جدید منبع', exact: true }).click();
  await expect(d).not.toBeVisible();
  const event = (await inspect()).events.find((e) => e.path.endsWith('/versions'));
  expect(event?.body).toMatchObject({
    expectedVersion: 'source-v1',
    fileAssetId: id,
    reason: 'بازبینی دوم',
  });
});

test('revoked library permission clears navigation and prevents subsequent source access', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/library');
  await expect(
    page.locator('.sidebar').getByRole('link', { name: 'منابع کتابخانه', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /^راهنمای کتابخانه/ })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await control({ platformPermissions: ['platform.access', 'fixture.manage'] });
  await page.getByRole('button', { name: 'به‌روزرسانی فهرست', exact: true }).click();
  await expect(
    page.locator('.sidebar').getByRole('link', { name: 'منابع کتابخانه', exact: true }),
  ).toHaveCount(0);
  expect(
    (await page.request.get('/api/backend' + path, { headers: await headers(page) })).status(),
  ).toBe(403);
});
