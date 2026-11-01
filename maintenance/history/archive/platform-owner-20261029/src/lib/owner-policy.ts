// These are school roles, never valid identifiers for a platform owner policy.
const schoolRoles = new Set(['student', 'parent', 'teacher', 'manager']);
export function ownerPolicyConfigured(keys: unknown): keys is string[] {
  return (
    Array.isArray(keys) &&
    keys.length > 0 &&
    keys.every(
      (key) =>
        typeof key === 'string' &&
        key.length > 0 &&
        key === key.trim() &&
        !schoolRoles.has(key.toLowerCase()),
    )
  );
}
export function isPlatformOwner(
  principal: { roles: readonly string[]; permissions: readonly string[] },
  ownerRoleKeys: unknown,
) {
  return (
    ownerPolicyConfigured(ownerRoleKeys) &&
    principal.permissions.includes('platform.access') &&
    ownerRoleKeys.some((key) => principal.roles.includes(key))
  );
}
