import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
const id = '00000000-0000-4000-8000-000000000001';
const org = '00000000-0000-4000-8000-000000000002';
const control = async (data: Record<string, unknown>) =>
  fetch('http://127.0.0.1:4100/__control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
async function inspect() {
  return (await (await fetch('http://127.0.0.1:4100/__inspect')).json()) as {
    events: { method: string; path: string; body: Record<string, unknown> }[];
    refresh: number;
  };
}
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('شماره همراه', { exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  await page.getByLabel('کد ورود', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('نمای کلی');
}
test.beforeEach(async () => {
  await control({ reset: true });
});

test('draft validation blocks publication, editor preserves current fields and uses fresh version after save', async ({
  page,
}) => {
  await control({ draftCanPublish: false });
  await login(page);
  await page.goto('/admin/commerce/' + id);
  await expect(page.getByRole('button', { name: 'انتشار نسخه', exact: true })).toBeDisabled();
  await expect(page.getByText('saleTermsReference', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ویرایش پیش‌نویس', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('قیمت به تومان', { exact: true })).toHaveValue('12000');
  await expect(dialog.getByLabel('تأیید صریح رایگان بودن')).not.toBeChecked();
  await dialog.getByLabel('مرجع شرایط فروش', { exact: true }).fill('terms-v2');
  await dialog.getByLabel('دلیل این اقدام', { exact: true }).fill('تکمیل شرایط انتشار');
  await dialog.getByRole('button', { name: 'ویرایش پیش‌نویس', exact: true }).click();
  await expect(dialog.getByText(/پاسخ عملیات دریافت شد/)).toBeVisible();
  const draft = (await inspect()).events.find((e) => e.path.endsWith('/draft'));
  expect(draft?.body).toMatchObject({
    expectedVersion: 'draft-v1',
    priceToman: 12000,
    explicitlyFree: false,
    calendar: 'Persian',
    saleTermsReference: 'terms-v2',
    quotas: [{ key: 'StorageBytes', limit: null }],
  });
  await dialog.getByRole('button', { name: 'بستن', exact: true }).last().click();
  await page.getByRole('button', { name: 'انتشار نسخه', exact: true }).click();
  await dialog.getByLabel('دلیل این اقدام', { exact: true }).fill('انتشار پس از اعتبارسنجی');
  await dialog.getByRole('button', { name: 'انتشار نسخه', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(
    (await inspect()).events.find((e) => e.path.endsWith('/publish'))?.body.expectedVersion,
  ).toBe('draft-v2');
});

test('availability accepts empty 200; conflicts require explicit reload and keep operator input', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/commerce/' + id);
  await page.getByRole('button', { name: 'تنظیم فروش و تمدید', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('فروش جدید فعال').check();
  await dialog.getByLabel('دلیل این اقدام', { exact: true }).fill('فعال‌سازی فروش جدید');
  await control({ planVersion: 'plan-concurrent' });
  await dialog.getByRole('button', { name: 'تنظیم فروش و تمدید', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'تنظیم فروش و تمدید', exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByLabel('دلیل این اقدام', { exact: true })).toHaveValue(
    'فعال‌سازی فروش جدید',
  );
  await dialog.getByRole('button', { name: 'دریافت نسخه تازه و حفظ ورودی', exact: true }).click();
  await dialog.getByRole('button', { name: 'تنظیم فروش و تمدید', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const events = (await inspect()).events.filter((e) => e.path.endsWith('/availability'));
  expect(events).toHaveLength(2);
  expect(events[1].body).toMatchObject({
    expectedVersion: 'plan-concurrent',
    newPurchaseAvailable: true,
  });
});

for (const kind of ['users', 'organizations'] as const)
  test(`${kind} commercial summary preserves unknown quota state and registers only a commercial contract`, async ({
    page,
  }) => {
    await control({ planAudience: kind === 'users' ? 'Individual' : 'Organization' });
    await login(page);
    await page.goto(`/admin/${kind}/${kind === 'users' ? id : org}?tab=commercial`);
    await expect(page.getByRole('heading', { name: 'سهمیه‌ها و مصرف', exact: true })).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: 'فضای ذخیره‌سازی' });
    await expect(row.getByRole('cell', { name: 'نامشخص', exact: true })).toHaveCount(1);
    await expect(row.getByRole('cell', { name: 'در دسترس نیست', exact: true })).toHaveCount(3);
    await page.getByRole('button', { name: 'ثبت قرارداد تجاری', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'انتخاب پلن', exact: true }).click();
    await dialog.getByRole('button', { name: /پلن آزمایشی/ }).click();
    await dialog
      .getByLabel('نسخه پلن', { exact: true })
      .selectOption('00000000-0000-4000-8000-000000000003');
    await dialog.getByLabel('دلیل این اقدام', { exact: true }).fill('قرارداد تجاری معتبر');
    await dialog.getByRole('button', { name: 'ثبت قرارداد تجاری', exact: true }).click();
    await expect(dialog.getByText(/پاسخ عملیات دریافت شد/)).toBeVisible();
    const events = (await inspect()).events;
    expect(events).toHaveLength(1);
    expect(events[0].path).toBe(
      `/api/admin/v1/commerce/${kind}/${kind === 'users' ? id : org}/commercial-contracts`,
    );
    expect(events[0].body).toMatchObject({
      expectedCurrentVersion: null,
      planVersionId: '00000000-0000-4000-8000-000000000003',
    });
    await dialog.getByRole('button', { name: 'بستن', exact: true }).last().click();
    await expect(page.getByText('قرارداد تجاری معتبر', { exact: true })).toBeVisible();
  });

test('commercial mutation 403 is authoritative and never auto-retried or refreshed', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/commerce/' + id);
  await page.getByRole('button', { name: 'تنظیم فروش و تمدید', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('دلیل این اقدام', { exact: true }).fill('آزمون منع دسترسی');
  await control({ failPath: '/availability', status: 403, code: 'FORBIDDEN' });
  await dialog.getByRole('button', { name: 'تنظیم فروش و تمدید', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  const state = await inspect();
  expect(state.refresh).toBe(0);
  expect(state.events.filter((e) => e.path.endsWith('/availability'))).toHaveLength(1);
});

test('contract selection keeps the correct owner and fits desktop tablet and mobile', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/commerce?tab=contracts');
  await page.getByRole('button', { name: 'کاربر صاحب قرارداد', exact: true }).click();
  await page.getByRole('button', { name: /کاربر آزمایشی/ }).click();
  await expect(
    page.getByRole('heading', { name: 'قرارداد تجاری کاربر آزمایشی', exact: true }),
  ).toBeVisible();
  await fs.mkdir('maintenance/generated/screenshots/admin-commercial-20261030', { recursive: true });
  for (const [name, width] of [
    ['desktop', 1440],
    ['tablet', 820],
    ['mobile', 390],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBe(true);
    await page.screenshot({
      path: `maintenance/generated/screenshots/admin-commercial-20261030/${name}.png`,
      fullPage: true,
    });
  }
});
