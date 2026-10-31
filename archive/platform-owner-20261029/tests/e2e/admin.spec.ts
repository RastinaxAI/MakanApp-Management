import { test, expect, type Page } from '@playwright/test';
const userId = '00000000-0000-4000-8000-000000000001';
const orgId = '00000000-0000-4000-8000-000000000002';
async function control(data: Record<string, unknown>) {
  await fetch('http://127.0.0.1:4100/__control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
async function inspect() {
  return (await (await fetch('http://127.0.0.1:4100/__inspect')).json()) as {
    refresh: number;
    events: { method: string; path: string; body: Record<string, unknown> }[];
  };
}
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('شماره همراه', { exact: true }).fill('۰۹۱۲۰۰۰۰۰۰۰');
  await page.getByRole('button', { name: 'دریافت کد ورود' }).click();
  await page.getByLabel('کد ورود', { exact: true }).fill('۱۲۳۴۵۶');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'نمای کلی', exact: true })).toBeVisible();
}
test.beforeEach(async () => {
  await control({ reset: true });
});
test('direct routes require a server session and BFF rejects foreign origins', async ({
  page,
  request,
}) => {
  await page.goto('/admin/organizations');
  await expect(page).toHaveURL(/\/login$/);
  const res = await request.post('/api/auth/challenge', {
    headers: { Origin: 'https://foreign.example' },
    data: { phoneNumber: '09120000000' },
  });
  expect(res.status()).toBe(403);
});
test('OTP login hides tokens, uses totals and logout clears access', async ({ page, context }) => {
  await login(page);
  await expect(page.locator('.metric-value').filter({ hasText: '۲۸۰' })).toBeVisible();
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === 'makan_session')?.httpOnly).toBe(true);
  expect(cookies.find((c) => c.name === 'makan_session')?.sameSite).toBe('Strict');
  expect(await page.evaluate(() => Object.keys(localStorage).some((k) => /token/i.test(k)))).toBe(
    false,
  );
  const session = await page.request.get('/api/session');
  expect(await session.text()).not.toMatch(/test-access|test-refresh|accessToken|refreshToken/);
  await page.getByRole('button', { name: /مدیر آزمایشی/ }).click();
  await page.getByRole('menuitem', { name: 'خروج از حساب' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});
