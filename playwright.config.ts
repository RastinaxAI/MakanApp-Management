import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  outputDir: 'maintenance/generated/test-results',
  timeout: 45000,
  expect: { timeout: 15000 },
  use: {
    baseURL: `http://127.0.0.1:${process.env.MAKAN_TEST_PORT ?? '3100'}`,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/test-server.mjs',
    url: `http://127.0.0.1:${process.env.MAKAN_TEST_PORT ?? '3100'}/login`,
    reuseExistingServer: false,
    timeout: 180000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'maintenance/generated/playwright-report' }],
  ],
});
