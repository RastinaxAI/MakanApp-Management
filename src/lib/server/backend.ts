import 'server-only';
import { isSessionRead, ExclusiveSessionRequired } from './session-lock';
import { NextResponse } from 'next/server';
import { serverConfig } from './config';
import {
  readSession,
  writeSession,
  removeSession,
  cookieOptions,
  COOKIE,
  type Session,
} from './session';
import { ApiError, parseProblem } from '@/lib/api/errors';
import { contract, validator } from '@/lib/api/contract';
import { hasVerifiedPermission } from '@/lib/permissions';
import { isPlatformOwner, ownerPolicyConfigured } from '@/lib/owner-policy';
import type { components } from '@/generated/api/schema';
export function problem(status: number, code?: string) {
  return NextResponse.json({ status, code }, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function checkOrigin(request: Request) {
  const expected = new URL(serverConfig().origin);
  return (
    request.headers.get('origin') === expected.origin &&
    request.headers.get('host') === expected.host
  );
}
export async function backendFetch(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(new URL(path, serverConfig().backend), {
    ...init,
    headers,
    cache: 'no-store',
    redirect: 'error',
    signal: init.signal
      ? AbortSignal.any([AbortSignal.timeout(25000), init.signal])
      : AbortSignal.timeout(25000),
  });
}
export async function authenticatedFetch(
  id: string,
  session: Session,
  path: string,
  init: RequestInit = {},
) {
  let current = session;
  async function refresh() {
    const response = await backendFetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        await removeSession(id);
      }
      return response;
    }
    const value = validator({ $ref: '#/components/schemas/RefreshSessionResult' }).safeParse(
      await response.json(),
    );
    if (!value.success) return problem(502, 'CONTRACT_MISMATCH');
    const tokens = value.data as {
      accessToken: string;
      refreshToken: string;
      expiresAtUtc: string;
      refreshExpiresAtUtc: string;
    };
    current = { ...current, ...tokens };
    await writeSession(id, current);
    return null;
  }
  if (Date.parse(current.expiresAtUtc) <= Date.now() + 15000) {
    if (isSessionRead(id)) throw new ExclusiveSessionRequired();
    const error = await refresh();
    if (error) return { response: error, session: current };
  }
  const response = await backendFetch(path, init, current.accessToken);
  // Refresh once on 401 only. Retry reads only: never automatically replay a mutation.
  if (response.status === 401) {
    if (isSessionRead(id)) throw new ExclusiveSessionRequired();
    const error = await refresh();
    if (error) return { response: error, session: current };
    if ((init.method ?? 'GET') === 'GET')
      return { response: await backendFetch(path, init, current.accessToken), session: current };
    return { response: problem(409, 'REAUTHENTICATED_REVIEW_ACTION'), session: current };
  }
  return { response, session: current };
}
export async function safeResponse(
  response: Response,
  schema: Parameters<typeof validator>[0] | null = null,
  validate: typeof validator = validator,
) {
  const headers = new Headers({ 'Cache-Control': 'no-store, private', Vary: 'Cookie' });
  const retry = response.headers.get('retry-after');
  if (retry) headers.set('Retry-After', retry);
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {}
    const p = parseProblem(body, response.status, retry);
    p.traceId ??=
      response.headers.get('x-correlation-id') ?? response.headers.get('x-request-id') ?? undefined;

    return NextResponse.json(p, { status: response.status, headers });
  }
  if (response.status === 204) return new NextResponse(null, { status: 204, headers });
  const content = response.headers.get('content-type') ?? '';
  if (!schema && !content.includes('json') && !content.includes('octet-stream')) {
    const body = await response.arrayBuffer();
    if (!body.byteLength) return new NextResponse(null, { status: response.status, headers });
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Disposition', 'attachment; filename="evidence.bin"');
    return new NextResponse(body, { status: response.status, headers });
  }
  if (content.includes('json') || schema) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return problem(502, 'INVALID_JSON');
    }
    if (schema) {
      const parsed = validate(schema).safeParse(body);
      if (!parsed.success) return problem(502, 'CONTRACT_MISMATCH');
      body = parsed.data;
    }
    return NextResponse.json(body, { status: response.status, headers });
  }
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Disposition', 'attachment; filename="evidence.bin"');
  return new NextResponse(response.body, { status: response.status, headers });
}
export async function validateOwnerResponse(response: Response, userId: string | undefined) {
  if (!response.ok) {
    return {
      error: [401, 403, 404].includes(response.status)
        ? problem(403, 'PLATFORM_OWNER_REQUIRED')
        : await safeResponse(response),
    };
  }
  if (!ownerPolicyConfigured(serverConfig().ownerRoleKeys))
    return { error: problem(503, 'OWNER_ACCESS_NOT_CONFIGURED') };
  const parsed = validator({ $ref: '#/components/schemas/PlatformMeResult' }).safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) return { error: problem(502, 'CONTRACT_MISMATCH') };
  const platform = parsed.data as components['schemas']['PlatformMeResult'];
  if (
    !userId ||
    platform.userId.toLowerCase() !== userId.toLowerCase() ||
    !isPlatformOwner(platform, serverConfig().ownerRoleKeys)
  )
    return { error: problem(403, 'PLATFORM_OWNER_REQUIRED') };
  return { platform };
}
// Recheck the authoritative platform identity on every protected request. No cached owner flag.
// Caller holds the session lock, including any token refresh performed here.
export async function requirePlatformOwner(id: string, session: Session) {
  if (!ownerPolicyConfigured(serverConfig().ownerRoleKeys))
    return { error: problem(503, 'OWNER_ACCESS_NOT_CONFIGURED') };
  const me = await authenticatedFetch(id, session, '/api/admin/v1/me');
  const result = await validateOwnerResponse(me.response, session.userId);
  if (result.error?.status === 403) {
    if (isSessionRead(id)) throw new ExclusiveSessionRequired();
    await removeSession(id);
    result.error.cookies.set(COOKIE, '', { ...cookieOptions(), maxAge: 0 });
  }
  return result;
}
export async function getAuthorizedState(id: string) {
  const initial = await readSession(id);
  if (!initial) return null;
  const owner = await requirePlatformOwner(id, initial);
  if (owner.error) {
    const body = await owner.error.json();
    throw new ApiError(owner.error.status, body);
  }
  const me = await authenticatedFetch(id, (await readSession(id))!, '/api/v1/me');
  if (!me.response.ok) {
    if (me.response.status === 401) return null;
    throw new ApiError(me.response.status);
  }
  const user = validator({ $ref: '#/components/schemas/CurrentUserResult' }).safeParse(
    await me.response.json(),
  );
  if (!user.success) throw new ApiError(502);
  const latest = await readSession(id);
  if (!latest) return null;
  const platform = owner.platform;
  const capabilities = Object.entries(serverConfig().bindings)
    .filter(([operation]) =>
      hasVerifiedPermission(serverConfig().bindings, platform?.permissions ?? [], operation),
    )
    .map(([operation]) => operation);
  return {
    user: user.data,
    platform,
    context: null,
    revision: (await readSession(id))?.revision ?? latest.revision,
    capabilities,
    unboundOperationCount: contract.operations.filter(
      (o) => o.path.startsWith('/api/admin/') && !serverConfig().bindings[`${o.method} ${o.path}`],
    ).length,
  };
}
