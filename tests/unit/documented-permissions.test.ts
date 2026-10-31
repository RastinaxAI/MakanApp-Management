import { afterEach, describe, it, expect, vi } from 'vitest';
import { serverConfig } from '@/lib/server/config';
import { hasVerifiedPermission } from '@/lib/permissions';
import { contract } from '@/lib/api/contract';
import bindings from '../../contracts/platform-permissions.json';
import sources from '../../contracts/platform-permissions.sources.json';
afterEach(() => vi.unstubAllEnvs());
describe('Supplied backend controller policies', () => {
  it('requires independent commerce read and manage permissions for the new release', () => {
    const read = 'GET /api/admin/v1/commerce/users/{ownerId}/subscription';
    const write = 'POST /api/admin/v1/commerce/users/{ownerId}/commercial-contracts';
    expect(hasVerifiedPermission(bindings, ['platform.access'], read)).toBe(false);
    expect(hasVerifiedPermission(bindings, ['platform.commerce.read'], read)).toBe(true);
    expect(hasVerifiedPermission(bindings, ['platform.commerce.read'], write)).toBe(false);
    expect(hasVerifiedPermission(bindings, ['platform.commerce.manage'], write)).toBe(true);
  });
  it('ships only explicit policies for existing operations with page references', () => {
    const operations = contract.operations.map((op) => op.method + ' ' + op.path);
    for (const key of Object.keys(bindings)) {
      expect(operations).toContain(key);
      expect([...Object.keys(sources.pages), ...Object.keys(sources.sections)]).toContain(key);
    }
    expect(bindings['POST /api/admin/v1/provisioning']).toBe('platform.provisioning.manage');
    expect(bindings['GET /api/admin/v1/finance/orders']).toBe('platform.finance.read');
  });
  it('uses documented defaults with an empty env map but still requires the actual permission', () => {
    vi.stubEnv('SESSION_SECRET', '0'.repeat(64));
    vi.stubEnv('PERMISSION_BINDINGS', '{}');
    const config = serverConfig();
    const key = 'POST /api/admin/v1/provisioning';
    expect(hasVerifiedPermission(config.bindings, ['platform.access'], key)).toBe(false);
    expect(hasVerifiedPermission(config.bindings, ['platform.provisioning.manage'], key)).toBe(
      true,
    );
    expect(config.bindings['POST /api/admin/v1/mfa/users/{userId}/reset']).toBeUndefined();
  });
  it('preserves explicit deployment overrides, including disabled operations', () => {
    vi.stubEnv('SESSION_SECRET', '0'.repeat(64));
    vi.stubEnv('PERMISSION_BINDINGS', JSON.stringify({ 'POST /api/admin/v1/provisioning': '' }));
    expect(
      hasVerifiedPermission(
        serverConfig().bindings,
        ['platform.provisioning.manage'],
        'POST /api/admin/v1/provisioning',
      ),
    ).toBe(false);
  });
});
