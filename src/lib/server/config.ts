import 'server-only';
import path from 'node:path';
import documentedBindings from '../../../contracts/platform-permissions.json';
import type { PermissionBinding } from '@/lib/permissions';
function json<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  return JSON.parse(value) as T;
}
export function serverConfig() {
  const backend = new URL(process.env.BACKEND_BASE_URL ?? 'http://94.184.32.84:8090');
  if (
    !['http:', 'https:'].includes(backend.protocol) ||
    backend.username ||
    backend.password ||
    backend.pathname !== '/'
  )
    throw new Error('BACKEND_BASE_URL must be an origin');
  const secret = process.env.SESSION_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret))
    throw new Error('Set SESSION_SECRET to a random 32-byte hex value');
  const origin = new URL(process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000');
  return {
    backend: backend.origin,
    origin: origin.origin,
    key: Buffer.from(secret, 'hex'),
    sessionDirectory: path.resolve(
      /* turbopackIgnore: true */ process.env.SESSION_DIRECTORY ?? '.makan-sessions',
    ),
    secure: process.env.COOKIE_SECURE === 'true',
    // Exact controller policies from the supplied backend contract. Per-environment overrides
    // remain possible; possession of the policy is still checked for every operation.
    bindings: {
      ...documentedBindings,
      ...json<Record<string, PermissionBinding>>(process.env.PERMISSION_BINDINGS, {}),
    } as Record<string, PermissionBinding>,
    // Exact backend role keys; never infer owner from a school role or a display label.
    ownerRoleKeys: json<unknown>(process.env.PLATFORM_OWNER_ROLE_KEYS, []),
    // Allows real negative login tests from the local app; never bypasses owner authorization.
    allowUnconfiguredOwnerOtp:
      process.env.ALLOW_UNCONFIGURED_OWNER_OTP_TESTING === 'true' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname),
  };
}
