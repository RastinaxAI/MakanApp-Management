import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createMockBackend } from './mock-backend.mjs';
const { operations } = JSON.parse(fs.readFileSync('src/generated/api/contract.json', 'utf8'));
const port = process.env.MAKAN_TEST_PORT ?? '3100';
const mockPort = Number(process.env.MAKAN_MOCK_PORT ?? '4100');
const bindings = Object.fromEntries(
  operations
    .filter(
      (o) =>
        o.path.startsWith('/api/admin/') &&
        !/\/library\/sources|\/personal-class|\/expanded-context$|\/enforce-content-removal$/.test(
          o.path,
        ),
    )
    .map((o) => [o.method + ' ' + o.path, 'fixture.manage']),
);
// Exercise the shipped build, avoiding dev watcher/HMR invalidation of active dialogs.
if (!process.argv.includes('--skip-build')) {
  const builder = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
    stdio: 'inherit',
    windowsHide: true,
    env: process.env,
  });
  const built = await new Promise((resolve, reject) => {
    builder.on('error', reject);
    builder.on('exit', resolve);
  });
  if (built !== 0) process.exit(typeof built === 'number' ? built : 1);
}
const backend = createMockBackend();
await new Promise((resolve) => backend.listen(mockPort, '127.0.0.1', resolve));
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--port', port, '--hostname', '127.0.0.1'],
  {
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...process.env,
      BACKEND_BASE_URL: `http://127.0.0.1:${mockPort}`,
      APP_ORIGIN: `http://127.0.0.1:${port}`,
      SESSION_SECRET: '0'.repeat(64),
      SESSION_DIRECTORY: '.makan-test-sessions',
      PERMISSION_BINDINGS: JSON.stringify(bindings),
      COOKIE_SECURE: 'false',
      PLATFORM_OWNER_ROLE_KEYS: '["FixtureOwner"]',
      ALLOW_UNCONFIGURED_OWNER_OTP_TESTING: 'false',
    },
  },
);
const stop = () => {
  child.kill();
  backend.close();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => {
  backend.close();
  process.exit(code ?? 0);
});
