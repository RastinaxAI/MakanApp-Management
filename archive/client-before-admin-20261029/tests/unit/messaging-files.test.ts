import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  id: vi.fn(),
  state: vi.fn(),
  read: vi.fn(),
  authenticated: vi.fn(),
  locked: false,
}));
vi.mock('@/lib/server/client-session', () => ({
  clientSessionId: mocks.id,
  getClientState: mocks.state,
}));
vi.mock('@/lib/server/session', () => ({
  readSession: mocks.read,
  withSessionLock: async (_id: string, work: () => Promise<unknown>) => {
    mocks.locked = true;
    try {
      return await work();
    } finally {
      mocks.locked = false;
    }
  },
}));
vi.mock('@/lib/server/backend', async (original) => ({
  ...(await original<typeof import('@/lib/server/backend')>()),
  authenticatedFetch: mocks.authenticated,
}));
import { GET, POST } from '@/app/api/client/files/[[...path]]/route';
const userId = '11111111-1111-4111-8111-111111111111',
  conversationId = '22222222-2222-4222-8222-222222222222',
  fileId = '33333333-3333-4333-8333-333333333333';
const timestamp = '2026-10-28T10:00:00Z';
const conversation = {
  conversationId,
  type: 'Group',
  scope: 'Personal',
  organizationId: null,
  title: 'test',
  description: null,
  managementPolicy: 'UserManaged',
  visibility: 'Private',
  groupHistoryPolicy: 'FullHistory',
  memberCapabilities: 'LegacyMemberDefault',
  status: 'Active',
  createdAtUtc: timestamp,
  archivedAtUtc: null,
  version: 'v1',
  alreadyExisted: false,
  participants: [
    {
      participantId: '44444444-4444-4444-8444-444444444444',
      user: { userId, username: 'test', displayName: 'test' },
      role: 'Owner',
      status: 'Active',
      joinedAtUtc: timestamp,
      endedAtUtc: null,
      historyVisibleFromSequence: 0,
      adminPermissions: 'None',
      version: 'v1',
    },
  ],
};
const asset = {
  id: fileId,
  organizationId: null,
  uploadedByUserId: userId,
  originalFileName: 'fixture.txt',
  contentType: 'text/plain',
  sizeBytes: 3,
  sha256Hash: null,
  status: 'Ready',
  createdAtUtc: timestamp,
  completedAtUtc: timestamp,
  deletedAtUtc: null,
  retainedAtUtc: null,
  unattachedExpiresAtUtc: '2026-10-29T10:00:00Z',
  rowVersion: 'v1',
};
let session: { revision: string; accessToken: string },
  state: {
    revision: string;
    user: { id: string };
    context: { workspaceType: string; organizationId: null };
  };
function request(upload = false, origin = 'http://127.0.0.1:3000') {
  const body = new FormData();
  body.append('File', new Blob(['abc']), 'fixture.txt');
  return new Request(
    'http://127.0.0.1:3000/api/client/files' +
      (upload ? '' : '/' + fileId + '/content') +
      '?conversationId=' +
      conversationId,
    {
      method: upload ? 'POST' : 'GET',
      headers: { Origin: origin, Host: '127.0.0.1:3000', 'X-Makan-Context': 'revision-a' },
      body: upload ? body : undefined,
    },
  );
}
const parameters = (upload = false) => ({
  params: Promise.resolve({ path: upload ? undefined : [fileId, 'content'] }),
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SESSION_SECRET', '0'.repeat(64));
  vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3000');
  session = { revision: 'revision-a', accessToken: 'fixture-token' };
  state = {
    revision: 'revision-a',
    user: { id: userId },
    context: { workspaceType: 'Personal', organizationId: null },
  };
  mocks.id.mockResolvedValue('session-a');
  mocks.state.mockImplementation(async () => state);
  mocks.read.mockImplementation(async () => session);
  mocks.authenticated.mockImplementation(async (_id: string, _session: unknown, path: string) => ({
    response: Response.json(
      path.endsWith('/me/restriction')
        ? {
            conversationId,
            userId,
            isBanned: false,
            deniedCapabilities: 'None',
            untilUtc: null,
            isEffective: false,
            version: null,
          }
        : conversation,
    ),
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('conversation-bound streaming file BFF', () => {
  it('streams an authorized multipart upload outside the session lock and returns a validated asset without credentials', async () => {
    const fetch = vi.fn(async (_url: URL, init: RequestInit) => {
      expect(mocks.locked).toBe(false);
      expect(init.body).toBeInstanceOf(ReadableStream);
      expect(new Headers(init.headers).get('Authorization')).toBe('Bearer fixture-token');
      await new Response(init.body).arrayBuffer();
      return Response.json(asset, { status: 201 });
    });
    vi.stubGlobal('fetch', fetch);
    const response = await POST(request(true), parameters(true));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(asset);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects another origin before upload', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await POST(request(true, 'https://other.invalid'), parameters(true))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not upload from an unselected personal context or silently switch workspace', async () => {
    state.context.workspaceType = 'Organization';
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await POST(request(true), parameters(true))).status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not upload if the conversation denies media even when the user is a conversation owner', async () => {
    mocks.authenticated.mockImplementation(
      async (_id: string, _session: unknown, path: string) => ({
        response: Response.json(
          path.endsWith('/me/restriction')
            ? {
                conversationId,
                userId,
                isBanned: false,
                deniedCapabilities: 'SendMedia',
                untilUtc: null,
                isEffective: true,
                version: 'v1',
              }
            : conversation,
        ),
      }),
    );
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await POST(request(true), parameters(true))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects an upload receipt belonging to another actor', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { ...asset, uploadedByUserId: '55555555-5555-4555-8555-555555555555' },
            { status: 201 },
          ),
        ),
    );
    expect((await POST(request(true), parameters(true))).status).toBe(502);
  });
  it('streams actual binary bytes without trusting the JSON FileStreamResult description', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Length': '3' } }),
        ),
    );
    const response = await GET(request(), parameters());
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
  it('stops a delayed download before returning a chunk after local access context changes', async () => {
    let streamController!: ReadableStreamDefaultController<Uint8Array>;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              streamController = controller;
            },
          }),
        ),
      ),
    );
    const response = await GET(request(), parameters());
    const pending = response.arrayBuffer();
    session.revision = 'revision-b';
    streamController.enqueue(new Uint8Array([1, 2, 3]));
    streamController.close();
    await expect(pending).rejects.toMatchObject({ status: 409 });
  });
});
