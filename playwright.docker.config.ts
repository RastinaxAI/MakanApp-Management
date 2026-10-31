import { defineConfig } from '@playwright/test';

// Test the already running container, not a local Next server or a fixture backend.
export default defineConfig({
  testDir: 'tests',
  testMatch: ['**/docker/*.spec.ts'],
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.DOCKER_APP_URL ?? 'http://127.0.0.1:3101',
    channel: 'chrome',
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  reporter: [['list']],
});
