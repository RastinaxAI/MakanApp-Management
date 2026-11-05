import {
  checkOrigin,
  problem,
  requirePlatformOwner,
  authenticatedFetch,
  safeResponse,
} from '@/lib/server/backend';
import { sessionId, readSession, withSessionLock } from '@/lib/server/session';
import { libraryPermission } from '@/lib/library-policy';
import { hasVerifiedPermission } from '@/lib/permissions';
import { serverConfig } from '@/lib/server/config';

export const runtime = 'nodejs';
// Bound memory use in the panel; the backend remains authoritative for file policy.
const maxBytes = 20 * 1024 * 1024;
export async function POST(request: Request) {
  if (!checkOrigin(request)) return problem(403, 'ORIGIN_REJECTED');
  const id = await sessionId();
  if (!id) return problem(401);
  try {
    return await withSessionLock(id, async () => {
      const session = await readSession(id);
      if (!session) return problem(401);
      const owner = await requirePlatformOwner(id, session);
      if (owner.error) return owner.error;
      if (!owner.platform.permissions.includes(libraryPermission))
        return problem(403, 'PERMISSION_DENIED');
      if (
        !['POST /api/admin/v1/library/sources', 'POST /api/v1/sources/{id}/versions'].some(
          (operation) =>
            hasVerifiedPermission(serverConfig().bindings, owner.platform.permissions, operation),
        )
      )
        return problem(403, 'PERMISSION_DENIED');
      if (request.headers.get('X-Makan-Context') !== session.revision)
        return problem(409, 'CONTEXT_CHANGED');
      if (Number(request.headers.get('content-length')) > maxBytes + 65536) return problem(413);
      let input: FormData;
      try {
        input = await request.formData();
      } catch {
        return problem(400, 'INVALID_FILE');
      }
      const file = input.get('File');
      if (
        !(file instanceof File) ||
        input.getAll('File').length !== 1 ||
        [...input.keys()].some((k) => k !== 'File')
      )
        return problem(400, 'INVALID_FILE');
      if (!file.size || file.size > maxBytes) return problem(413);
      const form = new FormData();
      form.set('File', file);
      const latest = await readSession(id);
      if (!latest) return problem(401);
      // No fabricated Library workspace. The file is uploaded as this authenticated owner.
      const result = await authenticatedFetch(id, latest, '/api/v1/files', {
        method: 'POST',
        body: form,
      });
      return safeResponse(result.response, { $ref: '#/components/schemas/FileAssetResult' });
    });
  } catch (error) {
    return problem(
      error instanceof Error && error.name === 'TimeoutError' ? 504 : 503,
      'UPSTREAM_UNAVAILABLE',
    );
  }
}
