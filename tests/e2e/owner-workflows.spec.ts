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
    events: { method: string; path: string; body: Record<string, unknown> }[];
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
async function start(page: Page) {
  await page.goto('/admin/organizations');
  await page.getByRole('button', { name: 'راه‌اندازی سازمان', exact: true }).click();
  const d = page.getByRole('dialog');
  await expect(d.getByRole('button', { name: 'ادامه', exact: true })).toBeDisabled();
  await d.getByLabel('نام سازمان', { exact: true }).fill('مدرسه نوآور');
  await d.getByLabel('دلیل ایجاد', { exact: true }).fill('راه‌اندازی مشتری آزمایشی');
  await d.getByRole('button', { name: 'ادامه', exact: true }).click();
  return d;
}
test.beforeEach(async () => {
  await control({ reset: true });
});

test('owner provisions using named user and published plan choices, then checks membership separately', async ({
  page,
}) => {
  await control({ provisioningStatus: 'Completed' });
  await login(page);
  const d = await start(page);
  await d.getByRole('button', { name: 'انتخاب مدیر اولیه', exact: true }).click();
  await d.getByRole('button', { name: /کاربر آزمایشی/ }).click();
  await d.getByRole('button', { name: 'انتخاب پلن', exact: true }).click();
  await d.getByRole('button', { name: /پلن آزمایشی/ }).click();
  await d
    .getByLabel('نسخه پلن', { exact: true })
    .selectOption('00000000-0000-4000-8000-000000000003');
  await d.getByRole('button', { name: 'ادامه', exact: true }).click();
  await expect(d.getByText('کاربر آزمایشی', { exact: true })).toBeVisible();
  await expect(d.getByText(/پلن آزمایشی · نسخه/)).toBeVisible();
  await d.getByRole('button', { name: 'ثبت نهایی سازمان', exact: true }).click();
  await expect(d.getByText(/دعوت ایجاد شده؛ پذیرش مدیر هنوز/)).toBeVisible();
  await expect(d.getByText(/شناسه پیگیری همین درخواست را به پشتیبانی/)).toBeVisible();
  const event = (await inspect()).events.find((e) => e.path === '/api/admin/v1/provisioning');
  expect(event?.body.initialManagerUserId).toBe(userId);
  expect(event?.body.planVersionId).toBe('00000000-0000-4000-8000-000000000003');
  expect(event?.body.subscriptionEndsAtUtc).toBeNull();
  await d.getByRole('link', { name: 'مشاهده پرونده و آمادگی سازمان' }).click();
  await expect(page.getByRole('heading', { name: 'چک‌لیست راه‌اندازی سازمان' })).toBeVisible();
  await expect(page.getByText('عضویت فعال با نقش مدیر تأیید شد.')).toBeVisible();
  await expect(page.getByText('اشتراکی تخصیص نیافته است.')).toBeVisible();
});

test('uncertain provisioning survives reload and retries the identical request, not a new organization', async ({
  page,
}) => {
  await login(page);
  const d = await start(page);
  await d.getByRole('button', { name: 'ادامه', exact: true }).click();
  await control({ failPath: '/provisioning', status: 504, code: 'TIMEOUT', errorOnce: true });
  await d.getByRole('button', { name: 'ثبت نهایی سازمان', exact: true }).click();
  await expect(d.getByRole('alert')).toBeVisible();
  const first = (await inspect()).events.find((e) => e.path.endsWith('/provisioning'));
  await page.reload();
  await page.getByRole('button', { name: 'راه‌اندازی سازمان', exact: true }).click();
  const restored = page.getByRole('dialog');
  await expect(restored.getByText('مدرسه نوآور', { exact: true })).toBeVisible();
  await expect(restored.getByLabel('نام سازمان', { exact: true })).toHaveCount(0);
  await restored.getByRole('button', { name: 'بررسی نتیجه درخواست' }).click();
  await expect(restored.getByText(/نبودن آن، اثبات شکست نیست/)).toBeVisible();
  expect((await inspect()).events.filter((e) => e.path.endsWith('/provisioning'))).toHaveLength(1);
  await restored.getByRole('button', { name: 'ارسال مجدد همین درخواست' }).click();
  await expect(restored.getByText('ثبت سازمان هنوز تأیید نشده است.')).toBeVisible();
  const events = (await inspect()).events.filter((e) => e.path.endsWith('/provisioning'));
  expect(events[1].body).toEqual(first?.body);
});

