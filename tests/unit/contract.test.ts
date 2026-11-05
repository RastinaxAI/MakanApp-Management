import { describe, it, expect } from 'vitest';
import { operationFor, validator, contract } from '@/lib/api/contract';
const uuid = '00000000-0000-4000-8000-000000000001';
describe('Live schema contracts', () => {
  it('keeps the backend entitlement dictionary including disabled keys', () => {
    const shape = contract.schemas.CommercialSummaryDto.properties!.entitlements;
    expect(validator(shape).parse({ Academic: true, Ai: false })).toEqual({
      Academic: true,
      Ai: false,
    });
    expect(validator(shape).safeParse({ Academic: 'true' }).success).toBe(false);
  });
  it('validates commercial concurrency without guessing a current version', () => {
    const schema = validator({ $ref: '#/components/schemas/RegisterCommercialContractCommand' });
    const body = {
      planVersionId: uuid,
      billingAnchorUtc: '2026-10-30T10:00:00Z',
      billingPeriodIndex: 0,
      expectedCurrentVersion: null,
      reason: 'قرارداد معتبر',
    };
    expect(schema.parse(body)).toEqual(body);
    const { expectedCurrentVersion: _, ...missing } = body;
    expect(schema.safeParse(missing).success).toBe(false);
    expect(schema.safeParse({ ...body, billingAnchorUtc: '1405/08/08' }).success).toBe(false);
  });
  it('retains new commercial fields and preserves null price and limit', () => {
    expect(
      validator({ $ref: '#/components/schemas/CommercialDraftCommand' }).parse({
        priceToman: null,
        explicitlyFree: false,
        calendar: null,
        saleTermsReference: null,
        warningPercent: null,
        criticalWarningPercent: null,
        entitlements: [{ key: 'PersonalClassHosting', enabled: true }],
        quotas: [{ key: 'AiTextRequests', limit: null }],
        expectedVersion: 'opaque-v1',
        reason: 'ویرایش معتبر',
      }),
    ).toMatchObject({
      priceToman: null,
      explicitlyFree: false,
      quotas: [{ key: 'AiTextRequests', limit: null }],
    });
  });
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
  it('excludes school management and personal messaging from admin BFF', () => {
    for (const path of [
      '/api/v1/academic/classes',
      '/api/v1/conversations',
      '/api/v1/workspaces/select',
    ])
      expect(operationFor('GET', path)).toBeUndefined();
  });
  it.each([
    '/api/v1/organization/official-spaces',
    `/api/v1/organization/classes/${uuid}/official-spaces`,
    `/api/v1/organization/classes/${uuid}/official-spaces/activities`,
    `/api/v1/organization/classes/${uuid}/official-spaces/activities/${uuid}`,
    `/api/v1/conversations/${uuid}/messages`,
    '/api/v1/realtime/changes',
    `/api/v1/academic/submission-attempts/${uuid}/attachments/${uuid}`,
    `/api/v1/academic/exam-attempts/${uuid}/answers/${uuid}/attachments/${uuid}`,
  ])('does not expose private or school operation %s through the owner panel', (path) => {
    for (const method of ['GET', 'POST', 'PUT', 'DELETE'])
      expect(operationFor(method, path)).toBeUndefined();
  });
  it('does not turn generated official-space DTOs into admin capabilities', () => {
    expect(Object.keys(contract.schemas)).not.toContain('OfficialSpacesPairResult');
    expect(
      contract.operations.some((op) =>
        /official-spaces|maintenance|backfill|\/repair(?:\/|$)/i.test(op.path),
      ),
    ).toBe(false);
    expect(operationFor('GET', '/api/admin/v1/messaging/conversations')).toBeDefined();
  });
  it('keeps conversation metadata separate from official identity and private content', () => {
    const metadata = {
      conversationId: uuid,
      type: 'Group',
      scope: 'Organization',
      organization: null,
      visibility: 'Private',
      status: 'Active',
      activeMemberCount: 12,
      moderationCaseCount: 0,
      createdAtUtc: '2026-10-30T10:00:00Z',
    };
    expect(
      validator({ $ref: '#/components/schemas/PlatformConversationMetadataItem' }).parse({
        ...metadata,
        title: 'گروه رسمی سازمان',
        isOfficial: true,
        officialSpace: { sourceKind: 'Organization', sourceId: uuid },
        messages: [{ text: 'PRIVATE_CONTENT' }],
        attachments: [{ fileAssetId: uuid }],
      }),
    ).toEqual(metadata);
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
  it('uses the published named learner schema and preserves a nullable connected account', () => {
    expect(contract.schemas.PlatformClassDetail.properties?.activeLearners.items).toEqual({
      $ref: '#/components/schemas/PlatformClassPerson',
    });
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
