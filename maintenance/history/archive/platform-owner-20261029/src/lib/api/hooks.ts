'use client';
import { useQuery } from '@tanstack/react-query';
import { useAccess } from '@/features/access-context/provider';
import { request } from './client';
export function useApi<T>(path: string, enabled = true) {
  const { session, guard, can } = useAccess();
  return useQuery<T>({
    queryKey: [session.user.id, session.revision, path],
    queryFn: ({ signal }) => request<T>('/api/backend' + path, { signal }, guard),
    enabled: enabled && can(path.split('?')[0]),
  });
}
