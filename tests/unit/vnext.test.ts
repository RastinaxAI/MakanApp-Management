import { describe, it, expect } from 'vitest';
import { canReceivePlatformGrant, type PlatformMembership } from '@/lib/personal-class-policy';
import { loadAcademicContext } from '@/lib/personal-class-context';
import { operationFor, validator } from '@/lib/api/contract';
const classId = '00000000-0000-4000-8000-000000000006',
  memberId = '00000000-0000-4000-8000-000000000004';
const member: PlatformMembership = {
  membershipId: memberId,
  personalClassId: classId,
  userId: '00000000-0000-4000-8000-000000000001',
  displayName: 'مدیر آزمایشی',
  username: null,
  localRoles: 'Manager',
  status: 'Active',
  joinedAtUtc: '2026-11-01T00:00:00Z',
  endedAtUtc: null,
  membershipVersion: 'AAAAAAAAAAI=',
  canReceivePlatformAcademicGrant: true,
};
const grant = {
  id: classId,
  personalClassId: classId,
  membershipId: memberId,
  capabilities: 'Grade',
  parentGrantId: null,
  isEffective: true,
  createdAtUtc: '2026-11-01T00:00:00Z',
  revokedAtUtc: null,
  version: 'AAAAAAAAAAM=',
};
const page = (items: unknown[]) => ({ items, page: 1, pageSize: 100, totalCount: items.length });
describe('vNext management gap resolution', () => {
  it('recognizes the published member contract and exact operation lookup without inventing a dashboard', () => {
    expect(
      operationFor('GET', `/api/admin/v1/personal-classes/${classId}/memberships`),
    ).toBeDefined();
    expect(
      operationFor('GET', '/api/admin/v1/provisioning')?.parameters.find(
        (p) => p.name === 'clientOperationId',
      )?.schema.maxLength,
    ).toBe(100);
    expect(operationFor('GET', '/api/admin/v1/dashboard/summary')).toBeUndefined();
  });
  it.each([
    { localRoles: 'Teacher' },
    { status: 'Ended' },
    { endedAtUtc: '2026-11-04T00:00:00Z' },
    { canReceivePlatformAcademicGrant: false },
    { membershipVersion: 'fake' },
    { personalClassId: memberId },
  ])('never treats an ineligible member as a current platform grant target: %j', (change) => {
    expect(canReceivePlatformGrant({ ...member, ...change }, classId)).toBe(false);
  });
  it('accepts an eligible Manager even with another local role, without deriving authority from the role alone', () => {
    expect(canReceivePlatformGrant({ ...member, localRoles: 'Manager, Teacher' }, classId)).toBe(
      true,
    );
  });
  it('reads independent membership and grant versions from their own read models', async () => {
    const result = await loadAcademicContext(classId, memberId, async (p) =>
      page(p.includes('/memberships') ? [member] : [grant]),
    );
    expect(result.member.membershipVersion).toBe('AAAAAAAAAAI=');
    expect(result.grantVersion).toBe('AAAAAAAAAAM=');
  });
  it('supports the first grant, keeping null separate from a membership version', async () => {
    expect(
      (
        await loadAcademicContext(classId, memberId, async (p) =>
          page(p.includes('/memberships') ? [member] : []),
        )
      ).grantVersion,
    ).toBeNull();
  });
  it('does not allow a delegated Teacher grant to become a platform base grant', async () => {
    await expect(
      loadAcademicContext(classId, memberId, async () =>
        page([{ ...member, localRoles: 'Teacher', canReceivePlatformAcademicGrant: true }]),
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('rejects ambiguous active base grants and mismatched class metadata', async () => {
    for (const rows of [
      [grant, { ...grant, id: memberId }],
      [{ ...grant, personalClassId: memberId }],
    ])
      await expect(
        loadAcademicContext(classId, memberId, async (p) =>
          page(p.includes('/memberships') ? [member] : rows),
        ),
      ).rejects.toBeDefined();
  });
  it('follows documented member pagination instead of using a grant version for an unseen member', async () => {
    const paths: string[] = [];
    const result = await loadAcademicContext(classId, memberId, async (p) => {
      paths.push(p);
      if (!p.includes('/memberships')) return page([]);
      if (new URL(p, 'http://fixture').searchParams.get('page') === '1')
        return {
          items: Array(100).fill({ ...member, membershipId: classId }),
          page: 1,
          pageSize: 100,
          totalCount: 101,
        };
      return { items: [member], page: 2, pageSize: 100, totalCount: 101 };
    });
    expect(result.member.membershipId).toBe(memberId);
    expect(paths.some((p) => p.includes('page=2'))).toBe(true);
  });
  it('refuses an incomplete or malformed membership response', async () => {
    await expect(
      loadAcademicContext(classId, memberId, async () => ({
        items: [],
        page: 1,
        pageSize: 100,
        totalCount: 1000,
      })),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      loadAcademicContext(classId, memberId, async () =>
        page([{ ...member, membershipVersion: undefined }]),
      ),
    ).rejects.toMatchObject({ status: 502 });
  });
  it('keeps exact-lookup limits and boolean member filters in the generated validators', () => {
    const op = operationFor('GET', `/api/admin/v1/personal-classes/${classId}/memberships`)!;
    expect(
      validator(op.parameters.find((p) => p.name === 'activeOnly')!.schema).safeParse('yes')
        .success,
    ).toBe(false);
    expect(
      validator(
        operationFor('GET', '/api/admin/v1/provisioning')!.parameters.find(
          (p) => p.name === 'clientOperationId',
        )!.schema,
      ).safeParse('x'.repeat(101)).success,
    ).toBe(false);
  });
});
