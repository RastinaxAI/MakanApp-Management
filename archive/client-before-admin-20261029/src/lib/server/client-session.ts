import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validator } from '@/lib/api/contract';
import { ApiError, parseProblem } from '@/lib/api/errors';
import { contextSignature } from '@/lib/client-surface';
import { authenticatedFetch } from './backend';
import { readSession, writeSession, withSessionLock } from './session';
import type { components } from '@/generated/api/schema';
export const CLIENT_COOKIE = 'makan_client_session';
export async function clientSessionId() {
  return (await cookies()).get(CLIENT_COOKIE)?.value;
}
export type ClientState = {
  user: components['schemas']['CurrentUserResult'];
  context: components['schemas']['AccessContext'];
  revision: string;
};
// Caller holds the per-session lock. No role, entitlement or permission is inferred here.
export async function getClientState(id: string): Promise<ClientState | null> {
  const session = await readSession(id);
  if (!session) return null;
  async function read<T>(path: string, schema: string): Promise<T> {
    const latest = await readSession(id);
    if (!latest) throw new ApiError(401);
    const result = await authenticatedFetch(id, latest, path);
    const body = await result.response.json().catch(() => null);
    if (!result.response.ok)
      throw new ApiError(result.response.status, parseProblem(body, result.response.status));
    const parsed = validator({ $ref: `#/components/schemas/${schema}` }).safeParse(body);
    if (!parsed.success) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
    return parsed.data as T;
  }
  const user = await read<components['schemas']['CurrentUserResult']>(
    '/api/v1/me',
    'CurrentUserResult',
  );
  if (!session.userId || user.id.toLowerCase() !== session.userId.toLowerCase())
    throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  const context = await read<components['schemas']['AccessContext']>(
    '/api/v1/workspaces/current',
    'AccessContext',
  );
  if (context.userId.toLowerCase() !== user.id.toLowerCase())
    throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  const signature = contextSignature(context);
  const latest = await readSession(id);
  if (!latest) return null;
  const changed = !!latest.contextSignature && latest.contextSignature !== signature;
  const revision = changed ? crypto.randomUUID() : latest.revision;
  if (latest.contextSignature !== signature)
    await writeSession(id, { ...latest, contextSignature: signature, revision });
  return { user, context, revision };
}
export async function requireClientPage() {
  const id = await clientSessionId();
  const valid = id ? await withSessionLock(id, () => readSession(id)) : null;
  if (!valid) redirect('/enter');
}
