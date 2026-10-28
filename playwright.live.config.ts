import { defineConfig } from '@playwright/test';
// Explicit live test command only; these tests never run as part of npm test/test:e2e.
export default defineConfig({
  testDir: 'tests/live',
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 40000 },
  use: { baseURL: 'http://127.0.0.1:3000', channel: 'chrome', trace: 'off' },
  reporter: [['list']],
  outputDir: 'test-results/live-accounts',
});
