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
    platformPermissions: ['platform.access', 'fixture.manage'],
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
    status: 0,
    code: null,
    errorOnce: false,
    shortTokens: false,
    delay: 0,
    unknownEnum: false,
    masked: '0912***1234',
    provisions: [],
    provisioningStatus: 'Requested',
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
      const snapshot = state;
      snapshot.activeReads++;
      snapshot.maxConcurrentReads = Math.max(snapshot.maxConcurrentReads, snapshot.activeReads);
      res.once('finish', () => { snapshot.activeReads--; });
      if (snapshot.readDelayMs) await new Promise(resolve => setTimeout(resolve, snapshot.readDelayMs));
    }
    if (req.method !== 'GET' && !url.pathname.startsWith('/api/v1/auth'))
      state.events.push({ method: req.method, path: url.pathname, body });
    if (state.failPath && url.pathname.includes(state.failPath)) {
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
    const op = operations.find(
      (o) =>
        o.method === req.method &&
        new RegExp('^' + o.path.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(url.pathname),
    );
    if (!op) return send(404, { status: 404 });
    let result = sample(op.response);
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
      } else {
        const items = state.provisions.filter(
          (p) => !url.searchParams.get('status') || p.status === url.searchParams.get('status'),
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
        activeLearners: [{ intentionally: 'untyped-private-value' }],
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
        versions: [
          named('PlatformPlanVersionItem', {
            planVersionId: ids.user,
            status: 'Draft',
            priceAmount: 120000,
            currency: 'Irr',
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
