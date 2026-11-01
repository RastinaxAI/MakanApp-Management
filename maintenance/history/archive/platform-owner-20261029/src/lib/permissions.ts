import { operationFor, operationKey } from '@/lib/api/contract';

export function hasVerifiedPermission(
  bindings: Record<string, string>,
  permissions: readonly string[],
  operation: string,
) {
  const required = bindings[operation];
  return typeof required === 'string' && required.length > 0 && permissions.includes(required);
}

export function hasCapability(capabilities: readonly string[], path: string, method = 'GET') {
  const operation = operationFor(method, path);
  return !!operation && capabilities.includes(operationKey(operation));
}

// A parent navigation section is visible if at least one actual read operation is available.
const sectionReads: Record<string, readonly string[]> = {
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
