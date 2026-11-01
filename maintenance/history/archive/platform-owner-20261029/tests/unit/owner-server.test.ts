import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateOwnerResponse, requirePlatformOwner } from '@/lib/server/backend';
import { POST } from '@/app/api/auth/[action]/route';
import { serverConfig } from '@/lib/server/config';
const id = '00000000-0000-4000-8000-000000000001';
const principal = {
  userId: id,
  personId: null,
  displayName: 'مالک آزمایشی',
  roles: ['owner-key'],
  permissions: ['platform.access'],
};
beforeEach(() => {
  process.env.SESSION_SECRET = '0'.repeat(64);
  process.env.PLATFORM_OWNER_ROLE_KEYS = '["owner-key"]';
  process.env.APP_ORIGIN = 'http://127.0.0.1:3000';
  process.env.ALLOW_UNCONFIGURED_OWNER_OTP_TESTING = 'false';
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('Authoritative owner gate response', () => {
  it('accepts schema-valid matching identity only', async () => {
    const result = await validateOwnerResponse(Response.json(principal), id);
    expect(result.platform).toEqual(principal);
    expect(result.error).toBeUndefined();
    expect((await validateOwnerResponse(Response.json(principal), undefined)).error?.status).toBe(
      403,
    );
  });
  it.each([401, 403, 404])('denies platform status %i', async (status) => {
    expect((await validateOwnerResponse(Response.json({}, { status }), id)).error?.status).toBe(
      403,
    );
  });
  it('treats malformed JSON and missing role fields as contract errors', async () => {
    expect((await validateOwnerResponse(new Response('invalid'), id)).error?.status).toBe(502);
    expect((await validateOwnerResponse(Response.json({ userId: id }), id)).error?.status).toBe(
      502,
    );
  });
  it('preserves service failures without admitting the user', async () => {
    const result = await validateOwnerResponse(
      Response.json({ code: 'UNAVAILABLE' }, { status: 503 }),
      id,
    );
    expect(result.platform).toBeUndefined();
    expect(result.error?.status).toBe(503);
  });
  it('disables OTP before contacting the upstream if the owner key is unknown', async () => {
    process.env.PLATFORM_OWNER_ROLE_KEYS = '[]';
    const response = await POST(
      new Request('http://127.0.0.1:3000/api/auth/challenge', {
        method: 'POST',
        headers: {
          Origin: 'http://127.0.0.1:3000',
          Host: '127.0.0.1:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: '09120000000' }),
      }),
      { params: Promise.resolve({ action: 'challenge' }) },
    );
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('OWNER_ACCESS_NOT_CONFIGURED');
  });
  it('still rejects a non-platform account during local OTP testing without an owner key', async () => {
    process.env.PLATFORM_OWNER_ROLE_KEYS = '[]';
    process.env.ALLOW_UNCONFIGURED_OWNER_OTP_TESTING = 'true';
    expect(
      (await validateOwnerResponse(new Response(null, { status: 403 }), id)).error?.status,
    ).toBe(403);
    expect((await validateOwnerResponse(Response.json(principal), id)).error?.status).toBe(503);
  });
  it('allows a challenge only for explicit local testing and keeps owner admission closed', async () => {
    process.env.PLATFORM_OWNER_ROLE_KEYS = '[]';
    process.env.ALLOW_UNCONFIGURED_OWNER_OTP_TESTING = 'true';
    const fetcher = vi.fn().mockResolvedValue(
      Response.json(
        {
          challengeId: id,
          expiresAtUtc: '2099-01-01T00:00:00Z',
          resendAvailableAtUtc: '2099-01-01T00:00:00Z',
        },
        { status: 202 },
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    const response = await POST(
      new Request('http://127.0.0.1:3000/api/auth/challenge', {
        method: 'POST',
        headers: {
          Origin: 'http://127.0.0.1:3000',
          Host: '127.0.0.1:3000',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: '09100000000' }),
      }),
      { params: Promise.resolve({ action: 'challenge' }) },
    );
    expect(response.status).toBe(202);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('ignores the local OTP test flag on a public deployment origin', () => {
    process.env.APP_ORIGIN = 'https://panel.example.test';
    process.env.ALLOW_UNCONFIGURED_OWNER_OTP_TESTING = 'true';
    expect(serverConfig().allowUnconfiguredOwnerOtp).toBe(false);
  });
  it.each([
    {
      upstream: () => new Response('gateway failed', { status: 502 }),
      status: 502,
      code: 'OTP_SERVICE_UNAVAILABLE',
    },
    {
      upstream: () => Response.json({ challengeId: id }, { status: 202 }),
      status: 502,
      code: 'OTP_RESPONSE_INVALID',
    },
    {
      upstream: () => new Response('invalid JSON', { status: 202 }),
      status: 502,
      code: 'OTP_RESPONSE_INVALID',
    },
    {
      upstream: () => {
        throw new TypeError('fetch failed');
      },
      status: 503,
      code: 'OTP_SERVICE_UNAVAILABLE',
    },
    {
      upstream: () => {
        throw new DOMException('timed out', 'TimeoutError');
      },
      status: 504,
      code: 'OTP_REQUEST_TIMEOUT',
    },
  ])(
    'reports challenge failures accurately without replaying OTP requests ($code, $status)',
    async ({ upstream, status, code }) => {
      const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fetcher = vi.fn().mockImplementation(upstream);
      vi.stubGlobal('fetch', fetcher);
      const response = await POST(
        new Request('http://127.0.0.1:3000/api/auth/challenge', {
          method: 'POST',
          headers: {
            Origin: 'http://127.0.0.1:3000',
            Host: '127.0.0.1:3000',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phoneNumber: '09100000000' }),
        }),
        { params: Promise.resolve({ action: 'challenge' }) },
      );
      const body = await response.json();
      expect(response.status).toBe(status);
      expect(body.code).toBe(code);
      expect(body.traceId).toMatch(/^[0-9a-f-]{36}$/);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(response.headers.get('Cache-Control')).toContain('no-store');
      expect(response.headers.get('Set-Cookie')).toBeNull();
      expect(JSON.stringify(warning.mock.calls)).not.toContain('09100000000');
      expect(JSON.stringify(body)).not.toContain('gateway failed');
    },
  );
  it.each(['0910000000', '091000000000', '+12025550171'])(
    'rejects non-11-digit phone %s before any upstream request',
    async (phoneNumber) => {
      const fetcher = vi.fn();
      vi.stubGlobal('fetch', fetcher);
      const response = await POST(
        new Request('http://127.0.0.1:3000/api/auth/challenge', {
          method: 'POST',
          headers: {
            Origin: 'http://127.0.0.1:3000',
            Host: '127.0.0.1:3000',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phoneNumber }),
        }),
        { params: Promise.resolve({ action: 'challenge' }) },
      );
      expect(response.status).toBe(400);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
