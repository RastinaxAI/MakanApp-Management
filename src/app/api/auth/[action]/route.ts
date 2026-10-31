import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  checkOrigin,
  backendFetch,
  safeResponse,
  problem,
  authenticatedFetch,
  validateOwnerResponse,
} from '@/lib/server/backend';
import {
  sessionId,
  readSession,
  writeSession,
  removeSession,
  withSessionLock,
  cookieOptions,
  COOKIE,
} from '@/lib/server/session';
import { validator } from '@/lib/api/contract';
import { serverConfig } from '@/lib/server/config';
import { ownerPolicyConfigured } from '@/lib/owner-policy';
import { phoneInputSchema, otpInputSchema } from '@/lib/auth-input';

export const runtime = 'nodejs';
function challengeFailure(
  status: number,
  code: string,
  traceId: string,
  upstreamStatus?: number,
  headers?: Headers,
) {
  // Log only support metadata. Never log phone numbers, OTPs, tokens or upstream bodies.
  console.warn('[otp-challenge]', JSON.stringify({ status, code, traceId, upstreamStatus }));
  return NextResponse.json(
    { status, code, traceId },
    { status, headers: headers ?? { 'Cache-Control': 'no-store' } },
  );
}
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  if (!checkOrigin(request)) return problem(403, 'ORIGIN_REJECTED');
  const { action } = await params;
  const traceId = randomUUID();
  try {
    if (action === 'logout') {
      const id = await sessionId();
      if (id)
        await withSessionLock(id, async () => {
          const session = await readSession(id);
          if (session)
            await authenticatedFetch(id, session, '/api/v1/auth/logout', { method: 'POST' }).catch(
              () => {},
            );
          await removeSession(id);
        });
      const result = new NextResponse(null, { status: 204 });
      result.cookies.set(COOKIE, '', { ...cookieOptions(), maxAge: 0 });
      return result;
    }
    if (!['challenge', 'verify'].includes(action)) return problem(404);
    if (
      !ownerPolicyConfigured(serverConfig().ownerRoleKeys) &&
      !serverConfig().allowUnconfiguredOwnerOtp
    )
      return problem(503, 'OWNER_ACCESS_NOT_CONFIGURED');
    const parsed = validator({
      $ref: `#/components/schemas/${action === 'challenge' ? 'RequestOtpCommand' : 'VerifyOtpCommand'}`,
    }).safeParse(await request.json());
    if (!parsed.success) return problem(400, 'VALIDATION_ERROR');
    const input = parsed.data as Record<string, unknown>;
    const phone = phoneInputSchema.safeParse(input.phoneNumber);
    if (!phone.success) return problem(400, 'VALIDATION_ERROR');
    if (action === 'verify') {
      const code = otpInputSchema.safeParse(input.code);
      if (!code.success) return problem(400, 'VALIDATION_ERROR');
      input.code = code.data;
    }
    const response = await backendFetch(
      `/api/v1/auth/otp/${action === 'challenge' ? 'challenges' : 'verify'}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, phoneNumber: phone.data }),
      },
    );
    if (!response.ok || action === 'challenge') {
      const result = await safeResponse(
        response,
        action === 'challenge' ? { $ref: '#/components/schemas/RequestOtpResult' } : null,
      );
      if (action === 'challenge' && result.status >= 500) {
        const details = await result.json();
        return challengeFailure(
          result.status,
          response.ok
            ? 'OTP_RESPONSE_INVALID'
            : result.status === 504
              ? 'OTP_REQUEST_TIMEOUT'
              : 'OTP_SERVICE_UNAVAILABLE',
          typeof details.traceId === 'string' ? details.traceId : traceId,
          response.status,
          result.headers,
        );
      }
      return result;
    }
    const tokens = validator({ $ref: '#/components/schemas/VerifyOtpResult' }).safeParse(
      await response.json(),
    );
    if (!tokens.success) return problem(502, 'CONTRACT_MISMATCH');
    const value = tokens.data as {
      accessToken: string;
      refreshToken: string;
      expiresAtUtc: string;
      refreshExpiresAtUtc: string;
      user: { id: string };
    };
    const old = await sessionId();
    if (old) await withSessionLock(old, () => removeSession(old));
    let accepted = false;
    try {
      const owner = await validateOwnerResponse(
        await backendFetch('/api/admin/v1/me', {}, value.accessToken),
        value.user.id,
      );
      if (owner.error) {
        owner.error.cookies.set(COOKIE, '', { ...cookieOptions(), maxAge: 0 });
        return owner.error;
      }
      accepted = true;
    } finally {
      // OTP creates an upstream session. Revoke it when the owner gate rejects entry.
      if (!accepted)
        await backendFetch('/api/v1/auth/logout', { method: 'POST' }, value.accessToken).catch(
          () => {},
        );
    }
    const id = randomUUID();
    await writeSession(id, {
      accessToken: value.accessToken,
      refreshToken: value.refreshToken,
      expiresAtUtc: value.expiresAtUtc,
      refreshExpiresAtUtc: value.refreshExpiresAtUtc,
      userId: value.user.id,
      revision: randomUUID(),
    });
    const result = NextResponse.json(
      { authenticated: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    result.cookies.set(COOKIE, id, cookieOptions());
    return result;
  } catch (error) {
    const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
    if (action === 'challenge')
      return challengeFailure(
        timeout ? 504 : 503,
        timeout ? 'OTP_REQUEST_TIMEOUT' : 'OTP_SERVICE_UNAVAILABLE',
        traceId,
      );
    return problem(timeout ? 504 : 503, 'UPSTREAM_UNAVAILABLE');
  }
}
export async function GET() {
  return problem(404);
}
