'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DirectionProvider } from '@radix-ui/react-direction';
import { useRouter } from 'next/navigation';
import type { components } from '@/generated/api/schema';
import { request, type ContextGuard } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { operationFor, operationKey } from '@/lib/api/contract';
import { hasCapability } from '@/lib/permissions';
import { LoadingSkeleton, ErrorState } from '@/components/ui/states';
import { PwaProvider } from '@/features/pwa/provider';
import { alignPushIdentity, disablePush } from '@/features/pwa/push-client';
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
export function RootProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) =>
              error instanceof ApiError && [502, 503, 504].includes(error.status) && count < 1,
            refetchOnWindowFocus: false,
            staleTime: 20000,
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <DirectionProvider dir="rtl">
      <QueryClientProvider client={client}>
        <PwaProvider>{children}</PwaProvider>
      </QueryClientProvider>
    </DirectionProvider>
  );
}
export function AccessProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<unknown>();
  const [changing, setChanging] = useState(false);
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
    try {
      const next = await request<SessionState>('/api/session');
      setSession((previous) => {
        if (previous && previous.revision !== next.revision) {
          void cache.cancelQueries();
          cache.clear();
        }
        return next;
      });
      setError(undefined);
    } catch (e) {
      setError(e);
    }
  }, [cache]);
  useEffect(() => {
    void reload();
    const channel = new BroadcastChannel('makan-session');
    const refresh = () => {
      setChanging(true);
      void cache
        .cancelQueries()
        .then(() => {
          cache.clear();
          return reload();
        })
        .finally(() => setChanging(false));
    };
    channel.onmessage = refresh;
    const focus = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    const expired = () => {
      void cache.cancelQueries();
      cache.clear();
      setSession(null);
      router.replace('/login');
    };
    window.addEventListener('makan:expired', expired);
    document.addEventListener('visibilitychange', focus);
    return () => {
      channel.close();
      window.removeEventListener('makan:expired', expired);
      document.removeEventListener('visibilitychange', focus);
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
  if (!session)
    return (
      <div className="bootstrap">
        <LoadingSkeleton />
      </div>
    );
  const guard: ContextGuard = {
    revision: session.revision,
    onContextChanged: () => {
      setChanging(true);
      void cache
        .cancelQueries()
        .then(() => {
          cache.clear();
          return reload();
        })
        .finally(() => setChanging(false));
    },
  };
  function can(path: string, method = 'GET') {
    const op = operationFor(method, path);
    if (!op) return false;
    if (path === '/api/admin/v1/me') return !!session?.platform;
    if (path.startsWith('/api/admin/')) return hasCapability(session!.capabilities, path, method);
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
