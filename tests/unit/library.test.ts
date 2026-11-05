import { describe, it, expect } from 'vitest';
import { libraryActionAllowed, type LibrarySource } from '@/lib/library-policy';
import { contract, operationFor, validator } from '@/lib/api/contract';
import bindings from '../../contracts/platform-permissions.json';
import { hasVerifiedPermission } from '@/lib/permissions';

const capabilities = {
  canRead: true,
  canWrite: true,
  canCreateVersion: true,
  canPublish: true,
  canArchive: true,
  canDownload: true,
  canChangeVisibility: true,
  canUseForAi: false,
};
const source = { scope: 'Library', capabilities } as LibrarySource;
describe('154c437 Library boundary', () => {
  it.each(['Personal', 'Class', 'Organization'] as const)(
    'denies shared source routes for %s resources',
    (scope) => {
      expect(libraryActionAllowed({ ...source, scope }, 'GET', '/api/v1/sources/id')).toBe(false);
      expect(libraryActionAllowed({ ...source, scope }, 'POST', '/api/v1/sources/id/publish')).toBe(
        false,
      );
    },
  );
  it.each([
    ['GET', '', 'canRead'],
    ['GET', '/content', 'canDownload'],
    ['PATCH', '/draft', 'canWrite'],
    ['POST', '/versions', 'canCreateVersion'],
    ['POST', '/publish', 'canPublish'],
    ['POST', '/archive', 'canArchive'],
    ['PUT', '/visibility', 'canChangeVisibility'],
  ] as const)('requires the exact server capability for %s %s', (method, suffix, capability) => {
    const path = '/api/v1/sources/id' + suffix;
    expect(libraryActionAllowed(source, method, path)).toBe(true);
    expect(
      libraryActionAllowed(
        { ...source, capabilities: { ...capabilities, [capability]: false } },
        method,
        path,
      ),
    ).toBe(false);
  });
  it('fails closed for optional capabilities absent in older responses', () => {
    const { canCreateVersion: _, ...older } = capabilities;
    expect(libraryActionAllowed({ ...source, capabilities: older }, 'POST', '/id/versions')).toBe(
      false,
    );
  });
  it('does not expose general source listing/creation, file browsing, AI, or private chat', () => {
    for (const path of [
      '/api/v1/sources',
      '/api/v1/files',
      '/api/v1/files/id/content',
      '/api/v1/ai/sources/preflight',
      '/api/v1/conversations',
    ])
      for (const method of ['GET', 'POST']) expect(operationFor(method, path)).toBeUndefined();
    expect(contract.operations.filter((o) => o.path.includes('/sources')).length).toBe(10);
  });
  it('binds shared routes to the independent library permission', () => {
    for (const op of contract.operations.filter((o) => o.path.includes('/sources'))) {
      const key = op.method + ' ' + op.path;
      expect(
        hasVerifiedPermission(bindings, ['platform.access', 'platform.education.read'], key),
      ).toBe(false);
      expect(hasVerifiedPermission(bindings, ['platform.library.sources.manage'], key)).toBe(true);
    }
  });
  it('retains source concurrency fields and rejects missing versions', () => {
    const v = validator({ $ref: '#/components/schemas/SourceMutationCommand' });
    expect(v.parse({ expectedVersion: 'opaque-v2', reason: 'بررسی انتشار' })).toEqual({
      expectedVersion: 'opaque-v2',
      reason: 'بررسی انتشار',
    });
    expect(v.safeParse({ reason: 'بدون نسخه' }).success).toBe(false);
  });
  it('enforces documented numeric ranges including zero boundaries', () => {
    const v = validator({ type: 'integer', minimum: 0, maximum: 5 });
    expect(v.safeParse(0).success).toBe(true);
    for (const bad of [-1, 6, 1.5, '1']) expect(v.safeParse(bad).success).toBe(false);
  });
});
