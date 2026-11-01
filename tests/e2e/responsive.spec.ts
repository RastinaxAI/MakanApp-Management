import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('شماره همراه', { exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  await page.getByLabel('کد ورود', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('نمای کلی');
}
async function noPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
}
test.beforeEach(async ({ request }) => {
  await request.post('http://127.0.0.1:4100/__control', { data: { reset: true } });
});

test('anonymous preview routes are removed and login offers authentication only', async ({
  page,
  request,
}) => {
  await page.goto('/login');
  await expect(page.locator('a[href^="/demo"]')).toHaveCount(0);
  for (const path of ['/demo', '/demo/admin', '/demo/admin/users', '/demo/organization'])
    expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(404);
  expect((await request.get('/admin', { maxRedirects: 0 })).status()).toBe(307);
});

for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
  test(`owner sections fit ${width}px without page-wide horizontal scroll`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await noPageOverflow(page);
    await login(page);
    for (const section of [
      '',
      'organizations',
      'users',
      'education',
      'roles',
      'commerce',
      'finance',
      'moderation',
      'messaging',
      'operations',
      'audit',
      'account',
    ]) {
      await page.goto('/admin' + (section ? '/' + section : ''));
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('.skeleton-wrap')).toHaveCount(0);
      await noPageOverflow(page);
    }
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `maintenance/generated/screenshots/responsive-account-${width}.png`,
      fullPage: true,
    });
  });
}

test('phone cards preserve all fields, and changing viewport restores a real table', async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin/users');
  await expect(page.locator('.data-card').first()).toBeVisible();
  await expect(
    page.locator('.data-card').first().getByText('وضعیت حساب', { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.data-card').first().getByText('تاریخ ثبت‌نام', { exact: true }),
  ).not.toBeVisible();
  await page.locator('.data-card').first().locator('summary').click();
  await expect(
    page.locator('.data-card').first().getByText('تاریخ ثبت‌نام', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('table')).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.locator('.data-card')).toHaveCount(0);
  await noPageOverflow(page);
});

for (const width of [320, 768, 1024]) {
  test(`navigation drawer is usable and closes on navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    const menu = page.getByRole('button', { name: 'باز کردن منو', exact: true });
    await expect(menu).toBeVisible();
    await menu.click();
    const dialog = page.getByRole('dialog', { name: 'منوی مدیریت' });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await dialog.getByRole('link', { name: 'کاربران', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(dialog).toHaveCount(0);
    await noPageOverflow(page);
  });
}

test('tablet filters and narrow setup dialog retain controls without a real mutation', async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/admin/education');
  await page.getByRole('button', { name: 'نمایش فیلترهای بیشتر', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'سازمان', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'بستن', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/admin/organizations');
  await page.getByRole('button', { name: 'راه‌اندازی سازمان', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('نام سازمان', { exact: true }).fill('سازمان آزمایشی رابط');
  await dialog.getByLabel('دلیل ایجاد', { exact: true }).fill('فقط بررسی اندازه فرم');
  await dialog.getByRole('button', { name: 'ادامه', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'انتخاب مدیر اولیه', exact: true }),
  ).toBeVisible();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: 'maintenance/generated/screenshots/responsive-setup-320.png', fullPage: false });
  await dialog.getByRole('button', { name: 'بستن', exact: true }).click();
});
