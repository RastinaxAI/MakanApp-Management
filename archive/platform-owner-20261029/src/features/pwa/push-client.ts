import { request, type ContextGuard } from '@/lib/api/client';
import type { components } from '@/generated/api/schema';

const DEVICE_KEY = 'makan-push-device';
const guid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export type Device = { userId: string; id: string; version: string | null };
export function currentDevice(): Device | null {
  try {
    const value = JSON.parse(localStorage.getItem(DEVICE_KEY) ?? 'null');
    return value &&
      typeof value.userId === 'string' &&
      guid.test(value.userId) &&
      typeof value.id === 'string' &&
      guid.test(value.id) &&
      (value.version === null || typeof value.version === 'string')
      ? value
      : null;
  } catch {
    return null;
  }
}
export function applicationKey(key: string): Uint8Array<ArrayBuffer> {
  const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  if (bytes.length !== 65 || bytes[0] !== 4)
    throw new Error('پیکربندی سرویس اعلان معتبر نیست؛ با پشتیبانی تماس بگیرید.');
  return bytes;
}
export async function workerPreference(
  reg: ServiceWorkerRegistration,
  enabled: boolean,
  userId?: string,
) {
  reg.active?.postMessage({ type: enabled ? 'PUSH_ENABLED' : 'PUSH_DISABLED', userId });
}
export async function alignPushIdentity(userId: string) {
  const stored = currentDevice();
  if (
    !stored ||
    stored.userId.toLowerCase() === userId.toLowerCase() ||
    !('serviceWorker' in navigator)
  )
    return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (reg) {
    await workerPreference(reg, false);
    await (await reg.pushManager?.getSubscription())?.unsubscribe();
  }
  localStorage.removeItem(DEVICE_KEY);
}
export async function enablePush(
  reg: ServiceWorkerRegistration,
  userId: string,
  key: string,
  guard: ContextGuard,
) {
  let subscription = await reg.pushManager.getSubscription();
  const stored = currentDevice();
  if (subscription && (!stored || stored.userId.toLowerCase() !== userId.toLowerCase())) {
    await subscription.unsubscribe();
    subscription = null;
  }
  const created = !subscription;
  subscription ??= await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationKey(key),
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
    throw new Error('ثبت اعلان در این مرورگر کامل نشد. دوباره تلاش کنید.');
  let result: components['schemas']['PushDeviceRegistrationResult'];
  try {
    result = await request<components['schemas']['PushDeviceRegistrationResult']>(
      '/api/backend/api/v1/notifications/devices/web-push',
      {
        method: 'POST',
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          expectedVersion:
            stored?.userId.toLowerCase() === userId.toLowerCase() ? stored.version : null,
        }),
      },
      guard,
    );
  } catch (error) {
    if (created) {
      await subscription.unsubscribe().catch(() => {});
      await workerPreference(reg, false);
    }
    throw error;
  }
  const device = { userId, id: result.id, version: result.version ?? null };
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
  } catch {
    await subscription.unsubscribe();
    throw new Error(
      'ذخیره تنظیمات مرورگر ممکن نیست. دسترسی ذخیره‌سازی را فعال و دوباره تلاش کنید.',
    );
  }
  await workerPreference(reg, true, userId);
  return device;
}
export async function disablePush(userId: string, guard: ContextGuard) {
  const stored = currentDevice();
  let revokeError: unknown;
  if (stored?.userId.toLowerCase() === userId.toLowerCase()) {
    try {
      await request(
        '/api/backend/api/v1/notifications/devices/' + stored.id,
        { method: 'DELETE', signal: AbortSignal.timeout(5000) },
        guard,
      );
    } catch (error) {
      revokeError = error;
    }
  }
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (reg) {
      await workerPreference(reg, false);
      await (await reg.pushManager?.getSubscription())?.unsubscribe();
    }
  }
  if (!revokeError) localStorage.removeItem(DEVICE_KEY);
  if (revokeError)
    throw new Error(
      'نمایش اعلان در این مرورگر خاموش شد؛ قطع ثبت دستگاه در سرور موفق نبود. دوباره «خاموش کردن اعلان‌ها» را بزنید.',
    );
}
