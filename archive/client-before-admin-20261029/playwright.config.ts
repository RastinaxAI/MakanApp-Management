import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 45000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://127.0.0.1:3130',
    channel: 'chrome',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview:upgrade',
    url: 'http://127.0.0.1:3130/enter',
    reuseExistingServer: true,
    timeout: 60000,
  },
  reporter: [['list']],
});
