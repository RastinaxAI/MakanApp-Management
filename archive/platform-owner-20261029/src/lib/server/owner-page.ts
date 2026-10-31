import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { readSession, sessionId, withSessionLock } from './session';
import { requirePlatformOwner } from './backend';

// Request-scoped only: shared by the layout and page, never across navigations or users.
const ownerPageStatus = cache(async (): Promise<{ status: number; code?: string }> => {
  const id = await sessionId();
  if (!id) return { status: 401 };
  return withSessionLock(id, async () => {
    const session = await readSession(id);
    if (!session) return { status: 401 };
    try {
      const result = await requirePlatformOwner(id, session);
      return {
        status: result.error?.status ?? 200,
        code: result.error ? ((await result.error.json()).code as string | undefined) : undefined,
      };
    } catch {
      return { status: 503 };
    }
  });
});
export async function requireOwnerPage() {
  const { status, code } = await ownerPageStatus();
  if (status !== 200)
    redirect(
      status === 401
        ? '/login'
        : `/login?access=${status === 403 ? 'owner-required' : 'unavailable'}`,
    );
}
