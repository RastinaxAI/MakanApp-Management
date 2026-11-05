import { operationFor, validator } from './api/contract';
import { ApiError } from './api/errors';
import {
  canReceivePlatformGrant,
  isRowVersion,
  type PlatformMembership,
} from './personal-class-policy';
import type { components } from '@/generated/api/schema';

type Grant = components['schemas']['PersonalClassAcademicPermissionDto'];
// Bounded reads fail explicitly rather than guessing a member or a concurrency version.
export async function loadAcademicContext(
  classId: string,
  membershipId: string,
  read: (path: string) => Promise<unknown>,
) {
  async function pages<T>(path: string, query = '') {
    const op = operationFor('GET', path);
    if (!op?.response) throw new ApiError(503, { code: 'CONTRACT_UNAVAILABLE' });
    const rows: T[] = [];
    for (let page = 1; page <= 20; page++) {
      const parsed = validator(op.response).safeParse(
        await read(`${path}?page=${page}&pageSize=100${query}`),
      );
      if (!parsed.success) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      const data = parsed.data as {
        items: T[];
        page: number;
        pageSize: number;
        totalCount: number;
      };
      if (data.page !== page || data.pageSize < 1 || data.pageSize > 100)
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      rows.push(...data.items);
      if (page * data.pageSize >= data.totalCount) return rows;
      if (!data.items.length) break;
    }
    throw new ApiError(409, { code: 'MEMBERSHIP_LOOKUP_INCOMPLETE' });
  }
  const root = '/api/admin/v1/personal-classes/' + classId;
  const members = await pages<PlatformMembership>(
    root + '/memberships',
    '&activeOnly=true&role=Manager',
  );
  const matches = members.filter(
    (m) => m.membershipId.toLowerCase() === membershipId.toLowerCase(),
  );
  if (matches.length !== 1 || !canReceivePlatformGrant(matches[0], classId))
    throw new ApiError(409, { code: 'PERSONAL_CLASS_MANAGER_REQUIRED' });
  const grants = await pages<Grant>(root + '/academic-permissions');
  if (grants.some((g) => g.personalClassId.toLowerCase() !== classId.toLowerCase()))
    throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  const current = grants.filter(
    (g) =>
      g.membershipId.toLowerCase() === membershipId.toLowerCase() &&
      g.parentGrantId === null &&
      !g.revokedAtUtc,
  );
  if (current.length > 1) throw new ApiError(409, { code: 'GRANT_HISTORY_REVIEW_REQUIRED' });
  if (current[0] && !isRowVersion(current[0].version))
    throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  return { member: matches[0], grantVersion: current[0]?.version ?? null };
}
