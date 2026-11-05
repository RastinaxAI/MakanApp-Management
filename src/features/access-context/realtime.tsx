'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccess } from './provider';
import { request } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import {
  consumeInvalidations,
  invalidationState,
  type AdminChanges,
} from '@/lib/admin-invalidation';
export function AdminRealtime() {
  const { session, guard, reload } = useAccess();
  const cache = useQueryClient();
  useEffect(() => {
    let stopped = false,
      running = false,
      cursor: string | undefined,
      timer: ReturnType<typeof setTimeout> | undefined;
    let waitUntil = 0;
    const controller = new AbortController();
    const state = invalidationState();
    async function poll() {
      if (stopped || running || document.hidden || !navigator.onLine) return;
      if (Date.now() < waitUntil) {
        timer = setTimeout(() => void poll(), waitUntil - Date.now());
        return;
      }
      running = true;
      let delay = 15000;
      try {
        const page = await request<AdminChanges>(
          '/api/realtime' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''),
          { signal: controller.signal },
          guard,
        );
        if (stopped) return;
        const next = consumeInvalidations(page, state);
        cursor = page.nextCursor;
        if (next.access || next.resync) {
          await reload();
          return;
        }
        if (next.personal)
          await cache.invalidateQueries({
            predicate: (q) =>
              typeof q.queryKey[2] === 'string' &&
              q.queryKey[2].startsWith('/api/admin/v1/personal-class'),
          });
        delay = page.hasMore
          ? 1000
          : Math.max(1000, Math.min(60000, page.retryAfterMilliseconds ?? 15000));
      } catch (error) {
        if (stopped) return;
        if (error instanceof ApiError && error.problem.code === 'REALTIME_RESYNC_REQUIRED') {
          cursor = undefined;
          await reload();
          return;
        }
        if (error instanceof ApiError && error.status === 429) {
          delay = Math.max(1000, (error.problem.retryAfter ?? 60) * 1000);
          waitUntil = Date.now() + delay;
        }
      } finally {
        running = false;
        if (!stopped) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void poll(), delay);
        }
      }
    }
    const wake = () => {
      if (timer) clearTimeout(timer);
      void poll();
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    void poll();
    return () => {
      stopped = true;
      controller.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
    };
  }, [session.user.id, session.revision, reload, cache]);
  return null;
}
