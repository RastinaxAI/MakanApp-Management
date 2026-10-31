import { describe, expect, it } from 'vitest';
import { isPlatformOwner, ownerPolicyConfigured } from '@/lib/owner-policy';
describe('Exclusive platform owner policy', () => {
  it.each([
    'Owner',
    'Operations',
    'Support',
    'Finance',
    'Content',
    'SecurityAudit',
    'AbuseReviewer',
  ])('rejects %s for the live PlatformOwner policy even with platform access', (role) => {
    expect(
      isPlatformOwner({ roles: [role], permissions: ['platform.access'] }, ['PlatformOwner']),
    ).toBe(false);
    expect(
      isPlatformOwner({ roles: ['PlatformOwner'], permissions: ['platform.access'] }, [
        'PlatformOwner',
      ]),
    ).toBe(true);
  });
  const keys = ['platform-owner'];
  it('requires an exact configured backend role and platform access together', () => {
    expect(isPlatformOwner({ roles: keys, permissions: ['platform.access'] }, keys)).toBe(true);
    expect(
      isPlatformOwner({ roles: ['platform-admin'], permissions: ['platform.access'] }, keys),
    ).toBe(false);
    expect(
      isPlatformOwner({ roles: ['Platform-Owner'], permissions: ['platform.access'] }, keys),
    ).toBe(false);
    expect(isPlatformOwner({ roles: keys, permissions: [] }, keys)).toBe(false);
  });
  it.each(['Student', 'Parent', 'Teacher', 'Manager'])(
    'rejects school role %s even if misconfigured',
    (role) => {
      expect(ownerPolicyConfigured([role])).toBe(false);
      expect(isPlatformOwner({ roles: [role], permissions: ['platform.access'] }, [role])).toBe(
        false,
      );
    },
  );
  it.each([[], null, {}, 'platform-owner', [''], [' owner '], [12]])(
    'fails closed for invalid configuration %j',
    (keys) => {
      expect(ownerPolicyConfigured(keys)).toBe(false);
      expect(
        isPlatformOwner({ roles: ['platform-owner'], permissions: ['platform.access'] }, keys),
      ).toBe(false);
    },
  );
  it('does not remove a separately granted owner role when a school role also exists', () => {
    expect(
      isPlatformOwner(
        { roles: ['platform-owner', 'Manager'], permissions: ['platform.access'] },
        keys,
      ),
    ).toBe(true);
  });
});
