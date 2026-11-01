import { test, expect } from '@playwright/test';

test('deployment identifies the management service without a session or backend request', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ application: 'makan-management-panel', status: 'ok' });
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(response.headers()['set-cookie']).toBeUndefined();
});

test.beforeEach(async ({ request }) => {
  await request.post('http://127.0.0.1:4100/__control', { data: { reset: true } });
});

test('the root opens the canonical entry page and protected pages return there', async ({ request }) => {
  const root = await request.get('/', { maxRedirects: 0 });
  expect(root.status()).toBe(307);
  expect(root.headers().location).toBe('/login');
  const entry = await request.get('/login', { maxRedirects: 0 });
  expect(entry.status()).toBe(200);
  expect(await entry.text()).toContain('شماره همراه');
  const protectedPage = await request.get('/admin', { maxRedirects: 0 });
  expect(protectedPage.status()).toBe(307);
  expect(protectedPage.headers().location).toBe('/login');
});

test('both entry links render the owner login without permanent redirect loops', async ({ request }) => {
  for (const path of ['/login', '/enter']) {
    const response = await request.get(path + '?access=owner-required', { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers().location).toBeUndefined();
    const html = await response.text();
    expect(html).toContain('data-application="makan-management-panel"');
    expect(html).toContain('data-screen="owner-login"');
    expect(html).toContain('login-brand-panel');
    expect(html).not.toContain('به ماکان خوش آمدید');
  }
});

test('login constrains the national mobile and six-digit OTP before sending', async ({ page }) => {
  let challenges = 0,
    verifications = 0;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/auth/challenge')) challenges++;
    if (r.url().endsWith('/api/auth/verify')) verifications++;
  });
  await page.goto('/login');
  const phone = page.getByLabel('شماره همراه', { exact: true });
  await expect(phone).toHaveAttribute('maxlength', '11');
  for (const value of ['08120000105', '0912000010']) {
    await phone.fill(value);
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
    await expect(page.locator('.field-error')).toContainText('۱۱ رقم');
  }
  expect(challenges).toBe(0);
  await phone.fill('۰۹۱۲۰۰۰۰۰۰۰');
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  const code = page.getByLabel('کد ورود', { exact: true });
  await expect(code).toHaveAttribute('maxlength', '6');
  for (const value of ['12345', 'abcdef']) {
    await code.fill(value);
    await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
    await expect(page.locator('.field-error')).toContainText('دقیقاً ۶ رقم');
  }
  expect(verifications).toBe(0);
  await code.fill('۱۲۳۴۵۶');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('نمای کلی');
  expect(challenges).toBe(1);
  expect(verifications).toBe(1);
});

test('direct auth requests cannot bypass mobile and OTP length rules', async ({
  request,
  baseURL,
}) => {
  const headers = { Origin: baseURL! };
  for (const phoneNumber of ['08120000105', '0912000010', '091200001050', '+989120000105']) {
    const response = await request.post('/api/auth/challenge', { headers, data: { phoneNumber } });
    expect(response.status()).toBe(400);
  }
  for (const code of ['12345', '1234567', 'abcdef']) {
    const response = await request.post('/api/auth/verify', {
      headers,
      data: {
        phoneNumber: '09120000000',
        challengeId: '00000000-0000-4000-8000-000000000001',
        code,
      },
    });
    expect(response.status()).toBe(400);
  }
});
