import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
const id = '00000000-0000-4000-8000-000000000001';
async function control(body: Record<string, unknown>) {
  await fetch('http://127.0.0.1:4100/__control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('شماره همراه', { exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  await page.getByLabel('کد ورود', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('نمای کلی');
  return (await (await page.request.get('/api/session')).json()).revision as string;
}
test.beforeEach(async () => {
  await control({ reset: true });
});

test('owner cannot use official school spaces, private attachments, replay or repair through admin BFF', async ({
  page,
}) => {
  const revision = await login(page);
  const cases = [
    ['GET', '/api/v1/organization/official-spaces'],
    ['GET', `/api/v1/organization/classes/${id}/official-spaces`],
    ['POST', `/api/v1/organization/classes/${id}/official-spaces/activities`],
    ['GET', `/api/v1/organization/classes/${id}/official-spaces/activities/${id}`],
    ['GET', `/api/v1/conversations/${id}/messages`],
    ['GET', `/api/v1/academic/submission-attempts/${id}/attachments/${id}`],
    ['GET', `/api/v1/academic/exam-attempts/${id}/answers/${id}/attachments/${id}`],
    ['GET', '/api/v1/realtime/changes'],
    ['POST', '/api/admin/v1/official-spaces/repair'],
  ];
  for (const [method, path] of cases) {
    const response = await page.request.fetch('/api/backend' + path, {
      method,
      headers: { Origin: new URL(page.url()).origin, 'X-Makan-Context': revision },
      ...(method === 'POST' ? { data: {} } : {}),
    });
    expect(response.status(), method + ' ' + path).toBe(404);
  }
  const state = await (await fetch('http://127.0.0.1:4100/__inspect')).json();
  for (const [, path] of cases) {
    expect(state.reads).not.toContain(path);
    expect(state.events.some((e: { path: string }) => e.path === path)).toBe(false);
  }
});

test('metadata strips excess official flags and private fields rather than creating new authority', async ({
  page,
}) => {
  await control({ excessConversationData: true });
  const revision = await login(page);
  const result = await page.request.get('/api/backend/api/admin/v1/messaging/conversations', {
    headers: { 'X-Makan-Context': revision },
  });
  expect(result.status()).toBe(200);
  const data = await result.json();
  expect(data.items[0]).toHaveProperty('conversationId', id);
  for (const field of ['title', 'isOfficial', 'officialSpace', 'messages', 'attachments'])
    expect(data.items[0]).not.toHaveProperty(field);
  await page.goto('/admin/messaging');
  await expect(page.getByText(/مشاهده این فهرست، مجوز ورود به گفتگو/)).toBeVisible();
  await expect(page.getByText('PRIVATE_CONTENT_NOT_FOR_METADATA')).toHaveCount(0);
  await expect(page.getByText('گروه رسمی آزمایشی', { exact: true })).toHaveCount(0);
  await fs.mkdir('maintenance/generated/screenshots/admin-42c51a3', { recursive: true });
  await page.screenshot({ path: 'maintenance/generated/screenshots/admin-42c51a3/messaging-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: 'maintenance/generated/screenshots/admin-42c51a3/messaging-mobile.png', fullPage: true });
});
