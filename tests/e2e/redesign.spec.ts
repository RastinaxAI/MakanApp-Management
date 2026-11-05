import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
const folder =
  process.env.MAKAN_GUIDE_SCREENSHOTS === 'true'
    ? 'docs/screenshots/redesign-20261030'
    : 'maintenance/generated/redesign-screenshots';
async function ready(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('.skeleton-wrap')).toHaveCount(0);
}
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('شماره همراه', { exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  await page.getByLabel('کد ورود', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('نمای کلی');
}
async function fits(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    .toBe(true);
}
test.beforeEach(async () => {
  await fetch('http://127.0.0.1:4100/__control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reset: true }),
  });
  await fs.mkdir(folder, { recursive: true });
});
test('new workspace and core pages fit desktop tablet and mobile', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/login');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: folder + '/login-desktop.png' });
  await login(page);
  await ready(page);
  await fits(page);
  await page.screenshot({ path: folder + '/dashboard-desktop.png', fullPage: false });
  await page.getByRole('button', { name: 'فعال کردن حالت تیره', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'تازه‌سازی', exact: true })).toHaveCSS(
    'background-color',
    'rgb(23, 34, 52)',
  );
  await page.screenshot({ path: folder + '/dashboard-dark.png' });
  await page.getByRole('button', { name: 'فعال کردن حالت روشن', exact: true }).click();
  await expect(page.getByRole('button', { name: 'تازه‌سازی', exact: true })).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  for (const section of ['organizations', 'users', 'commerce', 'roles', 'operations', 'account']) {
    await page.goto('/admin/' + section);
    await ready(page);
    await fits(page);
    await page.screenshot({ path: folder + '/' + section + '-desktop.png' });
  }
  await page.goto('/admin');
  await ready(page);
  await page.setViewportSize({ width: 820, height: 1024 });
  await fits(page);
  await page.screenshot({ path: folder + '/dashboard-tablet.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await fits(page);
  await page.screenshot({ path: folder + '/dashboard-mobile.png', fullPage: false });
  await page.goto('/admin/users');
  await ready(page);
  await fits(page);
  const card = page.locator('.data-card').first();
  await expect(card.getByText('تاریخ ثبت‌نام', { exact: true })).not.toBeVisible();
  await card.locator('summary').click();
  await expect(card.getByText('تاریخ ثبت‌نام', { exact: true })).toBeVisible();
  await page.screenshot({ path: folder + '/users-mobile.png', fullPage: false });
});
test('keyboard search and mobile navigation lead to the selected real record', async ({ page }) => {
  await login(page);
  await page.keyboard.press('Control+k');
  const search = page.getByRole('dialog', { name: 'پیدا کردن سازمان یا کاربر' });
  await expect(search).toBeVisible();
  await search.getByLabel('عبارت جست‌وجوی سراسری').fill('کاربر');
  await search.getByRole('link', { name: /کاربر آزمایشی/ }).click();
  await expect(page).toHaveURL(/\/admin\/users\/00000000-0000-4000-8000-000000000001$/);
  await expect(search).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'باز کردن منو', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'منوی مدیریت' });
  await menu.getByRole('link', { name: 'سازمان‌ها', exact: true }).click();
  await expect(menu).not.toBeVisible();
  await expect(page).toHaveURL(/\/admin\/organizations$/);
  await fits(page);
});
test('setup retains named selections and confirmation in a narrow dialog', async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/organizations');
  await page.getByRole('button', { name: 'راه‌اندازی سازمان', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('نام سازمان', { exact: true }).fill('سازمان بررسی رابط');
  await dialog.getByLabel('دلیل ایجاد', { exact: true }).fill('بررسی طراحی بدون ثبت');
  await dialog.getByRole('button', { name: 'ادامه', exact: true }).click();
  await dialog.getByRole('button', { name: 'انتخاب مدیر اولیه', exact: true }).click();
  await dialog.getByRole('button', { name: /کاربر آزمایشی/ }).click();
  await page.screenshot({ path: folder + '/setup-mobile.png' });
  await dialog.getByRole('button', { name: 'ادامه', exact: true }).click();
  await expect(dialog.getByText('کاربر آزمایشی', { exact: true })).toBeVisible();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await fits(page);
});
test('date filters use a local date picker and preserve the selected time after reload', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/audit');
  await page.getByRole('button', { name: 'نمایش فیلترهای بیشتر', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'فیلترهای فهرست' });
  await dialog.getByLabel('از زمان', { exact: true }).fill('2026-10-30T10:15');
  const expected = await page.evaluate(() => new Date('2026-10-30T10:15').toISOString());
  await dialog.getByRole('button', { name: 'اعمال فیلتر', exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('fromUtc')).toBe(expected);
  await page.reload();
  await page.getByRole('button', { name: 'نمایش فیلترهای بیشتر', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('از زمان', { exact: true })).toHaveValue(
    '2026-10-30T10:15',
  );
});
