// Test-only server. Never imported by the application. No real network mutations.
import http from 'node:http';
import fs from 'node:fs';
import { createECDH } from 'node:crypto';
const pushKeyPair = createECDH('prime256v1');
pushKeyPair.generateKeys();
const pushPublicKey = pushKeyPair.getPublicKey().toString('base64url');
const { schemas, operations } = JSON.parse(
  fs.readFileSync('src/generated/api/contract.json', 'utf8'),
);
export const ids = {
  user: '00000000-0000-4000-8000-000000000001',
  org: '00000000-0000-4000-8000-000000000002',
  otherOrg: '00000000-0000-4000-8000-000000000003',
  membership: '00000000-0000-4000-8000-000000000004',
  otherMembership: '00000000-0000-4000-8000-000000000005',
  class: '00000000-0000-4000-8000-000000000006',
};
const now = () => new Date().toISOString();
function sample(input, depth = 0) {
  if (!input || depth > 12) return null;
  const s = input.$ref ? schemas[input.$ref.split('/').pop()] : input;
  if (s.nullable) return null;
  if (s.enum) return s.enum[0];
  if (s.type === 'object')
    return Object.fromEntries(
      Object.entries(s.properties ?? {})
        .filter(([key]) => s.required?.includes(key))
        .map(([key, value]) => [key, sample(value, depth + 1)]),
    );
  if (s.type === 'array') return [];
  if (s.type === 'boolean') return true;
  if (['integer', 'number'].includes(s.type)) return 1;
  if (s.format === 'uuid') return ids.user;
  if (s.format === 'date-time') return now();
  if (s.format === 'date') return '2026-10-18';
  return 'داده آزمایشی';
}
function named(name, props = {}) {
  return { ...sample({ $ref: '#/components/schemas/' + name }), ...props };
}
let state;
function reset() {
  state = {
    pushConfigured: true,
    pushDevices: [],
    notificationRead: false,
    manager: false,
    platformRoles: ['FixtureOwner'],
    platformPermissions: [
      'platform.access',
      'fixture.manage',
      'platform.library.sources.manage',
      'platform.personal_classes.read',
      'platform.personal_classes.review',
      'platform.personal_classes.academic_permissions.manage',
      'platform.moderation.review',
      'platform.moderation.enforce',
    ],
    platformUserId: ids.user,
    reads: [],
    readDelayMs: 0,
    activeReads: 0,
    maxConcurrentReads: 0,
    context: 'Personal',
    org: ids.org,
    refresh: 0,
    events: [],
    failPath: null,
    failMethod: null,
    status: 0,
    code: null,
    errorOnce: false,
    shortTokens: false,
    delay: 0,
    unknownEnum: false,
    masked: '0912***1234',
    provisions: [],
    provisioningStatus: 'Requested',
    draftCanPublish: true,
    draftVersion: 'draft-v1',
    planVersion: 'plan-v1',
    planAudience: 'Individual',
    commercialVersion: null,
    commercialHistory: [],
    sourceVersion: 'source-v1',
    sourceScope: 'Library',
    sourcePublished: false,
    sourceCanDownload: true,
    librarySources: [],
    personalVersion: 'AAAAAAAAAAE=',
    membershipVersion: 'AAAAAAAAAAI=',
    membershipRole: 'Manager',
    membershipStatus: 'Active',
    membershipCanGrant: true,
    readQueries: [],
    provisionResponseLost: false,
    personalStatus: 'Submitted',
    grantVersion: null,
    grantCapabilities: 'None',
    grantIntents: {},
    accountChanges: [],
    accountCursorRequests: [],
    resyncOnce: false,
  };
}
reset();
export function createMockBackend() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:4100');
    let body = null;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length) {
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {}
    }
    const send = (status, value, headers = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
      res.end(status === 204 ? '' : JSON.stringify(value));
    };
    if (url.pathname === '/__control') {
      if (body?.reset) reset();
      Object.assign(state, body);
      return send(200, { ok: true });
    }
    if (url.pathname === '/__inspect') return send(200, state);
    if (req.method === 'GET') {
      state.reads.push(url.pathname);
      state.readQueries.push(url.pathname + url.search);
      const snapshot = state;
      snapshot.activeReads++;
      snapshot.maxConcurrentReads = Math.max(snapshot.maxConcurrentReads, snapshot.activeReads);
      res.once('finish', () => {
        snapshot.activeReads--;
      });
      if (snapshot.readDelayMs)
        await new Promise((resolve) => setTimeout(resolve, snapshot.readDelayMs));
    }
    if (req.method !== 'GET' && !url.pathname.startsWith('/api/v1/auth'))
      state.events.push({ method: req.method, path: url.pathname, body });
    if (
      state.failPath &&
      url.pathname.includes(state.failPath) &&
      (!state.failMethod || req.method === state.failMethod)
    ) {
      const status = state.status,
        code = state.code;
      if (state.errorOnce) state.failPath = null;
      return send(
        status,
        { status, code, traceId: 'fixture-trace', detail: 'DO_NOT_EXPOSE_PROVIDER_SECRET' },
        { 'Retry-After': '2' },
      );
    }
    if (url.pathname === '/api/v1/auth/otp/challenges')
      return send(202, {
        challengeId: ids.user,
        expiresAtUtc: new Date(Date.now() + 300000).toISOString(),
        resendAvailableAtUtc: new Date(Date.now() + 2000).toISOString(),
      });
    const tokens = () => ({
      accessToken: 'test-access-do-not-export',
      refreshToken: 'test-refresh-do-not-export',
      tokenType: 'Bearer',
      expiresAtUtc: new Date(Date.now() + (state.shortTokens ? 1000 : 3600000)).toISOString(),
      refreshExpiresAtUtc: new Date(Date.now() + 86400000).toISOString(),
    });
    const user = named('CurrentUserResult', {
      id: ids.user,
      phoneNumber: '09120000000',
      firstName: 'مدیر',
      lastName: 'آزمایشی',
      displayName: 'مدیر آزمایشی',
      username: 'test.admin',
    });
    if (url.pathname === '/api/v1/auth/otp/verify') return send(200, { ...tokens(), user });
    if (url.pathname === '/api/v1/auth/refresh') {
      state.refresh++;
      state.shortTokens = false;
      return send(200, tokens());
    }
    if (!req.headers.authorization) return send(401, { status: 401, code: 'AUTH_REQUIRED' });
    if (url.pathname === '/api/v1/notifications/devices/web-push/configuration')
      return send(200, {
        isConfigured: state.pushConfigured,
        vapidPublicKey: state.pushConfigured ? pushPublicKey : null,
      });
    const pushId = '00000000-0000-4000-8000-000000000012';
    if (url.pathname === '/api/v1/notifications/devices/web-push' && req.method === 'POST') {
      if (!state.pushConfigured) return send(503, { code: 'PUSH_NOT_CONFIGURED' });
      if (state.pushDevices.length && body.expectedVersion !== state.pushDevices[0].version)
        return send(409, { code: 'VERSION_CONFLICT' });
      const device = {
        id: pushId,
        platform: 'Web',
        createdAtUtc: now(),
        lastSeenAtUtc: now(),
        revokedAtUtc: null,
        isActive: true,
        version: 'fixture-push-v1',
      };
      state.pushDevices = [device];
      return send(200, device);
    }
    if (url.pathname === '/api/v1/notifications/devices')
      return send(200, {
        items: state.pushDevices,
        page: 1,
        pageSize: 100,
        totalCount: state.pushDevices.length,
      });
    if (url.pathname === '/api/v1/notifications/devices/' + pushId && req.method === 'DELETE') {
      state.pushDevices = [];
      return send(204);
    }
    const notificationId = '00000000-0000-4000-8000-000000000013';
    const notification = () => ({
      id: notificationId,
      organizationId: null,
      category: 'AccountSystem',
      type: 'AssignmentPublished',
      title: 'اعلان حساب آزمایشی',
      body: 'این اعلان برای بررسی صندوق همین حساب است.',
      resourceType: 'Assignment',
      resourceId: ids.class,
      createdAtUtc: now(),
      readAtUtc: state.notificationRead ? now() : null,
    });
    if (url.pathname === '/api/v1/notifications/unread-count')
      return send(200, { count: state.notificationRead ? 0 : 1 });
    if (
      url.pathname === '/api/v1/notifications/' + notificationId + '/read' &&
      req.method === 'POST'
    ) {
      state.notificationRead = true;
      return send(200, notification());
    }
    if (url.pathname === '/api/v1/notifications') {
      const items =
        url.searchParams.get('UnreadOnly') === 'true' && state.notificationRead
          ? []
          : [notification()];
      return send(200, { items, page: 1, pageSize: 10, totalCount: items.length });
    }
    if (url.pathname === '/api/v1/me') return send(200, user);
    if (url.pathname === '/api/admin/v1/me') {
      if (state.manager) return send(403, { status: 403, code: 'FORBIDDEN' });
      return send(
        200,
        named('PlatformMeResult', {
          userId: state.platformUserId,
          displayName: 'مدیر آزمایشی',
          roles: state.platformRoles,
          permissions: state.platformPermissions,
        }),
      );
    }
    const context = () =>
      named('AccessContext', {
        workspaceType: state.context,
        organizationId: state.context === 'Organization' ? state.org : null,
        membershipId:
          state.context === 'Organization'
            ? state.org === ids.org
              ? ids.membership
              : ids.otherMembership
            : null,
        activeRole: state.context === 'Organization' ? 'Manager' : null,
      });
    if (url.pathname === '/api/v1/workspaces/current') return send(200, context());
    if (url.pathname === '/api/v1/workspaces/me')
      return send(200, [
        named('WorkspaceResult', {
          workspaceType: 'Personal',
          organizationId: null,
          organizationName: null,
          membershipId: null,
          role: null,
          displayName: 'فضای شخصی',
          status: 'Active',
        }),
        ...[ids.org, ids.otherOrg].map((org, i) =>
          named('WorkspaceResult', {
            workspaceType: 'Organization',
            organizationId: org,
            organizationName: i ? 'سازمان دوم' : 'مدرسه آزمایشی',
            membershipId: i ? ids.otherMembership : ids.membership,
            role: 'Manager',
            displayName: 'مدیر',
            status: 'Active',
          }),
        ),
      ]);
    if (url.pathname === '/api/v1/workspaces/select') {
      state.context = body.workspaceType;
      state.org = body.membershipId === ids.otherMembership ? ids.otherOrg : ids.org;
      return send(200, context());
    }
    if (url.pathname === '/api/v1/realtime/account-inbox/changes') {
      state.accountCursorRequests.push(url.searchParams.get('cursor'));
      if (state.resyncOnce) {
        state.resyncOnce = false;
        return send(409, { code: 'REALTIME_RESYNC_REQUIRED' });
      }
      return send(200, {
        changes: state.accountChanges,
        nextCursor: 'fixture-cursor',
        hasMore: false,
        watermark: 'opaque-watermark',
        epoch: 'fixture-epoch',
        contextRevision: 'fixture-context',
        retryAfterMilliseconds: 15000,
      });
    }
    const op = operations.find(
      (o) =>
        o.method === req.method &&
        new RegExp('^' + o.path.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(url.pathname),
    );
    if (url.pathname === '/api/v1/files' && req.method === 'POST')
      return send(201, named('FileAssetResult', { id: ids.user, status: 'Ready' }));
    if (!op) return send(404, { status: 404 });
    let result = sample(op.response);
    const personalRequest = () =>
      named('PersonalClassRequestDto', {
        id: ids.user,
        requesterUserId: ids.user,
        details: {
          title: 'کلاس شخصی آزمایشی',
          purpose: 'آموزش مهارت',
          description: null,
          suggestedCapacity: 12,
          suggestedManagerUserId: ids.user,
          suggestedTeacherUserId: null,
        },
        status: state.personalStatus,
        version: state.personalVersion,
        createdClassId: state.personalStatus === 'Approved' ? ids.class : null,
        progress: {
          classState: 'Provisioning',
          managerAccepted: false,
          groupState: 'Pending',
          channelState: 'Pending',
        },
        privateLearnerAnswers: ['DO_NOT_EXPOSE_PRIVATE_ANSWER'],
      });
    const personalGrant = () =>
      named('PersonalClassAcademicPermissionDto', {
        id: ids.user,
        personalClassId: ids.class,
        membershipId: ids.membership,
        parentGrantId: null,
        capabilities: state.grantCapabilities,
        version: state.grantVersion,
        isEffective: state.grantCapabilities !== 'None',
        revokedAtUtc: state.grantCapabilities === 'None' ? now() : null,
      });
    if (op.path.startsWith('/api/admin/v1/personal-class-requests')) {
      if (req.method === 'POST') {
        if (body.expectedVersion !== state.personalVersion)
          return send(409, { code: 'PERSONAL_CLASS_VERSION_CONFLICT' });
        state.personalStatus = body.decision;
        state.personalVersion = 'AAAAAAAAAAM=';
        result = personalRequest();
      } else if (op.path.endsWith('/history'))
        result = {
          items: [
            named('PersonalClassDecisionDto', {
              action: state.personalStatus,
              reason: 'تصمیم آزمایشی',
            }),
          ],
          page: 1,
          pageSize: 30,
          totalCount: 1,
        };
      else if (op.path.endsWith('/{id}')) result = personalRequest();
      else
        result = {
          items: [personalRequest()],
          page: Number(url.searchParams.get('page') ?? 1),
          pageSize: Number(url.searchParams.get('pageSize') ?? 30),
          totalCount: 1,
        };
    }
    if (op.path.startsWith('/api/admin/v1/personal-classes/')) {
      if (op.path.endsWith('/memberships')) {
        const member = (overrides) =>
          named('PlatformPersonalClassMembershipDto', {
            membershipId: ids.membership,
            personalClassId: ids.class,
            userId: ids.user,
            displayName: 'مدیر آزمایشی',
            username: 'manager.test',
            localRoles: state.membershipRole,
            status: state.membershipStatus,
            endedAtUtc: null,
            membershipVersion: state.membershipVersion,
            canReceivePlatformAcademicGrant: state.membershipCanGrant,
            ...overrides,
          });
        let items = state.personalMemberships ?? [
          member({}),
          member({
            membershipId: ids.user,
            displayName: 'معلم آزمایشی',
            localRoles: 'Teacher',
            canReceivePlatformAcademicGrant: false,
          }),
          member({
            membershipId: ids.org,
            displayName: 'مدیر سابق',
            status: 'Ended',
            endedAtUtc: now(),
            canReceivePlatformAcademicGrant: false,
          }),
        ];
        const term = url.searchParams.get('search')?.trim().toLowerCase();
        const role = url.searchParams.get('role');
        if (role && role !== 'Manager' && role !== 'Teacher')
          return send(400, { code: 'PLATFORM_QUERY_INVALID' });
        items = items.filter(
          (m) =>
            (!term || (m.displayName + ' ' + m.username).toLowerCase().includes(term)) &&
            (!role ||
              m.localRoles
                .split(',')
                .map((r) => r.trim())
                .includes(role)) &&
            (url.searchParams.get('activeOnly') !== 'true' || m.status === 'Active'),
        );
        const page = Number(url.searchParams.get('page') ?? 1),
          pageSize = Number(url.searchParams.get('pageSize') ?? 30);
        result = {
          items: items.slice((page - 1) * pageSize, page * pageSize),
          page,
          pageSize,
          totalCount: items.length,
        };
      } else if (req.method === 'PUT') {
        const prior = state.grantIntents[body.clientOperationId];
        if (prior) {
          if (JSON.stringify(prior.body) !== JSON.stringify(body))
            return send(409, { code: 'PERSONAL_CLASS_REQUEST_CONFLICT' });
          return send(200, prior.result);
        }
        if (
          state.membershipRole !== 'Manager' ||
          state.membershipStatus !== 'Active' ||
          !state.membershipCanGrant
        )
          return send(409, { code: 'PERSONAL_CLASS_MANAGER_REQUIRED' });
        if (
          body.expectedMembershipVersion !== state.membershipVersion ||
          body.expectedGrantVersion !== state.grantVersion
        )
          return send(409, { code: 'PERSONAL_CLASS_VERSION_CONFLICT' });
        state.grantCapabilities = body.capabilities;
        state.grantVersion = 'AAAAAAAAAAQ=';
        result = personalGrant();
        state.grantIntents[body.clientOperationId] = { body, result };
      } else if (op.path.endsWith('/history'))
        result = {
          items: [
            named('PersonalClassHistoryItem', {
              action: 'GrantChanged',
              resourceType: 'PersonalClass',
              privateFeedback: 'DO_NOT_EXPOSE_PRIVATE_FEEDBACK',
            }),
          ],
          page: 1,
          pageSize: 30,
          totalCount: 1,
        };
      else
        result = {
          items: state.grantVersion ? [personalGrant()] : [],
          page: Number(url.searchParams.get('page') ?? 1),
          pageSize: Number(url.searchParams.get('pageSize') ?? 30),
          totalCount: state.grantVersion ? 1 : 0,
        };
    }
    const source = () =>
      named('EducationalSourceResult', {
        sourceId: ids.user,
        scope: state.sourceScope,
        version: state.sourceVersion,
        title: 'راهنمای کتابخانه',
        publicationStatus: state.sourcePublished ? 'Published' : 'Draft',
        status: 'Active',
        visibility: 'Hidden',
        revision: 1,
        capabilities: {
          canRead: true,
          canWrite: !state.sourcePublished,
          canCreateVersion: true,
          canPublish: !state.sourcePublished,
          canArchive: true,
          canDownload: state.sourceCanDownload,
          canChangeVisibility: true,
          canUseForAi: false,
        },
        file: {
          fileAssetId: ids.user,
          originalFileName: 'guide.pdf',
          contentType: 'application/pdf',
          sizeBytes: 16,
          status: 'Ready',
        },
      });
    if (url.pathname === '/api/admin/v1/library/sources') {
      if (req.method === 'POST') {
        const previous = state.librarySources.find(
          (s) => s.clientOperationId === body.clientOperationId,
        );
        result = previous ?? { ...source(), ...body };
        if (!previous) state.librarySources.push(result);
      } else {
        const all = Array.from({ length: 42 }, (_, i) => ({
          ...source(),
          sourceId: i === 0 ? ids.user : `10000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
          title: i === 0 ? 'راهنمای کتابخانه' : 'منبع ' + i,
        }));
        const filtered = all.filter(
          (s) =>
            !url.searchParams.get('Search') || s.title.includes(url.searchParams.get('Search')),
        );
        const page = Number(url.searchParams.get('Page') ?? 1),
          pageSize = Number(url.searchParams.get('PageSize') ?? 20);
        result = {
          page,
          pageSize,
          totalCount: filtered.length,
          items: filtered.slice((page - 1) * pageSize, page * pageSize),
        };
      }
    }
    if (url.pathname.startsWith('/api/v1/sources/')) {
      if (req.method !== 'GET') {
        if (body.expectedVersion !== state.sourceVersion)
          return send(412, { code: 'SOURCE_VERSION_CONFLICT' });
        state.sourceVersion += '-next';
        if (url.pathname.endsWith('/publish')) state.sourcePublished = true;
      }
      if (url.pathname.endsWith('/content')) {
        res.writeHead(200, { 'Content-Type': 'application/pdf' });
        return res.end('%PDF-fixture');
      }
      result = source();
    }
    if (op.path === '/api/admin/v1/provisioning') {
      if (req.method === 'POST') {
        const previous = state.provisions.find(
          (p) => p.clientOperationId === body.clientOperationId,
        );
        const completed = state.provisioningStatus === 'Completed';
        const item =
          previous ??
          named('PlatformProvisioningItem', {
            ...body,
            id: ids.user,
            requestedByUserId: ids.user,
            status: state.provisioningStatus,
            organizationId: completed ? ids.org : null,
            subscriptionId: completed && body.planVersionId ? ids.user : null,
            managerInvitationId: completed && body.initialManagerUserId ? ids.user : null,
          });
        if (!previous) state.provisions.push(item);
        result = { request: item, replayed: !!previous };
        if (state.provisionResponseLost) {
          state.provisionResponseLost = false;
          return send(504, { code: 'TIMEOUT' });
        }
      } else {
        const items = state.provisions.filter(
          (p) =>
            (!url.searchParams.get('status') || p.status === url.searchParams.get('status')) &&
            (!url.searchParams.get('clientOperationId') ||
              p.clientOperationId === url.searchParams.get('clientOperationId').trim()),
        );
        const page = Number(url.searchParams.get('page') ?? 1),
          pageSize = Number(url.searchParams.get('pageSize') ?? 30);
        result = {
          items: items.slice((page - 1) * pageSize, page * pageSize),
          page,
          pageSize,
          totalCount: items.length,
        };
      }
    }
    if (url.pathname === '/api/admin/v1/organizations' && req.method === 'GET') {
      let orgs = Array.from({ length: 42 }, (_, i) =>
        named('PlatformOrganizationItem', {
          id: i === 0 ? ids.org : `10000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
          name: i === 0 ? 'مدرسه آزمایشی ماکان' : `سازمان آزمایشی ${i + 1}`,
          activeMemberCount: 120 + i,
          activeClassCount: 8,
          activeManagerCount: 2,
          status: state.unknownEnum ? 'FUTURE_UNKNOWN' : i % 3 === 0 ? 'Active' : 'Suspended',
          managers: [],
          subscription: null,
        }),
      );
      if (url.searchParams.get('search'))
        orgs = orgs.filter((o) => o.name.includes(url.searchParams.get('search')));
      if (url.searchParams.get('status'))
        orgs = orgs.filter((o) => o.status === url.searchParams.get('status'));
      const page = Number(url.searchParams.get('page') ?? 1),
        pageSize = Number(url.searchParams.get('pageSize') ?? 20);
      result = {
        items: orgs.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        totalCount: orgs.length,
      };
    }
    if (op.path === '/api/admin/v1/organizations/{organizationId}')
      result = named('PlatformOrganizationDetail', {
        id: ids.org,
        name: 'مدرسه آزمایشی ماکان',
        activeMemberCount: 120,
        status: 'Active',
        managers: [],
        activeRoles: [],
        subscription: null,
        version: 'opaque-org-v1',
      });
    if (op.path === '/api/admin/v1/organizations/{organizationId}/memberships')
      result = named('PlatformMembershipPage', {
        items: [
          named('PlatformMembershipItem', {
            membershipId: ids.membership,
            userId: ids.user,
            displayName: 'عضو آزمایشی',
            activeRoles: ['Manager'],
          }),
        ],
      });
    if (op.path === '/api/admin/v1/education/classes')
      result = named('PlatformClassPage', {
        items: [
          named('PlatformClassItem', {
            classId: ids.class,
            title: 'ریاضی هشتم',
            organization: { id: ids.org, name: 'مدرسه آزمایشی ماکان' },
          }),
        ],
      });
    if (op.path === '/api/admin/v1/education/classes/{classId}')
      result = named('PlatformClassDetail', {
        class: named('PlatformClassItem', {
          classId: ids.class,
          title: 'ریاضی هشتم',
          organization: { id: ids.org, name: 'مدرسه آزمایشی ماکان' },
        }),
        activeLearners: [
          named('PlatformClassPerson', {
            referenceId: ids.membership,
            personId: ids.user,
            userId: null,
            displayName: 'فراگیر بدون حساب',
            privateAnswer: 'DO_NOT_EXPOSE_PRIVATE_ANSWER',
          }),
        ],
        activeLearnersTruncated: true,
        activeTeachersTruncated: true,
      });
    if (op.path === '/api/admin/v1/users')
      result = named('PlatformUserPage', {
        items: [
          named('PlatformUserItem', {
            userId: ids.user,
            displayName: 'کاربر آزمایشی',
            maskedPhone: state.masked,
            platformRoles: [],
          }),
        ],
        totalCount: 280,
      });
    if (op.path === '/api/admin/v1/users/{userId}')
      result = named('PlatformUserDetail', {
        userId: ids.user,
        displayName: 'کاربر آزمایشی',
        maskedPhone: state.masked,
        memberships: [],
        sessions: [named('PlatformUserSessionSummary', { sessionId: ids.user })],
        platformRoles: [],
        administrativeHistory: [],
      });
    if (op.path === '/api/v1/organization/people') {
      if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
      result = named('OrganizationPeoplePage', {
        items: [
          named('OrganizationPersonDto', {
            id: ids.user,
            organizationId: state.org,
            displayName: state.org === ids.org ? 'فرد سازمان اول' : 'فرد سازمان دوم',
            firstName: 'نام',
            lastName: 'آزمایشی',
            isAccountLinked: false,
          }),
        ],
      });
    }
    if (op.path === '/api/v1/organization/people/{id}')
      result = named('OrganizationPersonDto', {
        id: ids.user,
        organizationId: state.org,
        displayName: 'فرد آزمایشی بدون حساب',
        isAccountLinked: false,
        rowVersion: 'opaque-person-row',
        personRowVersion: 'opaque-person',
      });
    if (op.path === '/api/admin/v1/roles')
      result = [
        named('PlatformRoleCatalogItem', {
          key: 'FixtureRole',
          displayName: 'نقش آزمایشی',
          permissions: ['fixture.manage'],
        }),
      ];
    if (op.path === '/api/admin/v1/role-assignments' && req.method === 'GET')
      result = named('PlatformRoleAssignmentPage', {
        items: [
          named('PlatformRoleAssignmentItem', {
            assignmentId: ids.user,
            displayName: 'مدیر آزمایشی',
            roleDisplayName: 'نقش آزمایشی',
          }),
        ],
      });
    if (op.path === '/api/admin/v1/messaging/conversations')
      result = named('PlatformConversationMetadataPage', {
        items: [
          named('PlatformConversationMetadataItem', {
            conversationId: ids.user,
            organization: null,
            ...(state.excessConversationData
              ? {
                  title: 'گروه رسمی آزمایشی',
                  isOfficial: true,
                  officialSpace: { sourceId: ids.org },
                  messages: [{ text: 'PRIVATE_CONTENT_NOT_FOR_METADATA' }],
                  attachments: [{ fileAssetId: ids.class }],
                }
              : {}),
          }),
        ],
      });
    if (op.path === '/api/admin/v1/moderation/cases')
      result = named('PlatformModerationCasePage', {
        items: [named('PlatformModerationCaseItem', { caseId: ids.user, organization: null })],
      });
    if (op.path === '/api/admin/v1/moderation/cases/{caseId}')
      result = named('PlatformModerationCaseDetail', {
        case: named('PlatformModerationCaseItem', {
          caseId: ids.user,
          organization: null,
          version: 'opaque-case-v1',
        }),
      });
    if (op.path === '/api/admin/v1/commerce/plans' && req.method === 'GET')
      result = named('PlatformPlanPage', {
        items: [named('PlatformPlanItem', { planId: ids.user, displayName: 'پلن آزمایشی' })],
      });
    if (op.path === '/api/admin/v1/commerce/plans/{planId}')
      result = named('PlatformPlanDetail', {
        planId: ids.user,
        displayName: 'پلن آزمایشی',
        audience: state.planAudience,
        catalogVisible: true,
        newPurchaseAvailable: false,
        renewalAvailable: true,
        version: state.planVersion,
        versions: [
          named('PlatformPlanVersionItem', {
            planVersionId: ids.user,
            status: 'Draft',
            priceAmount: 120000,
            currency: 'Irr',
            priceToman: 12000,
            calendar: 'Persian',
            saleTermsReference: 'terms-v1',
            warningPercent: 80,
            criticalWarningPercent: 95,
            entitlements: [
              { key: 'Academic', enabled: true },
              { key: 'Ai', enabled: false },
            ],
            quotas: [{ key: 'StorageBytes', limit: null }],
            version: state.draftVersion,
          }),
          named('PlatformPlanVersionItem', {
            planVersionId: ids.otherOrg,
            versionNumber: 2,
            status: 'Published',
            priceAmount: 150000,
            currency: 'Irr',
          }),
        ],
      });
    if (op.path === '/api/admin/v1/commerce/plans/{planId}/availability') {
      if (body.expectedVersion !== state.planVersion)
        return send(409, { code: 'VERSION_CONFLICT' });
      state.planVersion = 'plan-v2';
      return send(200, undefined, { 'Content-Type': 'text/plain' });
    }
    if (op.path === '/api/admin/v1/commerce/plan-versions/{versionId}/draft') {
      if (body.expectedVersion !== state.draftVersion)
        return send(409, { code: 'VERSION_CONFLICT' });
      state.draftCanPublish = true;
      state.draftVersion = 'draft-v2';
    }
    if (
      op.path.startsWith('/api/admin/v1/commerce/') &&
      (op.path.endsWith('/validation') || op.path.endsWith('/draft'))
    )
      result = {
        planVersionId: ids.user,
        missingFields: state.draftCanPublish ? [] : ['saleTermsReference'],
        canPublish: state.draftCanPublish,
        version: state.draftVersion,
      };
    if (op.path.startsWith('/api/admin/v1/commerce/') && op.path.endsWith('/publish')) {
      if (!state.draftCanPublish || body.expectedVersion !== state.draftVersion)
        return send(409, { code: 'VERSION_CONFLICT' });
    }
    if (
      /^\/api\/admin\/v1\/commerce\/(users|organizations)\/.+\/(subscription|commercial-contracts)$/.test(
        url.pathname,
      )
    ) {
      const ownerType = url.pathname.includes('/users/') ? 'Individual' : 'Organization';
      if (req.method === 'POST') {
        if (body.expectedCurrentVersion !== state.commercialVersion)
          return send(409, { code: 'VERSION_CONFLICT' });
        state.commercialVersion = 'contract-v1';
        state.commercialHistory.push(
          named('CommercialHistoryDto', {
            reason: body.reason,
            action: 'RegisterContract',
            before: null,
            after: 'Active',
          }),
        );
      }
      result = named('CommercialSummaryDto', {
        ownerType,
        ownerId: ownerType === 'Individual' ? ids.user : ids.org,
        state: state.commercialVersion ? 'Active' : 'LegacyPendingContract',
        version: state.commercialVersion,
        migrationStatus: 'AwaitingValidContract',
        entitlements: { Academic: true, Ai: false },
        quotas: [
          named('CommercialQuotaDto', {
            key: 'StorageBytes',
            kind: 'CurrentCapacity',
            unit: 'bytes',
            limit: null,
            consumed: 42,
            reserved: 3,
            remaining: null,
            isUnlimited: false,
            isUsageAvailable: false,
          }),
        ],
      });
    }
    if (op.path === '/api/admin/v1/commerce/history/{targetId}') result = state.commercialHistory;
    if (op.path === '/api/admin/v1/finance/orders')
      result = named('PlatformOrderPage', {
        items: [named('PlatformOrderItem', { orderId: ids.user, organization: null })],
      });
    if (op.path === '/api/v1/auth/sessions')
      result = [named('UserSessionResult', { id: ids.user, deviceName: 'مرورگر آزمایشی' })];
    if (op.path === '/api/v1/academic/classes')
      result = [
        named('ClassResult', {
          id: ids.class,
          title: 'کلاس سازمان آزمایشی',
          organizationId: state.org,
        }),
      ];
    if (op.path === '/api/v1/academic/schedule')
      result = [named('SessionResult', { id: ids.class, title: 'جلسه آزمایشی' })];
    return send(op.response ? 200 : 204, result);
  });
}
