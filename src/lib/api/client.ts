import type { paths } from '@/generated/api/schema';
import { ApiError, parseProblem } from './errors';
type GetPaths = { [K in keyof paths]: paths[K] extends { get: unknown } ? K : never }[keyof paths];
type GetResult<P extends GetPaths> = paths[P] extends {
  get: { responses: { 200: { content: { 'application/json': infer T } } } };
}
  ? T
  : unknown;
export type ContextGuard = {
  revision: string;
  onContextChanged?: () => void;
  onPermissionDenied?: (path: string) => void;
  isCurrent?: () => boolean;
};
export async function request<T>(
  path: string,
  init: RequestInit = {},
  guard?: ContextGuard,
): Promise<T> {
  const ensureCurrent = () => {
    if (guard?.isCurrent && !guard.isCurrent())
      throw new DOMException('The request belongs to an earlier account or context.', 'AbortError');
  };
  ensureCurrent();
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        ...(init.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(guard ? { 'X-Makan-Context': guard.revision } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    ensureCurrent();
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(503, { code: 'NETWORK_ERROR' });
  }
  ensureCurrent();
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {}
    ensureCurrent();
    const p = parseProblem(body, response.status, response.headers.get('Retry-After'));
    if (p.code === 'CONTEXT_CHANGED') guard?.onContextChanged?.();
    if (
      response.status === 403 &&
      ['PERMISSION_DENIED', 'PLATFORM_ACCESS_DENIED', 'AUTH_FORBIDDEN'].includes(p.code ?? '')
    )
      guard?.onPermissionDenied?.(path);
    if (
      (response.status === 401 || p.code === 'PLATFORM_OWNER_REQUIRED') &&
      typeof window !== 'undefined'
    )
      window.dispatchEvent(new Event('makan:expired'));
    throw new ApiError(response.status, p);
  }
  if (response.status === 204) return undefined as T;
  // Some documented command endpoints return 200 with no response body.
  if (!response.headers.get('Content-Type')?.includes('octet-stream')) {
    const text = await response.text();
    ensureCurrent();
    if (!text.trim()) return undefined as T;
    return JSON.parse(text) as T;
  }
  const result = response.headers.get('Content-Type')?.includes('octet-stream')
    ? await response.blob()
    : await response.json();
  ensureCurrent();
  return result as T;
}
export function get<P extends GetPaths>(
  template: P,
  path: string,
  guard: ContextGuard,
  signal?: AbortSignal,
): Promise<GetResult<P>> {
  return request<GetResult<P>>('/api/backend' + path, { signal }, guard);
}