test('organization list filters persist through refresh and Back', async ({ page }) => {
  await login(page);
  await page.goto('/admin/organizations');
  await expect(page.getByRole('link', { name: 'مدرسه آزمایشی ماکان', exact: true })).toBeVisible();
  await page.getByLabel('جست‌وجو', { exact: true }).fill('مدرسه');
  await page.getByRole('button', { name: 'اعمال فیلتر' }).click();
  await expect(page).toHaveURL(/search=/);
  await expect(page.getByText('۱ مورد در مجموع')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('جست‌وجو', { exact: true })).toHaveValue('مدرسه');
  await page.goBack();
  await expect(page.getByLabel('جست‌وجو', { exact: true })).toHaveValue('');
});
test('organization to memberships and classes uses independent permissions and DELETE JSON', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/organizations/' + orgId);
  await page.getByRole('link', { name: 'اعضا و عضویت‌ها', exact: true }).click();
  await expect(page.getByRole('link', { name: 'عضو آزمایشی', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'پایان عضویت', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('دلیل این اقدام', { exact: true }).fill('پایان عضویت آزمایشی مجاز');
  await dialog.getByRole('button', { name: 'پایان عضویت', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const event = (await inspect()).events.find((e) => e.method === 'DELETE');
  expect(event?.body).toEqual({ reason: 'پایان عضویت آزمایشی مجاز' });
  await page.getByRole('link', { name: 'کلاس‌ها', exact: true }).click();
  await expect(page.getByRole('link', { name: 'ریاضی هشتم', exact: true })).toBeVisible();
});
test('409 and 412 preserve drafts, 429 is distinct, and backend detail is redacted', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/organizations/' + orgId);
  await page.getByRole('button', { name: 'تعلیق سازمان', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('دلیل این اقدام', { exact: true }).fill('متن باقی می‌ماند');
  for (const status of [409, 412, 429]) {
    await control({ failPath: '/suspend', status, code: 'FIXTURE_ERROR', errorOnce: true });
    await dialog.getByRole('button', { name: 'تعلیق سازمان', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByLabel('دلیل این اقدام', { exact: true })).toHaveValue(
      'متن باقی می‌ماند',
    );
    await expect(page.getByText('DO_NOT_EXPOSE_PROVIDER_SECRET')).not.toBeVisible();
  }
  await expect(dialog.getByRole('button', { name: /انتظار/ })).toBeDisabled();
});
test('unavailable service has explicit error and never becomes zero', async ({ page }) => {
  await login(page);
  await control({ failPath: '/api/admin/v1/users', status: 503, code: 'FIXTURE_UNAVAILABLE' });
  await page.goto('/admin/users');
  await expect(page.locator('main').getByRole('alert')).toContainText('سرویس موقتاً در دسترس نیست');
  await expect(page.getByText('۰ مورد در مجموع')).not.toBeVisible();
});
test('user details retain masked phone and separate sessions', async ({ page }) => {
  await login(page);
  await page.goto('/admin/users/' + userId);
  await expect(page.getByText('0912***1234', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'نشست‌ها', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ابطال همه نشست‌ها', exact: true })).toBeVisible();
});
test('untyped learner snapshots stay hidden and typed enrollment endpoint is filtered', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/education/00000000-0000-4000-8000-000000000006');
  await expect(page.getByText(/فهرست‌های خلاصه پاسخ محدود/)).toBeVisible();
  await expect(page.getByText('untyped-private-value')).not.toBeVisible();
  const response = page.waitForResponse((r) => r.url().includes('/education/enrollments?'));
  await page.getByRole('link', { name: 'ثبت‌نام فراگیران' }).click();
  expect((await response).url()).toContain('classId=00000000-0000-4000-8000-000000000006');
});
test('owner with separate Manager membership switches server-confirmed contexts', async ({
  page,
  context,
}) => {
  await login(page);
  await page.goto('/organization');
  await page.locator('.workspace-button').click();
  await page.getByRole('button', { name: 'مدرسه آزمایشی · مدیر', exact: true }).click();
  await expect(page).toHaveURL(/\/organization$/);
  await page.goto('/organization/people');
  await expect(page.getByRole('link', { name: 'فرد سازمان اول', exact: true })).toBeVisible();
  const other = await context.newPage();
  await other.goto('/organization/people');
  await other.locator('.workspace-button').click();
  await other.getByRole('button', { name: 'سازمان دوم · مدیر', exact: true }).click();
  await expect(other).toHaveURL(/\/organization$/);
  await expect(page.getByRole('link', { name: 'فرد سازمان دوم', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'فرد سازمان اول', exact: true })).not.toBeVisible();
});
test('stale context mutation is rejected before reaching backend', async ({ page }) => {
  await login(page);
  const before = await (await page.request.get('/api/session')).json();
  await page.request.post('/api/backend/api/v1/workspaces/select', {
    headers: { Origin: new URL(page.url()).origin, 'X-Makan-Context': before.revision },
    data: {
      workspaceType: 'Organization',
      membershipId: '00000000-0000-4000-8000-000000000004',
      role: 'Manager',
    },
  });
  const res = await page.request.post('/api/backend/api/v1/organization/people', {
    headers: { Origin: new URL(page.url()).origin, 'X-Makan-Context': before.revision },
    data: {
      clientOperationId: userId,
      firstName: 'نام',
      lastName: 'آزمایش',
      displayName: null,
      reason: 'آزمایش',
    },
  });
  expect(res.status()).toBe(409);
  expect(
    (await inspect()).events.filter((e) => e.path === '/api/v1/organization/people'),
  ).toHaveLength(0);
});
test('concurrent reads refresh one session once', async ({ page }) => {
  await control({ shortTokens: true });
  await login(page);
  const state = await (await page.request.get('/api/session')).json();
  await Promise.all(
    Array.from({ length: 5 }, () =>
      page.request.get('/api/backend/api/admin/v1/users', {
        headers: { 'X-Makan-Context': state.revision },
      }),
    ),
  );
  expect((await inspect()).refresh).toBe(1);
});
test('provisioning retries keep the same logical operation ID and do not claim completion', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/organizations');
  await page.getByRole('button', { name: 'راه‌اندازی سازمان', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('نام سازمان', { exact: true }).fill('سازمان آزمون');
  await dialog.getByLabel('دلیل ایجاد', { exact: true }).fill('ایجاد آزمایشی');
  await dialog.getByRole('button', { name: 'ادامه', exact: true }).click();
  await dialog.getByRole('button', { name: 'ادامه', exact: true }).click();
  await control({ failPath: '/provisioning', status: 504, code: 'TIMEOUT', errorOnce: true });
  await dialog.getByRole('button', { name: 'ثبت نهایی سازمان', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button', { name: 'ارسال مجدد همین درخواست', exact: true }).click();
  await expect(dialog.getByText('ثبت سازمان هنوز تأیید نشده است.')).toBeVisible();
  const events = (await inspect()).events.filter((e) => e.path.endsWith('/provisioning'));
  expect(events).toHaveLength(2);
  expect(events[0].body.clientOperationId).toBe(events[1].body.clientOperationId);
});
test('metadata has no private message action; dialogs trap focus and Escape closes', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/messaging');
  await expect(page.getByRole('button', { name: /متن پیام|مشاهده گفتگو/ })).not.toBeVisible();
  await page.goto('/admin/roles?tab=assignments');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'پایان انتساب', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  expect(await page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'پایان انتساب', exact: true })).toBeFocused();
});
test('RTL responsive layouts fit 375, 768, 1440 and save review screenshots', async ({ page }) => {
  await login(page);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/admin/organizations');
    await expect(page.getByRole('heading', { name: 'سازمان‌ها', exact: true })).toBeVisible();
    await expect(page.locator('.skeleton-wrap')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: `docs/screenshots/organizations-${width}.png`, fullPage: true });
    if (width === 375) {
      await page.getByRole('button', { name: 'نمایش فیلترهای بیشتر' }).click();
      await expect(page.getByRole('dialog', { name: 'فیلترهای فهرست' })).toBeVisible();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'باز کردن منو' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  }
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'نمای کلی', exact: true })).toBeVisible();
  await expect(page.locator('.skeleton-wrap')).toHaveCount(0);
  await expect(page.locator('.metric-value').filter({ hasText: '۲۸۰' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/dashboard-1440.png', fullPage: true });
  await page.getByRole('button', { name: 'فعال کردن حالت تیره' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'docs/screenshots/dashboard-dark-1440.png', fullPage: true });
  await page.getByRole('button', { name: 'فعال کردن حالت روشن' }).click();
  await page.goto('/login');
  await expect(page.getByLabel('شماره همراه', { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/screenshots/login-1440.png', fullPage: true });
});
test('owner with authorized membership edits organizational names and reads report pagination', async ({
  page,
}) => {
  await login(page);
  await page.goto('/organization');
  await page.locator('.workspace-button').click();
  await page.getByRole('button', { name: 'مدرسه آزمایشی · مدیر', exact: true }).click();
  await expect(page).toHaveURL(/\/organization$/);
  await page.goto('/organization/people/' + userId);
  await page.getByRole('button', { name: 'ویرایش نام‌های مجاز', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('نام', { exact: true }).fill('نام تازه');
  await dialog.getByLabel('دلیل این اقدام', { exact: true }).fill('اصلاح مجاز آزمایشی');
  await dialog.getByRole('button', { name: 'ویرایش نام‌های مجاز', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const edit = (await inspect()).events.find((e) => e.method === 'PATCH');
  expect(edit?.body.expectedRowVersion).toBe('opaque-person-row');
  expect(edit?.body.expectedPersonRowVersion).toBe('opaque-person');
  expect(edit?.body).not.toHaveProperty('userId');
  const report = page.waitForResponse((r) => r.url().includes('/reports/manager/enrollments?'));
  await page.goto('/organization/reports');
  expect((await report).url()).toContain('PageNumber=1');
  await expect(page.getByRole('heading', { name: 'گزارش‌های آموزشی', exact: true })).toBeVisible();
});
test('unknown response enums fail safely at the contract boundary', async ({ page }) => {
  await login(page);
  await control({ unknownEnum: true });
  await page.goto('/admin/organizations');
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'پاسخ سرویس قابل پردازش نیست',
  );
  await expect(page.getByText('FUTURE_UNKNOWN')).not.toBeVisible();
});
test('platform modules render their actual read contracts', async ({ page }) => {
  await login(page);
  for (const url of [
    '/admin/roles',
    '/admin/moderation',
    '/admin/moderation/' + userId,
    '/admin/messaging',
    '/admin/commerce',
    '/admin/commerce/' + userId,
    '/admin/finance',
    '/admin/finance/' + userId,
    '/admin/operations',
    '/admin/operations?tab=notifications',
    '/admin/operations?tab=jobs',
    '/admin/audit',
    '/admin/account?tab=sessions',
  ]) {
    await page.goto(url);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('.skeleton-wrap')).toHaveCount(0);
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  }
});

