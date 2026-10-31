import { defineConfig } from '@playwright/test';
// Explicit QA against the local app and the user-authorized seeded backend accounts.
export default defineConfig({
  testDir: 'tests/personal',
  workers: 1,
  fullyParallel: false,
  timeout: 300000,
  expect: { timeout: 20000 },
  use: {
    baseURL: 'http://127.0.0.1:3130',
    channel: 'chrome',
    headless: true,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  reporter: [['list']],
  outputDir: 'test-results/personal',
});
