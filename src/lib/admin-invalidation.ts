export type AdminChanges = {
  events: { eventId: string; streamVersion: string; key: string }[];
  nextCursor: string;
  hasMore: boolean;
  epoch: string;
  contextRevision: string;
  retryAfterMilliseconds: number | null;
};
export function invalidationState() {
  return { ids: new Set<string>(), versions: new Set<string>(), epoch: '', context: '' };
}
export function consumeInvalidations(
  page: AdminChanges,
  state: ReturnType<typeof invalidationState>,
) {
  const resync =
    !!state.epoch && (state.epoch !== page.epoch || state.context !== page.contextRevision);
  if (resync) {
    state.ids.clear();
    state.versions.clear();
  }
  state.epoch = page.epoch;
  state.context = page.contextRevision;
  let access = false,
    personal = false;
  for (const event of page.events) {
    if (state.ids.has(event.eventId) || state.versions.has(event.streamVersion)) continue;
    state.ids.add(event.eventId);
    state.versions.add(event.streamVersion);
    if (event.key.toLowerCase() === 'access') access = true;
    else personal = true;
  }
  while (state.ids.size > 512) state.ids.delete(state.ids.values().next().value!);
  while (state.versions.size > 512) state.versions.delete(state.versions.values().next().value!);
  return { access, personal, resync };
}
