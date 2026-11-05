import { operationFor, operationKey } from '@/lib/api/contract';
export type PermissionBinding = string | readonly string[];

export function hasVerifiedPermission(
  bindings: Record<string, PermissionBinding>,
  permissions: readonly string[],
  operation: string,
) {
  const required = bindings[operation];
  const keys = typeof required === 'string' ? [required] : required;
  return (
    Array.isArray(keys) &&
    keys.length > 0 &&
    keys.every((key) => typeof key === 'string' && key.length > 0 && permissions.includes(key))
  );
}

export function hasCapability(capabilities: readonly string[], path: string, method = 'GET') {
  const operation = operationFor(method, path);
  return !!operation && capabilities.includes(operationKey(operation));
}

// A parent navigation section is visible if at least one actual read operation is available.
const sectionReads: Record<string, readonly string[]> = {
  'personal-classes': [
    '/api/admin/v1/personal-class-requests',
    '/api/admin/v1/personal-classes/00000000-0000-0000-0000-000000000001/academic-permissions',
  ],
  education: ['classes', 'teachers', 'enrollments', 'assignments', 'exams'].map(
    (part) => '/api/admin/v1/education/' + part,
  ),
  roles: ['/api/admin/v1/roles', '/api/admin/v1/role-assignments'],
  commerce: [
    '/api/admin/v1/commerce/plans',
    '/api/admin/v1/commerce/subscriptions',
    '/api/admin/v1/provisioning',
  ],
  operations: ['health', 'notifications', 'jobs'].map((part) => '/api/admin/v1/operations/' + part),
};
export function canOpenSection(section: string, fallback: string, can: (path: string) => boolean) {
  return !fallback || (sectionReads[section] ?? [fallback]).some((path) => can(path));
}
