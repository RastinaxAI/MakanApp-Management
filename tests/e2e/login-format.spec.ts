import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('http://127.0.0.1:4100/__control', { data: { reset: true } });
});

test('the root opens the canonical entry page and protected pages return there', async ({ request }) => {
  const root = await request.get('/', { maxRedirects: 0 });
  expect(root.status()).toBe(307);
  expect(root.headers().location).toBe('/enter');
  const entry = await request.get('/enter', { maxRedirects: 0 });
  expect(entry.status()).toBe(200);
  expect(await entry.text()).toContain('شماره همراه');
  const protectedPage = await request.get('/admin', { maxRedirects: 0 });
  expect(protectedPage.status()).toBe(307);
  expect(protectedPage.headers().location).toBe('/enter');
});

test('legacy login links preserve query parameters when moved to enter', async ({ request }) => {
  const response = await request.get('/login?step=mfa&access=owner-required', { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe('/enter?step=mfa&access=owner-required');
});

test('login constrains the national mobile and six-digit OTP before sending', async ({ page }) => {
  let challenges = 0,
    verifications = 0;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/auth/challenge')) challenges++;
    if (r.url().endsWith('/api/auth/verify')) verifications++;
  });
  await page.goto('/enter');
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
