'use client';
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { request, type ContextGuard } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { ClientState } from '@/lib/server/client-session';
import type { components } from '@/generated/api/schema';
import { MessagingLiveProvider } from './messaging/live';
import { fileTransfer, type TransferOptions } from '@/lib/api/file-transfer';
type ClientAccess = {
  session: ClientState;
  changing: boolean;
  reload: () => Promise<void>;
  call: <T>(path: string, init?: RequestInit) => Promise<T>;
  transfer: <T>(path: string, options: TransferOptions) => Promise<T>;
  selectWorkspace: (value: components['schemas']['SelectWorkspaceCommand']) => Promise<void>;
  logout: () => Promise<void>;
};
const PersonalContext = createContext<ClientAccess | null>(null);
export function PersonalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [cache] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 15000, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  const [session, setSession] = useState<ClientState | null>(null),
    [error, setError] = useState<unknown>(),
    [changing, setChanging] = useState(false);
  const generation = useRef(0),
    loadAbort = useRef<AbortController | null>(null),
    current = useRef<ClientState | null>(null);
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
      const next = await request<ClientState>(
        '/api/client/session',
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
      if (e instanceof ApiError && e.status === 401) router.replace('/enter');
      else setError(e);
    } finally {
      if (epoch === generation.current) setChanging(false);
    }
  }, [cache, router]);
  useEffect(() => {
    void reload();
    const channel = new BroadcastChannel('makan-client-session');
    const update = () => void reload();
    const visible = () => {
      if (document.visibilityState === 'visible') update();
    };
    const expired = () => {
      generation.current++;
      loadAbort.current?.abort();
      current.current = null;
      setSession(null);
      void cache.cancelQueries();
      cache.clear();
      router.replace('/enter');
    };
    channel.onmessage = update;
    window.addEventListener('makan:expired', expired);
    document.addEventListener('visibilitychange', visible);
    return () => {
      generation.current++;
      loadAbort.current?.abort();
      channel.close();
      window.removeEventListener('makan:expired', expired);
      document.removeEventListener('visibilitychange', visible);
      void cache.cancelQueries();
      cache.clear();
    };
  }, [cache, reload, router]);
  function broadcast() {
    const channel = new BroadcastChannel('makan-client-session');
    channel.postMessage('changed');
    channel.close();
  }
  const renderedEpoch = generation.current;
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const selected = session;
    if (!selected) throw new ApiError(401);
    if (current.current !== selected || renderedEpoch !== generation.current)
      throw new DOMException('The action belongs to an earlier account or context.', 'AbortError');
    const epoch = renderedEpoch;
    const guard: ContextGuard = {
      revision: selected.revision,
      isCurrent: () => current.current === selected && epoch === generation.current,
      onContextChanged: () => void reload(),
    };
    const result = await request<T>('/api/client/backend' + path, init, guard);
    if (current.current !== selected || epoch !== generation.current)
      throw new DOMException(
        'The response belongs to an earlier account or context.',
        'AbortError',
      );
    return result;
  }
  async function selectWorkspace(value: components['schemas']['SelectWorkspaceCommand']) {
    setChanging(true);
    await cache.cancelQueries();
    cache.clear();
    try {
      await call('/api/v1/workspaces/select', { method: 'POST', body: JSON.stringify(value) });
      broadcast();
      await reload();
      router.push('/personal');
    } catch (e) {
      setError(e);
    } finally {
      setChanging(false);
    }
  }
  async function transfer<T>(path: string, options: TransferOptions): Promise<T> {
    const selected = session,
      epoch = renderedEpoch;
    if (!selected) throw new ApiError(401);
    const guard: ContextGuard = {
      revision: selected.revision,
      isCurrent: () => current.current === selected && generation.current === epoch,
      onContextChanged: () => void reload(),
    };
    const value = await fileTransfer<T>(path, options, guard);
    if (!guard.isCurrent!()) throw new DOMException('Earlier account or context.', 'AbortError');
    return value;
  }
  async function logout() {
    setChanging(true);
    try {
      await cache.cancelQueries();
      await request('/api/client/auth/logout', { method: 'POST' });
      generation.current++;
      loadAbort.current?.abort();
      current.current = null;
      setSession(null);
      cache.clear();
      broadcast();
      router.replace('/enter');
    } catch (e) {
      setError(e);
    } finally {
      setChanging(false);
    }
  }
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
  return (
    <PersonalContext.Provider
      value={{ session, changing, reload, call, transfer, selectWorkspace, logout }}
    >
      <QueryClientProvider client={cache}>
        <MessagingLiveProvider
          key={session.user.id + ':' + session.revision}
          userId={session.user.id}
          revision={session.revision}
        >
          {children}
        </MessagingLiveProvider>
      </QueryClientProvider>
    </PersonalContext.Provider>
  );
}
export function usePersonal() {
  const value = useContext(PersonalContext);
  if (!value) throw new Error('PersonalProvider required');
  return value;
}
export function usePersonalApi<T>(
  path: string,
  options: { enabled?: boolean; poll?: number } = {},
) {
  const { session, call } = usePersonal();
  return useQuery<T>({
    queryKey: ['personal', session.user.id, session.revision, path],
    queryFn: ({ signal }) => call<T>(path, { signal }),
    enabled: options.enabled ?? true,
    refetchInterval: options.poll ?? false,
  });
}
