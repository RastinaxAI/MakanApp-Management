import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { operationFor, operationKey, validator } from '@/lib/api/contract';
import {
  checkOrigin,
  problem,
  authenticatedFetch,
  safeResponse,
  requirePlatformOwner,
} from '@/lib/server/backend';
import {
  sessionId,
  readSession,
  writeSession,
  withSessionLock,
  withSessionRead,
} from '@/lib/server/session';
import { serverConfig } from '@/lib/server/config';

import { hasVerifiedPermission } from '@/lib/permissions';
export const runtime = 'nodejs';
async function handler(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (request.method !== 'GET' && !checkOrigin(request)) return problem(403, 'ORIGIN_REJECTED');
  const segments = (await params).path;
  if (segments.some((s) => !s || s === '.' || s === '..' || /[\\/?#%]/.test(s)))
    return problem(404);
  const path = '/' + segments.join('/');
  const op = operationFor(request.method, path);
  if (
    !op ||
    path.startsWith('/api/v1/auth/otp') ||
    path === '/api/v1/auth/refresh' ||
    path === '/api/v1/auth/logout'
  )
    return problem(404);
  const id = await sessionId();
  if (!id) return problem(401);
  try {
    return await (request.method === 'GET' ? withSessionRead : withSessionLock)(id, async () => {
      const session = await readSession(id);
      if (!session) return problem(401);
      const owner = await requirePlatformOwner(id, session);
      if (owner.error) return owner.error;
      if (request.headers.get('X-Makan-Context') !== session.revision)
        return problem(409, 'CONTEXT_CHANGED');
      if (path.startsWith('/api/admin/') && path !== '/api/admin/v1/me') {
        const binding = serverConfig().bindings[operationKey(op)];
        if (!binding) return problem(403, 'PERMISSION_MAPPING_UNVERIFIED');
        if (
          !hasVerifiedPermission(
            serverConfig().bindings,
            owner.platform.permissions,
            operationKey(op),
          )
        )
          return problem(403, 'PERMISSION_DENIED');
      }
      if (
        /^\/api\/v1\/(organization\/|academic\/|reports\/manager|dashboards\/manager)/.test(path)
      ) {
        const ctx = await authenticatedFetch(
          id,
          (await readSession(id))!,
          '/api/v1/workspaces/current',
        );
        if (!ctx.response.ok) return safeResponse(ctx.response);
        const value = validator({ $ref: '#/components/schemas/AccessContext' }).safeParse(
          await ctx.response.json(),
        );
        if (!value.success) return problem(502, 'CONTRACT_MISMATCH');
        const context = value.data as { workspaceType: string; activeRole: string | null };
        if (context.workspaceType !== 'Organization' || context.activeRole !== 'Manager')
          return problem(403, 'MANAGER_CONTEXT_REQUIRED');
      }
      const inputUrl = new URL(request.url);
      const query = new URLSearchParams();
      for (const [key, value] of inputUrl.searchParams) {
        const definition = op.parameters.find((p) => p.in === 'query' && p.name === key);
        if (!definition || query.has(key)) return problem(400, 'UNKNOWN_QUERY_PARAMETER');
        const parsedValue =
          definition.schema.type === 'integer' || definition.schema.type === 'number'
            ? Number(value)
            : definition.schema.type === 'boolean'
              ? value === 'true'
                ? true
                : value === 'false'
                  ? false
                  : value
              : value;
        if (!validator(definition.schema).safeParse(parsedValue).success)
          return problem(400, 'INVALID_QUERY_PARAMETER');
        if (
          /^(page|pageNumber|pageSize)$/i.test(key) &&
          typeof parsedValue === 'number' &&
          parsedValue < 1
        )
          return problem(400, 'INVALID_PAGINATION');
        query.append(key, value);
      }
      for (const param of op.parameters.filter((p) => p.in === 'query' && p.required))
        if (!query.has(param.name)) return problem(400, 'MISSING_QUERY_PARAMETER');
      let body: string | undefined;
      if (op.body) {
        let input: unknown;
        try {
          input = await request.json();
        } catch {
          return problem(400, 'INVALID_JSON');
        }
        const valid = validator(op.body).safeParse(input);
        if (!valid.success)
          return NextResponse.json(
            { status: 400, code: 'VALIDATION_ERROR', errors: valid.error.flatten().fieldErrors },
            { status: 400 },
          );
        body = JSON.stringify(valid.data);
      }
      const latest = await readSession(id);
      if (!latest) return problem(401);
      const { response } = await authenticatedFetch(
        id,
        latest,
        path + (query.size ? '?' + query : ''),
        {
          method: request.method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body,
        },
      );
      if (path === '/api/v1/workspaces/select' && response.ok) {
        const after = await readSession(id);
        if (after) await writeSession(id, { ...after, revision: randomUUID() });
      }
      const result = await safeResponse(response, op.response);
      result.headers.set('X-Makan-Context', (await readSession(id))?.revision ?? '');
      return result;
    });
  } catch (error) {
    return problem(
      error instanceof Error && error.name === 'TimeoutError' ? 504 : 503,
      'UPSTREAM_UNAVAILABLE',
    );
  }
}
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
