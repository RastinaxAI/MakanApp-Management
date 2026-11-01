import { test, expect, type Page } from '@playwright/test';
const userId = '00000000-0000-4000-8000-000000000001';
async function control(data: Record<string, unknown>) {
  await fetch('http://127.0.0.1:4100/__control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
async function verify(page: Page) {
  await page.goto('/login');
  await page.getByLabel('شماره همراه', { exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد ورود' }).click();
  await page.getByLabel('کد ورود', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
}
test.beforeEach(async () => {
  await control({ reset: true });
});
for (const role of [
  'Student',
  'Parent',
  'Teacher',
  'Manager',
  'PlatformAdmin',
  'ConversationOwner',
]) {
  test(`${role} cannot enter even when OTP succeeds and admin me returns 200`, async ({
    page,
    context,
  }) => {
    await control({ platformRoles: [role] });
    await verify(page);
    await expect(page.locator('.form-message[role="alert"]')).toContainText('فقط برای مالک پلتفرم');
    expect((await context.cookies()).some((c) => c.name === 'makan_session')).toBe(false);
    await expect(page.locator('.app-shell')).toHaveCount(0);
    expect((await page.request.get('/api/session')).status()).toBe(401);
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login$/);
  });
}
test('platform me 403 rejects an authenticated school Manager before creating a local session', async ({
  page,
  context,
}) => {
  await control({ manager: true });
  await verify(page);
  await expect(page.locator('.form-message[role="alert"]')).toContainText('فقط برای مالک پلتفرم');
  expect((await context.cookies()).some((c) => c.name === 'makan_session')).toBe(false);
});
test('owner role without platform.access is denied', async ({ page }) => {
  await control({ platformPermissions: ['fixture.manage'] });
  await verify(page);
  await expect(page.locator('.form-message[role="alert"]')).toContainText('فقط برای مالک پلتفرم');
});
test('mismatched platform identity is denied', async ({ page }) => {
  await control({ platformUserId: '00000000-0000-4000-8000-000000000099' });
  await verify(page);
  await expect(page.locator('.form-message[role="alert"]')).toContainText('فقط برای مالک پلتفرم');
});
test('owner entry does not grant feature permissions', async ({ page }) => {
  await control({ platformPermissions: ['platform.access'] });
  await verify(page);
  await expect(page.getByRole('heading', { name: 'نمای کلی', exact: true })).toBeVisible();
  await expect(
    page.locator('.sidebar').getByRole('link', { name: 'کاربران', exact: true }),
  ).toHaveCount(0);
  const state = await (await page.request.get('/api/session')).json();
  const response = await page.request.get('/api/backend/api/admin/v1/users', {
    headers: { 'X-Makan-Context': state.revision },
  });
  expect(response.status()).toBe(403);
  expect((await response.json()).code).toBe('PERMISSION_DENIED');
});
test('revoking owner role invalidates session and blocks direct BFF access', async ({ page }) => {
  await verify(page);
  await expect(page.getByRole('heading', { name: 'نمای کلی', exact: true })).toBeVisible();
  const state = await (await page.request.get('/api/session')).json();
  await page.waitForLoadState('networkidle');
  await control({ platformRoles: ['PlatformAdmin'] });
  const response = await page.request.get('/api/backend/api/admin/v1/users', {
    headers: { 'X-Makan-Context': state.revision },
  });
  expect(response.status()).toBe(403);
  expect((await response.json()).code).toBe('PLATFORM_OWNER_REQUIRED');
  expect((await page.request.get('/api/session')).status()).toBe(401);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});
test('revocation is checked on a direct page request before any protected shell is returned', async ({
  page,
}) => {
  await verify(page);
  await expect(page.getByRole('heading', { name: 'نمای کلی', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await control({ manager: true });
  const denied = await page.request.get('/admin/organizations', { maxRedirects: 0 });
  expect(denied.status()).toBe(307);
  expect(denied.headers().location).toMatch(/^\/login(?:\?access=owner-required)?$/);
  expect(await denied.text()).not.toContain('class="app-shell"');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login(?:\?access=owner-required)?$/);
  await expect(page.locator('.app-shell')).toHaveCount(0);
});
test('owner status never grants a school Manager workspace', async ({ page }) => {
  await verify(page);
  await expect(page.getByRole('heading', { name: 'نمای کلی', exact: true })).toBeVisible();
  const state = await (await page.request.get('/api/session')).json();
  const result = await page.request.get('/api/backend/api/v1/organization/people', {
    headers: { 'X-Makan-Context': state.revision },
  });
  expect(result.status()).toBe(404);
  for (const path of ['/organization', '/personal', '/about']) expect((await page.request.get(path)).status()).toBe(404);
  expect(state.platform.userId).toBe(userId);
});
