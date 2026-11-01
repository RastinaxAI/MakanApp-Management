import { describe, it, expect } from 'vitest';
import { provisioningStages, subscriptionReady } from '@/features/organizations/provisioning-state';
import { money, localDateTime, utcDateTime } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';
type Item = components['schemas']['PlatformProvisioningItem'];
const item: Item = {
  id: 'test',
  clientOperationId: 'operation',
  requestedByUserId: 'test',
  organizationName: 'سازمان',
  planVersionId: null,
  initialManagerUserId: null,
  status: 'Completed',
  organizationId: null,
  subscriptionId: null,
  managerInvitationId: null,
  failureCode: null,
  createdAtUtc: '2026-10-24T00:00:00Z',
  updatedAtUtc: '2026-10-24T00:00:00Z',
  version: 'opaque',
};
describe('Organization setup evidence', () => {
  it('does not treat Completed alone as proof of organization, subscription or manager invitation', () => {
    expect(provisioningStages(item).map((s) => s.done)).toEqual([false, false, false]);
    const stages = provisioningStages({
      ...item,
      organizationId: 'org',
      managerInvitationId: 'invite',
    });
    expect(stages.map((s) => s.done)).toEqual([true, false, true]);
    expect(stages[2].detail).toContain('پذیرش مدیر هنوز');
  });
  it('requires active status and the current validity interval for subscription readiness', () => {
    const sub = {
      subscriptionId: 'id',
      planVersionId: 'id',
      planName: 'پلن',
      status: 'Active' as const,
      startsAtUtc: '2026-01-01T00:00:00Z',
      endsAtUtc: null,
    };
    const now = Date.parse('2026-10-24T00:00:00Z');
    expect(subscriptionReady(null, now)).toBe(false);
    expect(subscriptionReady(sub, now)).toBe(true);
    expect(subscriptionReady({ ...sub, startsAtUtc: '2027-01-01T00:00:00Z' }, now)).toBe(false);
    expect(subscriptionReady({ ...sub, endsAtUtc: '2026-10-24T00:00:00Z' }, now)).toBe(false);
    expect(subscriptionReady({ ...sub, status: 'Pending' }, now)).toBe(false);
  });
  it('labels IRR as rial without converting its amount to toman', () => {
    expect(money(120000, 'Irr')).toBe('۱۲۰٬۰۰۰ ریال');
    expect(money(120000, null)).toBe('۱۲۰٬۰۰۰ واحد نامشخص');
  });
  it('round trips a local date-time through UTC without changing its instant', () => {
    const utc = '2026-10-24T12:00:00.000Z';
    expect(utcDateTime(localDateTime(utc))).toBe(utc);
    expect(localDateTime(null)).toBe('');
    expect(localDateTime('invalid')).toBe('');
    expect(utcDateTime('invalid')).toBe('invalid');
  });
});
