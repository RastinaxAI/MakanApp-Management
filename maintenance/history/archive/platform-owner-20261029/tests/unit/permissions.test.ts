import { describe, expect, it } from 'vitest';
import { hasVerifiedPermission, hasCapability, canOpenSection } from '@/lib/permissions';
describe('Permission bindings remain explicit', () => {
  it('requires an exact verified mapping and an actual permission', () => {
    expect(hasVerifiedPermission({}, ['PlatformOwner'], 'POST /api/admin/v1/organizations')).toBe(
      false,
    );
    expect(
      hasVerifiedPermission({ operation: 'actual.permission' }, ['other.permission'], 'operation'),
    ).toBe(false);
    expect(
      hasVerifiedPermission({ operation: 'actual.permission' }, ['actual.permission'], 'operation'),
    ).toBe(true);
  });
  it('does not turn view permission into action permission', () => {
    const capabilities = ['GET /api/admin/v1/organizations'];
    expect(hasCapability(capabilities, '/api/admin/v1/organizations')).toBe(true);
    expect(hasCapability(capabilities, '/api/admin/v1/organizations', 'POST')).toBe(false);
  });
  it('shows a section for partial read access without granting other subpages', () => {
    const can = (path: string) => path === '/api/admin/v1/education/teachers';
    expect(canOpenSection('education', '/api/admin/v1/education/classes', can)).toBe(true);
    expect(can('/api/admin/v1/education/classes')).toBe(false);
  });
});
