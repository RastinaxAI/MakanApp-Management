import { NextResponse } from 'next/server';
import { sessionId, readSession, withSessionRead } from '@/lib/server/session';
import {
  authenticatedFetch,
  problem,
  requirePlatformOwner,
  safeResponse,
} from '@/lib/server/backend';
import { validator } from '@/lib/api/contract';
import type { components } from '@/generated/api/schema';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const id = await sessionId();
  if (!id) return problem(401);
  const query = new URL(request.url).searchParams;
  if (
    [...query.keys()].some((k) => k !== 'cursor') ||
    query.getAll('cursor').length > 1 ||
    (query.get('cursor')?.length ?? 0) > 8192
  )
    return problem(400, 'INVALID_QUERY_PARAMETER');
  try {
    return await withSessionRead(id, async () => {
      const session = await readSession(id);
      if (!session) return problem(401);
      const owner = await requirePlatformOwner(id, session);
      if (owner.error) return owner.error;
      if (request.headers.get('X-Makan-Context') !== session.revision)
        return problem(409, 'CONTEXT_CHANGED');
      const cursor = query.get('cursor');
      const latest = await readSession(id);
      if (!latest) return problem(401);
      const { response } = await authenticatedFetch(
        id,
        latest,
        '/api/v1/realtime/account-inbox/changes?limit=100' +
          (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
        { signal: request.signal },
      );
      if (!response.ok) return safeResponse(response);
      const parsed = validator({ $ref: '#/components/schemas/AccountChangePageResult' }).safeParse(
        await response.json().catch(() => null),
      );
      if (!parsed.success) return problem(502, 'CONTRACT_MISMATCH');
      const data = parsed.data as components['schemas']['AccountChangePageResult'];
      const personal = owner.platform.permissions.some((p) =>
        p.startsWith('platform.personal_classes.'),
      );
      // Account streams can contain personal messaging envelopes. Only safe invalidation hints leave the BFF.
      const events = data.changes.flatMap((change) => {
        const event = change.invalidation;
        if (
          !event ||
          !(
            event.key.toLowerCase() === 'access' ||
            (personal && /personal.?class/i.test(event.key))
          )
        )
          return [];
        return [{ eventId: change.eventId, streamVersion: change.streamVersion, key: event.key }];
      });
      return NextResponse.json(
        {
          events,
          nextCursor: data.nextCursor,
          hasMore: data.hasMore,
          epoch: data.epoch,
          contextRevision: data.contextRevision,
          retryAfterMilliseconds: data.retryAfterMilliseconds ?? null,
        },
        { headers: { 'Cache-Control': 'no-store, private', Vary: 'Cookie' } },
      );
    });
  } catch (error) {
    return problem(
      error instanceof Error && error.name === 'TimeoutError' ? 504 : 503,
      'UPSTREAM_UNAVAILABLE',
    );
  }
}
