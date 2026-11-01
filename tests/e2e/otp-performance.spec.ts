import { expect, test } from '@playwright/test';
test.beforeEach(async ({ request }) => { await request.post('http://127.0.0.1:4100/__control', { data: { reset: true } }); });
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login?step=mfa');
  await page.getByLabel('شماره همراه', { exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  await page.getByLabel('کد ورود', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('نمای کلی');
  await expect(page.locator('.skeleton-wrap')).toHaveCount(0);
}
test('OTP admits the verified owner without MFA and retired endpoints are unavailable', async ({ page }) => {
  const mfaRequests: string[] = [];
  page.on('request', r => { if (r.url().includes('/mfa')) mfaRequests.push(r.url()); });
  await login(page);
  expect(mfaRequests).toEqual([]);
  await page.goto('/admin/account?tab=mfa');
  await expect(page.getByRole('heading', { name: 'اطلاعات حساب', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /MFA/ })).toHaveCount(0);
  expect((await page.request.get('/api/auth/mfa')).status()).toBe(404);
  expect((await page.request.get('/api/backend/api/admin/v1/mfa')).status()).toBe(404);
});
test('authorized reads overlap while owner identity is still checked for every request', async ({ page, request }) => {
  await login(page);
  const state = await (await page.request.get('/api/session')).json();
  await request.post('http://127.0.0.1:4100/__control', { data: { readDelayMs: 80, maxConcurrentReads: 0, reads: [] } });
  const paths = ['/api/admin/v1/users','/api/admin/v1/organizations','/api/admin/v1/education/classes'];
  const responses = await Promise.all(paths.map(path => page.request.get('/api/backend'+path, { headers: { 'X-Makan-Context': state.revision } })));
  expect(responses.map(r => r.status())).toEqual([200,200,200]);
  const inspected = await (await request.get('http://127.0.0.1:4100/__inspect')).json();
  expect(inspected.maxConcurrentReads).toBeGreaterThanOrEqual(3);
  expect(inspected.reads.filter((p: string) => p === '/api/admin/v1/me')).toHaveLength(3);
});
