import config from './playwright.config';
import { defineConfig } from '@playwright/test';
// Reuse the documentation server for focused checks of the already-built interface.
export default defineConfig({
  ...config,
  webServer: {
    command: 'node scripts/test-server.mjs --skip-build',
    url: `http://127.0.0.1:${process.env.MAKAN_TEST_PORT ?? '3100'}/login`,
    reuseExistingServer: true,
    timeout: 30000,
  },
  reporter: [['list']],
});
