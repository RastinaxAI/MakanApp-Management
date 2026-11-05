export const reviewDecisions = ['NeedsChanges', 'Approved', 'Rejected'] as const;
export const academicFlags = ['AuthorAssignments', 'AuthorExams', 'Grade'] as const;
export type PlatformMembership =
  import('@/generated/api/schema').components['schemas']['PlatformPersonalClassMembershipDto'];
export function canReceivePlatformGrant(member: PlatformMembership, classId: string) {
  return (
    member.personalClassId.toLowerCase() === classId.toLowerCase() &&
    member.canReceivePlatformAcademicGrant === true &&
    member.status === 'Active' &&
    member.endedAtUtc === null &&
    member.localRoles
      .split(',')
      .map((r) => r.trim())
      .includes('Manager') &&
    isRowVersion(member.membershipVersion)
  );
}
export function isRowVersion(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{11}=$/.test(value)) return false;
  try {
    return atob(value).length === 8 && btoa(atob(value)) === value;
  } catch {
    return false;
  }
}
export function validPersonalClassCommand(path: string, data: Record<string, unknown>) {
  if (path.endsWith('/review'))
    return (
      isRowVersion(data.expectedVersion) &&
      reviewDecisions.includes(data.decision as (typeof reviewDecisions)[number])
    );
  if (path.includes('/academic-permissions/')) {
    const flags =
      typeof data.capabilities === 'string'
        ? data.capabilities.split(',').map((s) => s.trim())
        : [];
    return (
      isRowVersion(data.expectedMembershipVersion) &&
      (data.expectedGrantVersion === null || isRowVersion(data.expectedGrantVersion)) &&
      data.clientOperationId !== '00000000-0000-0000-0000-000000000000' &&
      (data.capabilities === 'None' ||
        (flags.length > 0 &&
          new Set(flags).size === flags.length &&
          flags.every((f) => (academicFlags as readonly string[]).includes(f))))
    );
  }
  return true;
}
