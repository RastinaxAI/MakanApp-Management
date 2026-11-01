import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('public login hydrates with its own lightweight bundle', async ({ page }) => {
  const scripts = new Map<string, number>();
  const responses: Promise<void>[] = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.endsWith('.js')) {
      responses.push(
        response
          .body()
          .then((body) => {
            scripts.set(response.url(), body.length);
          })
          .catch(() => {}),
      );
    }
  });
  const started = Date.now();
  await page.goto('/login');
  await page.getByLabel('شماره همراه', { exact: true }).fill('09120000105');
  await page.evaluate(() => document.fonts.ready);
  await Promise.all(responses);
  const result = {
    readyMs: Date.now() - started,
    decodedJsBytes: [...scripts.values()].reduce((sum, size) => sum + size, 0),
    jsFiles: scripts.size,
  };
  expect(result.decodedJsBytes).toBeGreaterThan(0);
  if (process.env.MAKAN_PERF_STAGE !== 'before') {
    expect(result.decodedJsBytes).toBeLessThan(600_000);
  }
  await fs.mkdir('maintenance/generated/qa', { recursive: true });
  const stage = process.env.MAKAN_PERF_STAGE === 'before' ? 'before' : 'after';
  await fs.writeFile(
    `maintenance/generated/qa/login-${stage}.json`,
    JSON.stringify(result, null, 2),
  );
});
