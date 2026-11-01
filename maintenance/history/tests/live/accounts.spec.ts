import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('docs/live-test-accounts.json', 'utf8')) as {
  accounts: { phoneNumber: string; loginReady: boolean; platformStatus: number }[];
};
const results: { account: string; status: string | undefined; error?: string }[] = [];

test('phone input rejects shorter, longer and international numbers before requesting OTP', async ({
  page,
}) => {
  const challenges: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/auth/challenge')) challenges.push(request.url());
  });
  await page.goto('/login');
  for (const phone of ['0910000000', '091000000000', '+12025550171']) {
    await page.getByLabel('شماره همراه', { exact: true }).fill(phone);
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
    await expect(
      page.getByText('شماره همراه باید ۱۱ رقم باشد و با ۰۹ شروع شود.', { exact: true }),
    ).toBeVisible();
  }
  expect(challenges).toHaveLength(0);
});
test.afterEach(async ({}, info) => {
  results.push({
    account: info.title,
    status: info.status,
    ...(info.error ? { error: info.error.message } : {}),
  });
  fs.writeFileSync(
    'docs/live-test-browser-results.json',
    JSON.stringify(
      {
        date: '2026-10-24',
        baseUrl: 'http://127.0.0.1:3000',
        backend: 'http://94.184.32.84',
        results,
        passed: results.filter((r) => r.status === 'passed').length,
        failed: results.filter((r) => r.status !== 'passed').length,
      },
      null,
      2,
    ),
  );
});
for (const account of data.accounts) {
  test(`real non-owner ${account.phoneNumber} is denied after successful OTP`, async ({
    page,
    context,
  }) => {
    expect(account.loginReady).toBe(true);
    expect(account.platformStatus).toBe(403);
    await page.goto('/login');
    await page.getByLabel('شماره همراه', { exact: true }).fill(account.phoneNumber);
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
    await page.getByLabel('کد ورود', { exact: true }).fill('123456');
    const verification = page.waitForResponse((r) => r.url().endsWith('/api/auth/verify'));
    await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
    const denied = await verification;
    expect(denied.status()).toBe(403);
    expect((await denied.json()).code).toBe('PLATFORM_OWNER_REQUIRED');
    await expect(page.locator('.form-message[role="alert"]')).toContainText('فقط برای مالک پلتفرم');
    await expect(page.locator('.app-shell')).toHaveCount(0);
    expect((await context.cookies()).some((c) => c.name === 'makan_session')).toBe(false);
    expect((await page.request.get('/api/session')).status()).toBe(401);
    const direct = await page.request.get('/admin', { maxRedirects: 0 });
    expect(direct.status()).toBe(307);
    expect(direct.headers().location).toBe('/login');
  });
}
