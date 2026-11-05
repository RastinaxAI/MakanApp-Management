import { describe, it, expect } from 'vitest';
import {
  consumeInvalidations,
  invalidationState,
  type AdminChanges,
} from '@/lib/admin-invalidation';
const page = (
  events: AdminChanges['events'] = [],
  epoch = 'epoch',
  contextRevision = 'context',
): AdminChanges => ({
  events,
  nextCursor: 'opaque-cursor',
  hasMore: false,
  epoch,
  contextRevision,
  retryAfterMilliseconds: null,
});
const event = {
  eventId: 'event-1',
  streamVersion: 'opaque-version-1',
  key: 'personalClassFormation',
};
describe('account invalidations never become final administrative state', () => {
  it('refetches for a formation hint and deduplicates delivery by event ID and stream version', () => {
    const state = invalidationState();
    expect(consumeInvalidations(page([event]), state)).toEqual({
      access: false,
      personal: true,
      resync: false,
    });
    expect(
      consumeInvalidations(page([event, { ...event, eventId: 'event-2' }]), state).personal,
    ).toBe(false);
    expect(
      consumeInvalidations(page([{ ...event, streamVersion: 'another-version' }]), state).personal,
    ).toBe(false);
  });
  it('reloads authoritative permissions for access hints', () =>
    expect(
      consumeInvalidations(page([{ ...event, key: 'access' }]), invalidationState()).access,
    ).toBe(true));
  it('requests a new snapshot when epoch or context changes', () => {
    const state = invalidationState();
    consumeInvalidations(page(), state);
    expect(consumeInvalidations(page([], 'next-epoch'), state).resync).toBe(true);
    expect(consumeInvalidations(page([], 'next-epoch', 'next-context'), state).resync).toBe(true);
  });
  it('bounds its memory without converting opaque versions to numbers', () => {
    const state = invalidationState();
    consumeInvalidations(
      page(
        Array.from({ length: 700 }, (_, i) => ({
          ...event,
          eventId: 'event-' + i,
          streamVersion: 'opaque-' + i,
        })),
      ),
      state,
    );
    expect(state.ids.size).toBe(512);
    expect(state.versions.size).toBe(512);
  });
});
