import { NextResponse } from 'next/server';
import { sessionId, withSessionLock } from '@/lib/server/session';
import { getAuthorizedState, problem } from '@/lib/server/backend';
import { ApiError } from '@/lib/api/errors';
export const dynamic = 'force-dynamic';
export async function GET() {
  const id = await sessionId();
  if (!id) return problem(401);
  try {
    return await withSessionLock(id, async () => {
      const state = await getAuthorizedState(id);
      return state
        ? NextResponse.json(state, { headers: { 'Cache-Control': 'no-store, private' } })
        : problem(401);
    });
  } catch (error) {
    return problem(
      error instanceof ApiError ? error.status : 503,
      error instanceof ApiError ? error.problem.code : undefined,
    );
  }
}