test('role grant selects the actual role key from the catalog and the actual user ID', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/roles');
  await page.getByRole('button', { name: 'انتساب نقش', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByRole('button', { name: 'کاربر', exact: true }).click();
  await d.getByRole('button', { name: /کاربر آزمایشی/ }).click();
  await d.getByRole('button', { name: 'نقش', exact: true }).click();
  await d.getByRole('button', { name: /نقش آزمایشی/ }).click();
  await d.getByLabel('دلیل این اقدام', { exact: true }).fill('انتساب آزمایشی مجاز');
  await d.getByRole('button', { name: 'انتساب نقش', exact: true }).click();
  await expect(
    d.getByText('پاسخ عملیات دریافت شد. وضعیت ثبت‌شده سرور را بررسی کنید.'),
  ).toBeVisible();
  const event = (await inspect()).events.find((e) => e.path === '/api/admin/v1/role-assignments');
  expect(event?.body).toMatchObject({
    userId,
    roleKey: 'FixtureRole',
    reason: 'انتساب آزمایشی مجاز',
  });
});

test('desktop education filter selects an organization by name and sends its real ID', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/education');
  const filters = page.locator('.filter-bar');
  await filters.getByRole('button', { name: 'سازمان', exact: true }).click();
  await filters.getByRole('button', { name: /مدرسه آزمایشی ماکان/ }).click();
  await filters.getByRole('button', { name: 'اعمال فیلتر', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('organizationId=' + orgId));
  await expect(page.getByRole('link', { name: /^ریاضی هشتم/ })).toBeVisible();
  await expect(filters.getByRole('button', { name: 'سازمان', exact: true })).toContainText(
    'مدرسه آزمایشی ماکان',
  );
});

test('explicit validation rejection allows correction while ambiguous failures preserve the original payload', async ({
  page,
}) => {
  await login(page);
  const d = await start(page);
  await d.getByRole('button', { name: 'ادامه', exact: true }).click();
  await control({
    failPath: '/provisioning',
    status: 422,
    code: 'VALIDATION_ERROR',
    errorOnce: true,
  });
  await d.getByRole('button', { name: 'ثبت نهایی سازمان', exact: true }).click();
  await expect(d.getByRole('alert')).toBeVisible();
  await d.getByRole('button', { name: 'اصلاح اطلاعات ردشده', exact: true }).click();
  await d.getByLabel('نام سازمان', { exact: true }).fill('مدرسه اصلاح‌شده');
  await d.getByRole('button', { name: 'ادامه', exact: true }).click();
  await d.getByRole('button', { name: 'ادامه', exact: true }).click();
  await d.getByRole('button', { name: 'ثبت نهایی سازمان', exact: true }).click();
  await expect(d.getByRole('heading', { name: 'مدرسه اصلاح‌شده' })).toBeVisible();
  const events = (await inspect()).events.filter((e) => e.path.endsWith('/provisioning'));
  expect(events[1].body.clientOperationId).not.toBe(events[0].body.clientOperationId);
});

test('lost provisioning response is recovered with one exact lookup beyond six hundred unrelated requests', async ({
  page,
}) => {
  await login(page);
  const d = await start(page);
  await d.getByRole('button', { name: 'ادامه', exact: true }).click();
  await control({ provisionResponseLost: true, provisioningStatus: 'Completed' });
  await d.getByRole('button', { name: 'ثبت نهایی سازمان', exact: true }).click();
  await expect(d.getByRole('alert')).toBeVisible();
  const raw = await (await fetch('http://127.0.0.1:4100/__inspect')).json();
  const target = raw.provisions[0];
  const unrelated = Array.from({ length: 1000 }, (_, i) => ({
    ...target,
    clientOperationId: 'other-' + i,
  }));
  await control({ provisions: [...unrelated, target] });
  await d.getByRole('button', { name: 'بررسی نتیجه درخواست', exact: true }).click();
  await expect(d.getByRole('heading', { name: 'مدرسه نوآور' })).toBeVisible();
  const result = await (await fetch('http://127.0.0.1:4100/__inspect')).json();
  const lookups = result.readQueries.filter(
    (p: string) => p.includes('/provisioning?') && p.includes('clientOperationId='),
  );
  expect(lookups).toHaveLength(1);
  expect(new URL(lookups[0], 'http://fixture').searchParams.get('clientOperationId')).toBe(
    target.clientOperationId,
  );
  expect(
    result.events.filter((e: { path: string }) => e.path.endsWith('/provisioning')),
  ).toHaveLength(1);
});

test('education uses named learner metadata and preserves learners without a linked account', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/education/00000000-0000-4000-8000-000000000006');
  await expect(page.getByText('فراگیر بدون حساب', { exact: true })).toBeVisible();
  await expect(page.getByText('بدون حساب کاربری متصل', { exact: true })).toBeVisible();
  const state = await (await page.request.get('/api/session')).json();
  const r = await page.request.get(
    '/api/backend/api/admin/v1/education/classes/00000000-0000-4000-8000-000000000006',
    { headers: { Origin: new URL(page.url()).origin, 'X-Makan-Context': state.revision } },
  );
  expect(r.status()).toBe(200);
  expect(await r.text()).not.toContain('DO_NOT_EXPOSE_PRIVATE_ANSWER');
});
