'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { components } from '@/generated/api/schema';
import { request, type ContextGuard } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { operationFor, operationKey } from '@/lib/api/contract';
import { hasCapability } from '@/lib/permissions';
import { LoadingSkeleton, ErrorState } from '@/components/ui/states';
import { alignPushIdentity, disablePush } from '@/features/pwa/push-client';
import { AdminRealtime } from './realtime';
export type SessionState = {
  user: components['schemas']['CurrentUserResult'];
  platform: components['schemas']['PlatformMeResult'] | null;
  context: components['schemas']['AccessContext'] | null;
  revision: string;
  capabilities: string[];
  unboundOperationCount: number;
};
type Access = {
  session: SessionState;
  guard: ContextGuard;
  can: (path: string, method?: string) => boolean;
  reload: () => Promise<void>;
  switchWorkspace: (body: components['schemas']['SelectWorkspaceCommand']) => Promise<void>;
  logout: () => Promise<void>;
  changing: boolean;
};
export const AccessContext = createContext<Access | null>(null);
export function AccessProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<unknown>();
  const [changing, setChanging] = useState(false);
  const permissionReloads = useRef(new Map<string, number>());
  const current = useRef<SessionState | null>(null),
    generation = useRef(0),
    loadAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (session) void alignPushIdentity(session.user.id).catch(() => {});
  }, [session?.user.id]);
  const [cache] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 20000, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  const reload = useCallback(async () => {
    const epoch = ++generation.current;
    loadAbort.current?.abort();
    const controller = new AbortController();
    loadAbort.current = controller;
    setChanging(true);
    await cache.cancelQueries();
    if (epoch !== generation.current || controller.signal.aborted) return;
    cache.clear();
    try {
      const next = await request<SessionState>(
        '/api/session',
        { signal: controller.signal },
        { revision: '', isCurrent: () => epoch === generation.current },
      );
      if (epoch !== generation.current || controller.signal.aborted) return;
      current.current = next;
      setSession(next);
      setError(undefined);
    } catch (e) {
      if (epoch !== generation.current || controller.signal.aborted) return;
      current.current = null;
      setSession(null);
      setError(e);
    } finally {
      if (epoch === generation.current) setChanging(false);
    }
  }, [cache]);
  useEffect(() => {
    void reload();
    const channel = new BroadcastChannel('makan-session');
    const refresh = () => void reload();
    channel.onmessage = refresh;
    const focus = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    const expired = () => {
      generation.current++;
      loadAbort.current?.abort();
      current.current = null;
      void cache.cancelQueries();
      cache.clear();
      setSession(null);
      router.replace('/login');
    };
    window.addEventListener('makan:expired', expired);
    document.addEventListener('visibilitychange', focus);
    return () => {
      generation.current++;
      loadAbort.current?.abort();
      channel.close();
      window.removeEventListener('makan:expired', expired);
      document.removeEventListener('visibilitychange', focus);
      void cache.cancelQueries();
      cache.clear();
    };
  }, [reload, cache, router]);
  const broadcast = () => {
    const c = new BroadcastChannel('makan-session');
    c.postMessage('changed');
    c.close();
  };
  if (error)
    return (
      <div className="bootstrap">
        <ErrorState error={error} onRetry={() => void reload()} />
      </div>
    );
  if (!session || changing)
    return (
      <div className="bootstrap">
        <LoadingSkeleton />
      </div>
    );
  const renderedEpoch = generation.current;
  const guard: ContextGuard = {
    revision: session.revision,
    isCurrent: () => current.current === session && renderedEpoch === generation.current,
    onContextChanged: () => void reload(),
    onPermissionDenied: (path) => {
      const key = session.user.id + ':' + path + ':' + [...(session.platform?.permissions??[])].sort().join('|');
      const last = permissionReloads.current.get(key);
      if (last !== undefined && Date.now() - last < 30000) return;
      permissionReloads.current.set(key, Date.now());
      if (permissionReloads.current.size > 64)
        permissionReloads.current.delete(permissionReloads.current.keys().next().value!);
      void reload();
    },
  };
  function can(path: string, method = 'GET') {
    const op = operationFor(method, path);
    if (!op) return false;
    if (path === '/api/admin/v1/me') return !!session?.platform;
    if (path.startsWith('/api/admin/') || path.startsWith('/api/v1/sources/'))
      return hasCapability(session!.capabilities, path, method);
    return (
      !/^\/api\/v1\/(organization|academic|reports\/manager|dashboards\/manager)/.test(path) ||
      (session?.context?.workspaceType === 'Organization' &&
        session.context.activeRole === 'Manager')
    );
  }
  async function switchWorkspace(body: components['schemas']['SelectWorkspaceCommand']) {
    setChanging(true);
    try {
      await cache.cancelQueries();
      cache.clear();
      await request(
        '/api/backend/api/v1/workspaces/select',
        { method: 'POST', body: JSON.stringify(body) },
        guard,
      );
      broadcast();
      await reload();
      router.push(body.workspaceType === 'Organization' ? '/organization' : '/admin');
    } finally {
      setChanging(false);
    }
  }
  async function logout() {
    setChanging(true);
    try {
      await cache.cancelQueries();
      await disablePush(session!.user.id, guard).catch(() => {});
      await request('/api/auth/logout', { method: 'POST' });
      generation.current++;
      loadAbort.current?.abort();
      current.current = null;
      setSession(null);
      cache.clear();
      broadcast();
      router.replace('/login');
    } finally {
      setChanging(false);
    }
  }
  return (
    <AccessContext.Provider
      value={{ session, guard, can, reload, switchWorkspace, logout, changing }}
    >
      <QueryClientProvider client={cache}>
        <AdminRealtime />
        <div key={session.revision} aria-busy={changing}>
          {changing ? (
            <div className="context-loading">
              <LoadingSkeleton />
            </div>
          ) : (
            children
          )}
        </div>
      </QueryClientProvider>
    </AccessContext.Provider>
  );
}
export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('AccessProvider required');
  return ctx;
}
