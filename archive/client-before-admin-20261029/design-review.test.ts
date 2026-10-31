import { describe, expect, it } from 'vitest';
import { isDesignReviewPath, isReviewEnabled } from '@/features/design-review/isolation';
import {
  canCompose,
  chats,
  filterChats,
  filterPlans,
  formatUnknownAmount,
  initialPlans,
} from '@/features/design-review/model';

describe('isolated design review', () => {
  it('is disabled unless explicitly enabled and matches only its own route boundary', () => {
    for (const value of [undefined, '', 'false', '1', 'TRUE'])
      expect(isReviewEnabled(value)).toBe(false);
    expect(isReviewEnabled('true')).toBe(true);
    for (const path of ['/admin', '/api/session', '/design-reviewer', '/design-review-backup'])
      expect(isDesignReviewPath(path)).toBe(false);
    expect(isDesignReviewPath('/design-review')).toBe(true);
    expect(isDesignReviewPath('/design-review/atlas/plans')).toBe(true);
  });
  it('leaves unavailable commercial values unknown', () => {
    expect(formatUnknownAmount(null)).toBe('تعیین نشده');
    expect(formatUnknownAmount(0)).toBe('۰');
    expect(initialPlans.every((plan) => plan.price === null && plan.quota === null)).toBe(true);
  });
  it('combines the audience filter and case insensitive plan search without changing fixtures', () => {
    expect(filterPlans(initialPlans, ' pro ', 'فردی').map((p) => p.id)).toEqual(['professional']);
    expect(filterPlans(initialPlans, 'pro', 'سازمانی')).toEqual([]);
    expect(initialPlans).toHaveLength(4);
  });
  it('filters the complete local fixture by explicit scope, never by role or name', () => {
    expect(filterChats('', 'Organization').map((c) => c.id)).toEqual(['class', 'channel']);
    expect(filterChats('سارا', 'Organization')).toEqual([]);
    expect(filterChats('سارا', 'Personal').map((c) => c.id)).toEqual(['sara']);
  });
  it('ends the official composer after revocation while retaining the personal composer', () => {
    const personal = chats.find((c) => c.id === 'sara')!;
    const official = chats.find((c) => c.id === 'class')!;
    const channel = chats.find((c) => c.id === 'channel')!;
    expect(canCompose(personal, 'revoked')).toBe(true);
    expect(canCompose(official, 'revoked')).toBe(false);
    expect(canCompose(official, 'ready')).toBe(true);
    expect(canCompose(channel, 'ready')).toBe(false);
    expect(filterChats('تمرین', 'Organization', true)).toEqual([]);
    expect(
      filterChats('', 'Organization', true).every((c) => !c.unread && !c.last.includes('تمرین')),
    ).toBe(true);
    for (const state of ['loading', 'empty', 'error'] as const)
      expect(canCompose(personal, state)).toBe(false);
  });
});
