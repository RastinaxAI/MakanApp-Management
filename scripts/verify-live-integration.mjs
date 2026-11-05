// Opt-in checks against the test backend. Credentials live only in process memory.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const backend = process.env.BACKEND_BASE_URL ?? 'http://94.184.32.84:8090';
const phone = process.env.MAKAN_LIVE_OWNER_PHONE;
const code = process.env.MAKAN_LIVE_OTP;
if (!phone || !code)
  throw new Error('Set MAKAN_LIVE_OWNER_PHONE and MAKAN_LIVE_OTP; do not commit credentials.');
const mutate = process.argv.includes('--library-lifecycle');
if (mutate && new URL(backend).origin !== 'http://94.184.32.84:8090')
  throw new Error('Library lifecycle checks are restricted to the authorized test server.');
const port = process.env.MAKAN_LIVE_PORT ?? '3112';
const base = `http://127.0.0.1:${port}`;
const release = process.env.MAKAN_VERIFICATION_RELEASE ?? 'vnext';
if (!/^(?:[a-f0-9]{7}|vnext)$/.test(release)) throw new Error('Invalid verification release.');
const output = 'maintenance/generated/integration-' + release;
await fs.mkdir(output, { recursive: true });
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', port],
  {
    windowsHide: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      BACKEND_BASE_URL: backend,
      APP_ORIGIN: base,
      COOKIE_SECURE: 'false',
      SESSION_SECRET: randomBytes(32).toString('hex'),
      SESSION_DIRECTORY: `${output}/live-sessions`,
      PLATFORM_OWNER_ROLE_KEYS: '["PlatformOwner"]',
      PERMISSION_BINDINGS: '{}',
    },
  },
);
const report = {
  checkedAt: new Date().toISOString(),
  backend,
  tests: [],
  sections: [],
  mutationsRequested: mutate,
};
let browser, context, revision, createdSource;
const record = (name, status, expected, code) => {
  const entry = {
    name,
    status,
    expected,
    pass: Array.isArray(expected) ? expected.includes(status) : status === expected,
    ...(code ? { code } : {}),
  };
  report.tests.push(entry);
  console.log(JSON.stringify(entry));
  return entry.pass;
};
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Local live-check server exited.');
    if (
      await fetch(base + '/api/health')
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (i === 99) throw new Error('Local live-check server did not start.');
  }
  browser = await chromium.launch({ channel: 'chrome' });
  context = await browser.newContext({ baseURL: base, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', () => runtimeErrors.push('browser-runtime-error'));
  async function login(number) {
    const h = { Origin: base };
    const challenge = await context.request.post('/api/auth/challenge', {
      headers: h,
      data: { phoneNumber: number },
    });
    if (challenge.status() !== 202) {
      record('otp-challenge', challenge.status(), 202);
      throw new Error('Challenge failed');
    }
    const value = await challenge.json();
    return context.request.post('/api/auth/verify', {
      headers: h,
      data: { phoneNumber: number, challengeId: value.challengeId, code },
    });
  }
  const auth = await login(phone);
  record('owner-login', auth.status(), 200);
  if (!auth.ok()) throw new Error('Owner login failed');
  const session = await context.request.get('/api/session');
  record('owner-bootstrap', session.status(), 200);
  const identity = await session.json();
  revision = identity.revision;
  report.ownerRoleVerified =
    identity.platform?.roles.includes('PlatformOwner') &&
    identity.platform?.permissions.includes('platform.access');
  report.libraryPermission = identity.platform?.permissions.includes(
    'platform.library.sources.manage',
  );
  report.personalClassPermissions = identity.platform?.permissions.filter((p) =>
    p.startsWith('platform.personal_classes.'),
  );
  const h = () => ({ Origin: base, 'X-Makan-Context': revision });
  async function api(name, path, method = 'GET', body, expected = 200) {
    const r = await context.request.fetch('/api/backend' + path, {
      method,
      headers: h(),
      ...(body ? { data: body } : {}),
    });
    const value = r.headers()['content-type']?.includes('json') ? await r.json() : null;
    record(name, r.status(), expected, value?.code);
    return { response: r, value };
  }
  for (const section of [
    '',
    'organizations',
    'users',
    'education',
    'library',
    'personal-classes',
    'roles',
    'commerce',
    'finance',
    'moderation',
    'messaging',
    'operations',
    'audit',
    'account',
  ]) {
    const r = await page.goto('/admin' + (section ? '/' + section : ''));
    await page.locator('h1').waitFor();
    await page.waitForLoadState('networkidle');
    const errors = await page
      .locator('.error-state[role="alert"]:visible, .form-message.error[role="alert"]:visible')
      .count();
    report.sections.push({
      section: section || 'overview',
      status: r.status(),
      visibleErrors: errors,
      fits: await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    });
  }
  const { operations } = JSON.parse(await fs.readFile('src/generated/api/contract.json', 'utf8'));
  for (const op of operations.filter(
    (o) => o.method === 'GET' && o.path.startsWith('/api/admin/') && !o.path.includes('{'),
  ))
    await api(op.method + ' ' + op.path, op.path);
  const stream = await context.request.get('/api/realtime', { headers: h() });
  record('safe-account-invalidation-stream', stream.status(), 200);
  const hints = await stream.json();
  report.safeRealtimeBridge =
    Array.isArray(hints.events) && !('changes' in hints) && !('conversation' in hints);
  await api(
    'personal-class-query-limit',
    '/api/admin/v1/personal-class-requests?pageSize=101',
    'GET',
    undefined,
    400,
  );
  const lookupId = 'qa-read-' + crypto.randomUUID();
  const lookup = await api(
    'provisioning-exact-lookup',
    '/api/admin/v1/provisioning?clientOperationId=' + encodeURIComponent(lookupId),
  );
  report.unknownOperationLookupEmpty =
    lookup.response.ok() && lookup.value.totalCount === 0 && lookup.value.items.length === 0;
  await api(
    'provisioning-lookup-length',
    '/api/admin/v1/provisioning?clientOperationId=' + 'x'.repeat(101),
    'GET',
    undefined,
    400,
  );
  const missingClass = crypto.randomUUID();
  await api(
    'personal-membership-concealment',
    `/api/admin/v1/personal-classes/${missingClass}/memberships?role=Manager&activeOnly=true`,
    'GET',
    undefined,
    404,
  );

  await api(
    'personal-class-grants-concealment',
    `/api/admin/v1/personal-classes/${missingClass}/academic-permissions`,
    'GET',
    undefined,
    404,
  );
  await api(
    'personal-class-history-concealment',
    `/api/admin/v1/personal-classes/${missingClass}/history`,
    'GET',
    undefined,
    404,
  );
  if (mutate) {
    const file = await fs.readFile('public/guides/makan-owner-guide.pdf');
    const upload = await context.request.post('/api/library/upload', {
      headers: h(),
      multipart: {
        File: { name: 'makan-qa-guide.pdf', mimeType: 'application/pdf', buffer: file },
      },
    });
    const asset = await upload.json();
    record('library-upload', upload.status(), 201, asset.code);
    report.uploadReady = asset.status === 'Ready';
    if (upload.ok() && asset.status === 'Ready') {
      const body = {
        clientOperationId: crypto.randomUUID(),
        scope: 'Library',
        classId: null,
        title: 'QA پنل مدیریت ' + new Date().toISOString(),
        description: 'منبع آزمایشی اتصال؛ پس از تست بایگانی می‌شود.',
        fileAssetId: asset.id,
        reason: 'آزمون یکپارچگی پنل مدیریت',
      };
      const created = await api(
        'library-create',
        '/api/admin/v1/library/sources',
        'POST',
        body,
        201,
      );
      if (created.response.ok()) {
        createdSource = created.value;
        report.testSourceId = createdSource.sourceId;
        const p = '/api/v1/sources/' + createdSource.sourceId;
        const replay = await api(
          'library-create-idempotent-replay',
          '/api/admin/v1/library/sources',
          'POST',
          body,
        );
        report.sameSourceOnReplay = replay.value?.sourceId === createdSource.sourceId;
        await api('library-detail', p);
        await api('library-processing', p + '/processing');
        const edit = await api('library-edit-draft', p + '/draft', 'PATCH', {
          title: body.title,
          description: body.description,
          expectedVersion: createdSource.version,
          reason: 'آزمون ویرایش پیش‌نویس',
        });
        if (edit.response.ok()) createdSource = edit.value;
        const stale = await api(
          'library-stale-version',
          p + '/publish',
          'POST',
          { expectedVersion: created.value.version, reason: 'آزمون تعارض نسخه' },
          [409, 412],
        );
        report.staleVersionRejected =
          stale.response.status() === 409 || stale.response.status() === 412;
        const published = await api('library-publish', p + '/publish', 'POST', {
          expectedVersion: createdSource.version,
          reason: 'آزمون انتشار منبع پنهان',
        });
        if (published.response.ok()) createdSource = published.value;
        if (createdSource.capabilities.canDownload)
          await api('library-download', p + '/content?revision=' + createdSource.revision);
        if (createdSource.capabilities.canCreateVersion) {
          const version = await api(
            'library-new-version',
            p + '/versions',
            'POST',
            {
              fileAssetId: asset.id,
              title: body.title,
              description: body.description,
              expectedVersion: createdSource.version,
              reason: 'آزمون نسخه جدید',
            },
            201,
          );
          if (version.response.ok()) createdSource = version.value;
        }
        const visibility = await api('library-visibility-hidden', p + '/visibility', 'PUT', {
          visibility: 'Hidden',
          expectedVersion: createdSource.version,
          reason: 'حفظ منبع آزمایشی به صورت پنهان',
        });
        if (visibility.response.ok()) createdSource = visibility.value;
        await page.goto('/admin/library/' + createdSource.sourceId);
        await page.locator('h1').waitFor();
        await page.waitForLoadState('networkidle');
        report.libraryDetailVisibleErrors = await page
          .locator('.error-state[role="alert"]:visible, .form-message.error[role="alert"]:visible')
          .count();
        await page.screenshot({ path: output + '/library-live-desktop.png', fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        report.libraryMobileFits = await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        );
        await page.screenshot({ path: output + '/library-live-mobile.png', fullPage: true });
      }
    }
  }
  report.runtimeErrors = runtimeErrors.length;
  if (createdSource) {
    const p = '/api/v1/sources/' + createdSource.sourceId;
    const latest = await api('cleanup-refresh', p);
    if (latest.response.ok()) createdSource = latest.value;
    const archived = await api('cleanup-archive-test-source', p + '/archive', 'POST', {
      expectedVersion: createdSource.version,
      reason: 'پایان آزمون؛ بایگانی منبع پنهان آزمایشی',
    });
    report.testSourceArchived = archived.value?.status === 'Archived';
    createdSource = undefined;
  }
  record(
    'owner-logout',
    (await context.request.post('/api/auth/logout', { headers: { Origin: base } })).status(),
    204,
  );
  record('anonymous-bootstrap', (await context.request.get('/api/session')).status(), 401);
  if (process.env.MAKAN_LIVE_NONOWNER_PHONE) {
    const denied = await login(process.env.MAKAN_LIVE_NONOWNER_PHONE);
    record('non-owner-rejected', denied.status(), 403);
    record('non-owner-session-absent', (await context.request.get('/api/session')).status(), 401);
  }
} catch (error) {
  report.error = 'Live verification failed; inspect the last completed check.';
  report.errorType = error instanceof Error ? error.name : 'UnknownError';
} finally {
  if (createdSource && context) {
    const p = '/api/backend/api/v1/sources/' + createdSource.sourceId;
    const headers = { Origin: base, 'X-Makan-Context': revision };
    try {
      const latest = await (await context.request.get(p, { headers })).json();
      const archived = await context.request.post(p + '/archive', {
        headers,
        data: { expectedVersion: latest.version, reason: 'بایگانی منبع پس از پایان آزمون' },
      });
      report.testSourceArchived = archived.ok();
    } catch {
      report.testSourceArchived = false;
    }
  }
  if (context)
    await context.request.post('/api/auth/logout', { headers: { Origin: base } }).catch(() => {});
  await browser?.close();
  server.kill();
  report.passed =
    !report.error &&
    report.unknownOperationLookupEmpty &&
    report.tests.every((t) => t.pass) &&
    report.sections.every((s) => s.status === 200 && !s.visibleErrors && s.fits) &&
    !report.runtimeErrors &&
    (!report.testSourceId || report.testSourceArchived);
  await fs.writeFile(output + '/live-report.json', JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      passed: report.passed,
      checks: report.tests.length,
      sections: report.sections.length,
      error: report.error,
    }),
  );
  if (!report.passed) process.exitCode = 1;
}
