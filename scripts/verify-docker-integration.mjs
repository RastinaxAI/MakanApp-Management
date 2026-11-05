// Exercise the built Node 22 standalone image without touching existing containers or volumes.
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { request } from '@playwright/test';
const release = process.env.MAKAN_VERIFICATION_RELEASE ?? 'vnext';
if (!/^(?:[a-f0-9]{7}|vnext)$/.test(release)) throw new Error('Invalid verification release.');
const image = process.env.MAKAN_DOCKER_TEST_IMAGE ?? 'makan-management:integration-' + release;
const phone = process.env.MAKAN_LIVE_OWNER_PHONE,
  code = process.env.MAKAN_LIVE_OTP;
if (!phone || !code)
  throw new Error('Set the authorized test account in the current terminal environment.');
const port = process.env.MAKAN_DOCKER_TEST_PORT ?? '3113';
const origin = `http://127.0.0.1:${port}`;
const name = 'makan-management-qa-' + randomBytes(5).toString('hex');
const folder = 'maintenance/generated/integration-' + release;
const output = folder + '/docker-report.json';
const report = { checkedAt: new Date().toISOString(), tests: [], image };
const docker = (args) =>
  new Promise((resolve, reject) =>
    execFile('docker', args, { windowsHide: true }, (error, stdout) => {
      // Never include command arguments in errors: the ephemeral session key is private too.
      if (error) reject(new Error('Docker operation failed'));
      else resolve(stdout.trim());
    }),
  );
const record = (name, status, expected) => {
  const result = { name, status, expected, pass: status === expected };
  report.tests.push(result);
  console.log(JSON.stringify(result));
};
let client,
  started = false;
try {
  await docker([
    'run',
    '--rm',
    '-d',
    '--name',
    name,
    '-p',
    `127.0.0.1:${port}:3000`,
    '-e',
    `APP_ORIGIN=${origin}`,
    '-e',
    'BACKEND_BASE_URL=http://94.184.32.84:8090',
    '-e',
    `SESSION_SECRET=${randomBytes(32).toString('hex')}`,
    '-e',
    'COOKIE_SECURE=false',
    '-e',
    'PLATFORM_OWNER_ROLE_KEYS=["PlatformOwner"]',
    image,
  ]);
  started = true;
  client = await request.newContext({ baseURL: origin });
  for (let i = 0; i < 60; i++) {
    if (
      await client
        .get('/api/health')
        .then((r) => r.ok())
        .catch(() => false)
    )
      break;
    if (i === 59) throw new Error('Container did not become ready');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  report.nodeVersion = await docker(['exec', name, 'node', '--version']);
  report.runtimeUser = await docker(['inspect', name, '--format', '{{.Config.User}}']);
  report.imageId = await docker(['inspect', name, '--format', '{{.Image}}']);
  const health = await client.get('/api/health');
  record('container-health', health.status(), 200);
  report.identityVerified = (await health.json()).application === 'makan-management-panel';
  record('anonymous-session', (await client.get('/api/session')).status(), 401);
  const h = { Origin: origin };
  const challenge = await client.post('/api/auth/challenge', {
    headers: h,
    data: { phoneNumber: phone },
  });
  record('owner-challenge', challenge.status(), 202);
  if (!challenge.ok()) throw new Error('Challenge failed');
  const result = await challenge.json();
  const auth = await client.post('/api/auth/verify', {
    headers: h,
    data: { phoneNumber: phone, challengeId: result.challengeId, code },
  });
  record('owner-login', auth.status(), 200);
  const session = await client.get('/api/session');
  record('owner-bootstrap', session.status(), 200);
  if (!session.ok()) throw new Error('Bootstrap failed');
  const state = await session.json();
  report.ownerVerified = state.platform?.roles.includes('PlatformOwner');
  record(
    'library-catalog',
    (
      await client.get('/api/backend/api/admin/v1/library/sources?Page=1&PageSize=1', {
        headers: { 'X-Makan-Context': state.revision },
      })
    ).status(),
    200,
  );
  const guard = { 'X-Makan-Context': state.revision };
  record(
    'personal-class-queue',
    (
      await client.get('/api/backend/api/admin/v1/personal-class-requests?page=1&pageSize=1', {
        headers: guard,
      })
    ).status(),
    200,
  );
  record(
    'provisioning-exact-lookup',
    (
      await client.get(
        '/api/backend/api/admin/v1/provisioning?clientOperationId=qa-docker-' +
          randomBytes(8).toString('hex'),
        { headers: guard },
      )
    ).status(),
    200,
  );
  record(
    'personal-memberships-concealment',
    (
      await client.get(
        '/api/backend/api/admin/v1/personal-classes/00000000-0000-4000-8000-ffffffffffff/memberships?role=Manager&activeOnly=true',
        { headers: guard },
      )
    ).status(),
    404,
  );
  record(
    'safe-account-invalidation-stream',
    (await client.get('/api/realtime', { headers: guard })).status(),
    200,
  );
  record('owner-logout', (await client.post('/api/auth/logout', { headers: h })).status(), 204);
  record('session-removed', (await client.get('/api/session')).status(), 401);
} catch {
  report.error = 'Docker runtime verification failed; inspect the last completed check.';
} finally {
  if (client)
    await client.post('/api/auth/logout', { headers: { Origin: origin } }).catch(() => {});
  await client?.dispose();
  if (started) {
    try {
      await docker(['rm', '-f', name]);
      report.testContainerRemoved = true;
    } catch {
      report.testContainerRemoved = false;
      report.error = 'Test container cleanup failed.';
    }
  }
  report.passed =
    !report.error &&
    report.tests.every((t) => t.pass) &&
    report.identityVerified &&
    report.ownerVerified &&
    report.runtimeUser === 'node';
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(output, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      passed: report.passed,
      checks: report.tests.length,
      node: report.nodeVersion,
      containerRemoved: report.testContainerRemoved,
    }),
  );
  if (!report.passed) process.exitCode = 1;
}
