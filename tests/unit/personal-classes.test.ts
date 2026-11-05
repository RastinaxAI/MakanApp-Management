import { describe, it, expect } from 'vitest';
import { isRowVersion, validPersonalClassCommand } from '@/lib/personal-class-policy';
import { operationFor, validator } from '@/lib/api/contract';
import { hasVerifiedPermission } from '@/lib/permissions';
import bindings from '../../contracts/platform-permissions.json';
import openapi from '../../contracts/openapi.json';
const id = '00000000-0000-4000-8000-000000000001';
const version = 'AAAAAAAAAAE=';
const review = '/api/admin/v1/personal-class-requests/' + id + '/review';
const grant = `/api/admin/v1/personal-classes/${id}/academic-permissions/${id}`;
describe('80c2e61 personal class contract', () => {
  it.each(['', 'opaque-version', 'AAAAAAAAAA==', 'AAAAAAAAAAA', 'AAAAAAAAAAE==', 'AAAAAAAAAAH='])(
    'rejects a missing, malformed or noncanonical 8-byte rowversion %s',
    (value) => expect(isRowVersion(value)).toBe(false),
  );
  it('accepts the real opaque Base64 rowversion without deriving it', () =>
    expect(isRowVersion(version)).toBe(true));
  it.each(['Approved', 'Rejected', 'NeedsChanges'])(
    'allows review decision %s only with the current version',
    (decision) => {
      expect(validPersonalClassCommand(review, { decision, expectedVersion: version })).toBe(true);
      expect(validPersonalClassCommand(review, { decision, expectedVersion: 'fake' })).toBe(false);
    },
  );
  it.each(['Draft', 'Submitted', 'UnderReview', 'Cancelled'])(
    'does not expose %s as an administrative decision',
    (decision) =>
      expect(validPersonalClassCommand(review, { decision, expectedVersion: version })).toBe(false),
  );
  it('validates the live reason contract and its trim and length rules', () => {
    const v = validator(operationFor('POST', review)!.body!);
    const body = {
      decision: 'Approved',
      expectedVersion: version,
      reason: '  تأیید پس از بررسی  ',
      finalManagerUserId: null,
    };
    expect(v.parse(body)).toMatchObject({ reason: 'تأیید پس از بررسی' });
    for (const reason of ['   ', 'x'.repeat(501)])
      expect(v.safeParse({ ...body, reason }).success).toBe(false);
  });
  it('keeps separate membership and grant versions, a null initial grant and a stable intent', () => {
    const body = {
      capabilities: 'AuthorAssignments, Grade',
      clientOperationId: id,
      expectedMembershipVersion: version,
      expectedGrantVersion: null,
      reason: 'اعطا',
    };
    expect(validator(operationFor('PUT', grant)!.body!).parse(body)).toEqual(body);
    expect(validPersonalClassCommand(grant, body)).toBe(true);
    expect(validPersonalClassCommand(grant, { ...body, expectedMembershipVersion: null })).toBe(
      false,
    );
    expect(
      validPersonalClassCommand(grant, {
        ...body,
        clientOperationId: '00000000-0000-0000-0000-000000000000',
      }),
    ).toBe(false);
    expect(validPersonalClassCommand(grant, { ...body, capabilities: 'All' })).toBe(false);
    expect(validPersonalClassCommand(grant, { ...body, capabilities: 'Grade, Grade' })).toBe(false);
    expect(validPersonalClassCommand(grant, { ...body, capabilities: 'None' })).toBe(true);
  });
  it('requires both live moderation policies, and no school or owner role substitutes for either', () => {
    const op = 'POST /api/admin/v1/moderation/cases/{caseId}/expanded-context';
    expect(hasVerifiedPermission(bindings, ['platform.moderation.review'], op)).toBe(false);
    expect(hasVerifiedPermission(bindings, ['platform.moderation.enforce'], op)).toBe(false);
    expect(
      hasVerifiedPermission(
        bindings,
        ['platform.moderation.review', 'platform.moderation.enforce'],
        op,
      ),
    ).toBe(true);
    expect(hasVerifiedPermission({ x: [] }, ['PlatformOwner'], 'x')).toBe(false);
    expect(hasVerifiedPermission({ x: '' }, ['PlatformOwner'], 'x')).toBe(false);
  });
  it('matches every published platform policy while retaining documented mappings for unannotated routes', () => {
    for (const [path, methods] of Object.entries(openapi.paths)) {
      if (!path.startsWith('/api/admin/')) continue;
      for (const [method, value] of Object.entries(methods)) {
        const policies = (value as { 'x-platform-permissions'?: string[] })[
          'x-platform-permissions'
        ];
        if (!policies) continue;
        const key = (method.toUpperCase() + ' ' + path) as keyof typeof bindings;
        expect(Array.isArray(bindings[key]) ? bindings[key] : [bindings[key]]).toEqual(policies);
      }
    }
  });
  it('keeps private membership, answer, grading and repair APIs outside the panel', () => {
    for (const path of [
      `/api/v1/personal-classes/${id}/members`,
      `/api/v1/personal-classes/${id}/academic-permissions`,
      `/api/v1/personal-classes/${id}/official-spaces/repair`,
      `/api/v1/realtime/account-inbox/changes`,
    ])
      for (const method of ['GET', 'POST', 'PUT'])
        expect(operationFor(method, path)).toBeUndefined();
  });
});
