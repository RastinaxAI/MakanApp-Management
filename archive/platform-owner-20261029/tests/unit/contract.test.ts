import { describe, it, expect } from 'vitest';
import { operationFor, validator, contract } from '@/lib/api/contract';
const uuid = '00000000-0000-4000-8000-000000000001';
describe('Live schema contracts', () => {
  it('accepts the actual .NET Guid seed ID of the owner account without changing the ID', () => {
    const owner = {
      id: 'd3700000-0000-0000-0000-000000000005',
      phoneNumber: '+989120000105',
      isProfileComplete: true,
      firstName: 'Development',
      lastName: 'PlatformOwner',
      displayName: 'Development PlatformOwner',
      username: 'dev.PlatformOwner',
    };
    const schema = validator({ $ref: '#/components/schemas/CurrentUserResult' });
    expect(schema.parse(owner)).toEqual(owner);
    for (const id of [
      'not-id',
      '../owner',
      'd3700000000000000000000000000005',
      'g3700000-0000-0000-0000-000000000005',
    ])
      expect(schema.safeParse({ ...owner, id }).success).toBe(false);
  });
  it('matches literal and parameterized operations without inventing routes', () => {
    expect(operationFor('GET', '/api/admin/v1/organizations')?.path).toBe(
      '/api/admin/v1/organizations',
    );
    expect(
      operationFor('DELETE', `/api/admin/v1/organizations/${uuid}/memberships/${uuid}`)?.body,
    ).not.toBeNull();
    expect(operationFor('POST', `/api/admin/v1/education/classes/${uuid}`)).toBeUndefined();
    expect(operationFor('GET', `/api/v1/conversations/${uuid}/messages`)).toBeUndefined();
    expect(operationFor('GET', '//evil.test/api')).toBeUndefined();
  });
  it('preserves required nullable values and rejects unknown enum', () => {
    const v = validator({ $ref: '#/components/schemas/SelectWorkspaceCommand' });
    expect(v.safeParse({ workspaceType: 'Personal', membershipId: null, role: null }).success).toBe(
      true,
    );
    expect(v.safeParse({ workspaceType: 'Platform', membershipId: null, role: null }).success).toBe(
      false,
    );
    expect(
      v.safeParse({ workspaceType: 'Organization', membershipId: uuid, role: 'PlatformOwner' })
        .success,
    ).toBe(false);
  });
  it('strips invented version headers/body fields and retains actual DELETE body', () => {
    expect(
      validator({ $ref: '#/components/schemas/PlatformUserStateCommand' }).parse({
        reason: 'معتبر',
        expectedVersion: 'invented',
      }),
    ).toEqual({ reason: 'معتبر' });
    expect(
      validator(operationFor('DELETE', `/api/admin/v1/role-assignments/${uuid}`)!.body!).parse({
        reason: 'پایان انتساب',
      }),
    ).toEqual({ reason: 'پایان انتساب' });
  });
  it('does not invent a learner schema', () => {
    expect(contract.schemas.PlatformClassDetail.properties?.activeLearners.items).toEqual({});
    expect(contract.schemas.PlatformEnrollmentItem.properties?.userId.nullable).toBe(true);
  });
  it('honors date-time and UUID validation', () => {
    expect(validator({ type: 'string', format: 'uuid' }).safeParse('not-id').success).toBe(false);
    expect(validator({ type: 'string', format: 'date-time' }).safeParse('1405/07/26').success).toBe(
      false,
    );
  });
  it('interprets zone-less .NET timestamps only in explicitly UTC fields', () => {
    const schema = validator({
      type: 'object',
      required: ['createdAtUtc', 'scheduledAt', 'endedAtUtc'],
      properties: {
        createdAtUtc: { type: 'string', format: 'date-time' },
        scheduledAt: { type: 'string', format: 'date-time' },
        endedAtUtc: { type: 'string', format: 'date-time', nullable: true },
      },
    });
    const input = {
      createdAtUtc: '2026-10-23T09:38:09.8234431',
      scheduledAt: '2026-10-23T13:08:09+03:30',
      endedAtUtc: null,
    };
    expect(schema.parse(input)).toEqual({ ...input, createdAtUtc: input.createdAtUtc + 'Z' });
    expect(schema.safeParse({ ...input, scheduledAt: input.createdAtUtc }).success).toBe(false);
    for (const createdAtUtc of ['2026-02-30T09:38:09', '2026-10-23T25:38:09', '1405/07/26', ''])
      expect(schema.safeParse({ ...input, createdAtUtc }).success).toBe(false);
    for (const createdAtUtc of ['2026-10-23T09:38:09Z', '2026-10-23T13:08:09+03:30'])
      expect(schema.parse({ ...input, createdAtUtc })).toEqual({ ...input, createdAtUtc });
  });
  it('contains no removed MFA operations', () => {
    expect(operationFor('GET', '/api/admin/v1/mfa')).toBeUndefined();
  });
});
