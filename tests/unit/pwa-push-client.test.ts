import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  applicationKey,
  currentDevice,
  disablePush,
  alignPushIdentity,
  enablePush,
} from '@/features/pwa/push-client';
const userId = 'd3700000-0000-0000-0000-000000000005';
const id = '00000000-0000-4000-8000-000000000012';
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());
it('accepts a URL-safe uncompressed VAPID key and rejects a malformed one', () => {
  const key = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString('base64url');
  expect(applicationKey(key)).toHaveLength(65);
  expect(() => applicationKey('invalid')).toThrow();
});
it('rejects tampered device paths before an automatic logout request can be constructed', () => {
  store.set(
    'makan-push-device',
    JSON.stringify({ userId, id: '../../admin/v1/organizations/victim', version: null }),
  );
  expect(currentDevice()).toBeNull();
});
it('revokes the matching device, disables local push and unsubscribes on logout', async () => {
  store.set('makan-push-device', JSON.stringify({ userId, id, version: 'v1' }));
  const unsubscribe = vi.fn().mockResolvedValue(true),
    postMessage = vi.fn();
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistration: vi
        .fn()
        .mockResolvedValue({
          active: { postMessage },
          pushManager: { getSubscription: vi.fn().mockResolvedValue({ unsubscribe }) },
        }),
    },
  });
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetch);
  await disablePush(userId, { revision: 'r1' });
  expect(fetch.mock.calls[0][0]).toBe('/api/backend/api/v1/notifications/devices/' + id);
  expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  expect(unsubscribe).toHaveBeenCalledOnce();
  expect(postMessage).toHaveBeenCalledWith({ type: 'PUSH_DISABLED', userId: undefined });
  expect(currentDevice()).toBeNull();
});
it('still disables the browser when the server revocation fails and retains metadata for explicit retry', async () => {
  store.set('makan-push-device', JSON.stringify({ userId, id, version: null }));
  const unsubscribe = vi.fn().mockResolvedValue(true),
    postMessage = vi.fn();
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistration: vi
        .fn()
        .mockResolvedValue({
          active: { postMessage },
          pushManager: { getSubscription: vi.fn().mockResolvedValue({ unsubscribe }) },
        }),
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ status: 503 }, { status: 503 })),
  );
  await expect(disablePush(userId, { revision: 'r1' })).rejects.toThrow('خاموش شد');
  expect(unsubscribe).toHaveBeenCalled();
  expect(currentDevice()?.id).toBe(id);
});
it('switching account unsubscribes the previous device without revoking a different users server record', async () => {
  store.set('makan-push-device', JSON.stringify({ userId, id, version: null }));
  const unsubscribe = vi.fn().mockResolvedValue(true),
    fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistration: vi
        .fn()
        .mockResolvedValue({
          active: { postMessage: vi.fn() },
          pushManager: { getSubscription: vi.fn().mockResolvedValue({ unsubscribe }) },
        }),
    },
  });
  await alignPushIdentity('00000000-0000-4000-8000-000000000001');
  expect(unsubscribe).toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(currentDevice()).toBeNull();
});
it('cleans up a new browser subscription when backend registration fails', async () => {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  const reg = {
    active: { postMessage: vi.fn() },
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi
        .fn()
        .mockResolvedValue({
          unsubscribe,
          toJSON: () => ({
            endpoint: 'https://push.example/sub',
            keys: { p256dh: 'public-key', auth: 'auth-key' },
          }),
        }),
    },
  };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ status: 503 }, { status: 503 })),
  );
  const key = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString('base64url');
  await expect(
    enablePush(reg as unknown as ServiceWorkerRegistration, userId, key, { revision: 'r1' }),
  ).rejects.toMatchObject({ status: 503 });
  expect(unsubscribe).toHaveBeenCalled();
  expect(currentDevice()).toBeNull();
});
