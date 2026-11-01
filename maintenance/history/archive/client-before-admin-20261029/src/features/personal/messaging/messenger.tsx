'use client';
import { ProfileAvatar } from '../profile-photo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import * as Menu from '@radix-ui/react-dropdown-menu';
import {
  ArrowRight,
  ArrowUpLeft,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Info,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Settings,
  Building2,
  Users,
  X,
} from 'lucide-react';
import { usePersonal, usePersonalApi } from '../provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import { contextSignature } from '@/lib/client-surface';
import { number, date } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';
import { personalMessageQueue, type QueuedMessage } from './outbox';
import {
  canWriteConversation,
  canAttachConversation,
  mediaRestricted,
  conversationRoleLabels,
  conversationTitle,
  visibleReply,
} from './model';
import s from './messenger.module.css';
import { useMessagingLive } from './live';
import { AttachmentPicker, AttachmentSummary, MessageAttachment } from './media';
import {
  attachmentMessageKind,
  attachmentMetadata,
  type Attachment,
  type FileAsset,
} from './media-model';
type Summary = components['schemas']['ConversationSummaryResult'];
type Message = components['schemas']['ConversationMessageResult'];
const filterLabels = {
  All: 'همه',
  Direct: 'مستقیم',
  Group: 'گروه‌ها',
  Channel: 'کانال‌ها',
  Unread: 'خوانده‌نشده',
  Archived: 'آرشیو',
  Saved: 'ذخیره‌شده',
} as const;
function shortTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('fa-IR', {
        timeZone: 'Asia/Tehran',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '';
}
export function Messenger({ conversationId }: { conversationId?: string }) {
  const live = useMessagingLive();
  const { session } = usePersonal(),
    cache = useQueryClient(),
    router = useRouter(),
    pathname = usePathname(),
    search = useSearchParams();
  const requested = search.get('filter') ?? 'All';
  const filter = requested in filterLabels ? (requested as keyof typeof filterLabels) : 'All';
  const requestedPage = Number(search.get('page'));
  const q = search.get('q') ?? '',
    page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageSize = 30;
  const [draft, setDraft] = useState(q),
    [hidden, setHidden] = useState<Set<string>>(() => new Set());
  useEffect(() => setDraft(q), [q]);
  const params = new URLSearchParams({ filter, page: String(page), pageSize: String(pageSize) });
  if (q) params.set('q', q);
  const inbox = usePersonalApi<Summary[]>('/api/v1/conversations?' + params, { poll: 5000 });
  const unavailable = useCallback(
    (id: string) => {
      setHidden((previous) => (previous.has(id) ? previous : new Set([...previous, id])));
      cache.setQueriesData<Summary[]>(
        {
          queryKey: ['personal', session.user.id, session.revision],
          predicate: (query) =>
            query.queryKey.some(
              (key) => typeof key === 'string' && key.startsWith('/api/v1/conversations?'),
            ),
        },
        (previous) => previous?.filter((row) => row.conversationId !== id),
      );
    },
    [cache, session.user.id, session.revision],
  );
  const available = useCallback(
    (id: string) =>
      setHidden((previous) => {
        if (!previous.has(id)) return previous;
        const next = new Set(previous);
        next.delete(id);
        return next;
      }),
    [],
  );
  function update(nextFilter: typeof filter, nextQuery = q, nextPage = 1) {
    const next = new URLSearchParams({ filter: nextFilter, page: String(nextPage) });
    if (nextQuery) next.set('q', nextQuery);
    router.push(pathname + '?' + next, { scroll: false });
  }
  const rows = inbox.data?.filter((row) => !hidden.has(row.conversationId));
  const selected = inbox.data?.find((row) => row.conversationId === conversationId);
  return (
    <div className={`${s.messenger} ${conversationId ? s.activeChat : ''}`}>
      <section className={s.sidebar} aria-label="فهرست گفتگوها">
        <header className={s.sidebarHead}>
          <div>
            <h1>پیام‌ها</h1>
            <small className={s.inboxContext}>
              {session.context.workspaceType === 'Personal'
                ? 'فضای شخصی'
                : 'فضای آموزشگاه انتخاب‌شده'}
            </small>
          </div>
          <Button asChild size="icon" variant="ghost">
            <Link href="/personal/contacts" aria-label="مخاطبین و گفت‌وگوی جدید">
              <Users size={21} />
            </Link>
          </Button>
        </header>
        <form
          className={s.search}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            update(filter, draft.trim());
          }}
        >
          <Search size={18} />
          <input
            aria-label="جستجوی گفتگوها"
            placeholder="جستجو در گفتگوها…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" aria-label="انجام جستجوی گفتگو">
            <ChevronLeft size={19} />
          </button>
        </form>
        <label className={s.filter}>
          نمایش
          <select
            aria-label="نوع گفتگوها"
            value={filter}
            onChange={(event) => update(event.target.value as typeof filter)}
          >
            {Object.entries(filterLabels).map(([value, title]) => (
              <option key={value} value={value}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <div className={s.list}>
          {inbox.isPending ? (
            <LoadingSkeleton />
          ) : inbox.isError ? (
            <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} />
          ) : !rows?.length ? (
            <EmptyState
              title={q ? 'گفت‌وگویی پیدا نشد' : 'این فهرست گفت‌وگویی ندارد'}
              description={
                q
                  ? 'عبارت جستجو یا نوع گفتگو را تغییر دهید.'
                  : session.context.workspaceType === 'Organization'
                    ? 'برای بررسی گفتگوهای شخصی، فضای شخصی را از بالای صفحه انتخاب کنید.'
                    : 'از دکمهٔ پایین برای شروع ارتباط استفاده کنید.'
              }
            />
          ) : (
            rows.map((row) => (
              <Link
                key={row.conversationId}
                href={'/personal/messages/' + row.conversationId + '?' + params}
                className={`${s.chatItem} ${row.conversationId === conversationId ? s.selected : ''}`}
                aria-current={row.conversationId === conversationId ? 'page' : undefined}
              >
                <ProfileAvatar
                  photo={row.type === 'Direct' ? row.otherParticipant?.profilePhoto : undefined}
                  name={conversationTitle(row)}
                  className={`${s.avatar} ${row.scope === 'Organization' ? s.organizationAvatar : ''}`}
                />
                <span className={s.chatSummary}>
                  <span className={s.row}>
                    <strong>{conversationTitle(row)}</strong>
                    <time>{shortTime(row.lastMessageAtUtc)}</time>
                  </span>
                  {row.scope === 'Organization' && (
                    <small className={s.orgLabel}>
                      <Building2 size={12} />
                      {row.organization?.organizationName ?? 'فضای آموزشگاه'}
                    </small>
                  )}
                  <span className={s.row}>
                    <span className={s.preview}>
                      {row.lastMessagePreview ?? 'هنوز پیامی ثبت نشده'}
                    </span>
                    {row.unreadCount > 0 && <b className={s.unread}>{number(row.unreadCount)}</b>}
                  </span>
                </span>
              </Link>
            ))
          )}
          <div className={s.paging}>
            <Button
              size="icon"
              variant="ghost"
              aria-label="صفحهٔ قبلی گفتگوها"
              disabled={page <= 1 || inbox.isFetching}
              onClick={() => update(filter, q, page - 1)}
            >
              <ChevronRight size={18} />
            </Button>
            <span>صفحهٔ {number(page)}</span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="صفحهٔ بعدی گفتگوها"
              disabled={!inbox.data || inbox.data.length < pageSize || inbox.isFetching}
              onClick={() => update(filter, q, page + 1)}
            >
              <ChevronLeft size={18} />
            </Button>
          </div>
        </div>
        <footer className={s.sidebarFoot}>
          <Link href="/personal/settings">
            <Settings size={14} />
            تنظیمات
          </Link>
          <span>
            {inbox.isError
              ? 'دریافت اطلاعات انجام نشد'
              : inbox.isFetching
                ? 'در حال تازه‌سازی…'
                : live.state === 'live'
                  ? 'ارتباط زنده برقرار است'
                  : live.state === 'connecting'
                    ? 'در حال برقراری ارتباط زنده…'
                    : 'به‌روزرسانی دوره‌ای فعال'}
          </span>
        </footer>
        <Menu.Root dir="rtl">
          <Menu.Trigger asChild>
            <button className={s.floating} aria-label="ایجاد گفت‌وگو یا مخاطب">
              <Plus size={25} />
            </button>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content className="dropdown" side="top" align="start" sideOffset={8}>
              <Menu.Item asChild>
                <Link href="/personal/messages/new?kind=groups">
                  <Users size={17} />
                  ایجاد گروه
                </Link>
              </Menu.Item>
              <Menu.Item asChild>
                <Link href="/personal/messages/new?kind=channels">
                  <MessageCircle size={17} />
                  ایجاد کانال
                </Link>
              </Menu.Item>
              <Menu.Item asChild>
                <Link href="/personal/contacts">
                  <Plus size={17} />
                  مخاطب جدید و دفترچه
                </Link>
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </section>
      {conversationId ? (
        <ConversationRoom
          key={conversationId}
          id={conversationId}
          summary={selected}
          onUnavailable={unavailable}
          onAvailable={available}
        />
      ) : (
        <div className={s.emptyRoom}>
          <span>
            <MessageCircle size={40} />
          </span>
          <h2>گفت‌وگو از همین‌جا شروع می‌شود</h2>
          <p>یک گفتگو را باز کنید یا از دفترچهٔ مخاطبین، ارتباط تازه‌ای بسازید.</p>
          <Button asChild>
            <Link href="/personal/contacts">مشاهدهٔ مخاطبین</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
function ConversationRoom({
  id,
  summary,
  onUnavailable,
  onAvailable,
}: {
  id: string;
  summary: Summary | undefined;
  onUnavailable: (id: string) => void;
  onAvailable: (id: string) => void;
}) {
  const { session, call } = usePersonal(),
    cache = useQueryClient();
  const metadata = usePersonalApi<components['schemas']['ManagedConversationResult']>(
    '/api/v1/conversations/' + id,
    { poll: 5000 },
  );
  const membership = metadata.data?.participants.find(
    (member) => member.user.userId === session.user.id,
  );
  const forbidden =
    (metadata.error instanceof ApiError && [403, 404].includes(metadata.error.status)) ||
    (metadata.data?.scope === 'Organization' && membership?.status !== 'Active');
  const enabled = metadata.isSuccess && !forbidden;
  const { subscribe } = useMessagingLive();
  useEffect(() => {
    if (enabled) return subscribe(id);
  }, [enabled, id, subscribe]);
  const history = useInfiniteQuery({
    queryKey: ['personal', session.user.id, session.revision, 'messages', id],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam, signal }) =>
      call<components['schemas']['ConversationMessagePageResult']>(
        '/api/v1/conversations/' +
          id +
          '/messages?' +
          new URLSearchParams({
            limit: '30',
            ...(pageParam === null ? {} : { beforeSequence: String(pageParam) }),
          }),
        { signal },
      ),
    getNextPageParam: (last) => last.nextBeforeSequence ?? undefined,
    enabled,
    refetchInterval: 5000,
    retry: false,
  });
  const reads = usePersonalApi<components['schemas']['ConversationPeerReadStateResult']>(
    '/api/v1/conversations/' + id + '/read-states',
    { enabled: enabled && metadata.data?.type === 'Direct', poll: 5000 },
  );
  const messages = useMemo(() => {
    const records = new Map<string, Message>();
    for (const page of history.data?.pages ?? [])
      for (const message of page.messages) records.set(message.messageId, message);
    return [...records.values()].sort((a, b) => a.sequence - b.sequence);
  }, [history.data]);
  const [draft, setDraft] = useState(''),
    [reply, setReply] = useState<Message | null>(null),
    [pending, setPending] = useState<QueuedMessage[]>([]),
    [sending, setSending] = useState<string | null>(null),
    [error, setError] = useState<unknown>(),
    [readError, setReadError] = useState<unknown>(),
    [atBottom, setAtBottom] = useState(false),
    [acknowledged, setAcknowledged] = useState<
      {
        receipt: components['schemas']['MessageReceiptResult'];
        text: string;
        attachments?: Attachment[];
      }[]
    >([]),
    [now, setNow] = useState(Date.now());
  const bottom = useRef<HTMLDivElement>(null),
    composer = useRef<HTMLTextAreaElement>(null),
    scroller = useRef<HTMLDivElement>(null),
    nearBottom = useRef(true),
    initial = useRef(true),
    lastReadAttempt = useRef(0),
    currentRef = useRef(true),
    operationInFlight = useRef(false);
  const currentReply = reply
    ? messages.find((message) => message.messageId === reply.messageId)
    : null;
  useEffect(() => {
    const node = composer.current;
    if (node) {
      node.style.height = '44px';
      node.style.height = Math.min(120, node.scrollHeight) + 'px';
    }
  }, [draft]);
  const scopeKey =
    metadata.data?.scope === 'Personal' ? 'Personal' : contextSignature(session.context);
  const owner = { userId: session.user.id, conversationId: id, scopeKey };
  const matchingOrganization =
    !metadata.data ||
    metadata.data.scope === 'Personal' ||
    (session.context.workspaceType === 'Organization' &&
      session.context.organizationId === metadata.data.organizationId);
  const writable =
    !!metadata.data && matchingOrganization && canWriteConversation(metadata.data, session.user.id);
  const needsRestriction = metadata.data?.type === 'Group' || metadata.data?.type === 'Channel';
  const restriction = usePersonalApi<components['schemas']['MemberRestrictionResult']>(
    '/api/v1/conversations/' + id + '/me/restriction',
    { enabled: enabled && needsRestriction, poll: 5000 },
  );
  const canMedia =
    !!metadata.data &&
    matchingOrganization &&
    canAttachConversation(metadata.data, session.user.id) &&
    (!needsRestriction ||
      (restriction.isSuccess &&
        restriction.data.conversationId === id &&
        restriction.data.userId === session.user.id &&
        !mediaRestricted(restriction.data)));
  const messageDenied =
    history.error instanceof ApiError && [403, 404].includes(history.error.status);
  useEffect(() => {
    currentRef.current = true;
    return () => {
      currentRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (forbidden || messageDenied) onUnavailable(id);
    else if (metadata.isSuccess && history.isSuccess) onAvailable(id);
  }, [
    forbidden,
    messageDenied,
    metadata.isSuccess,
    history.isSuccess,
    id,
    onUnavailable,
    onAvailable,
  ]);
  const loadPending = useCallback(async () => {
    const rows = await personalMessageQueue.list(session.user.id, id, scopeKey);
    if (currentRef.current) setPending(rows);
  }, [session.user.id, id, scopeKey]);
  useEffect(() => {
    if (enabled) void loadPending().catch(setError);
  }, [loadPending, enabled]);
  useEffect(() => {
    if (!pending.some((message) => message.retryAt && message.retryAt > now)) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending, now]);
  useEffect(() => {
    if (!enabled || !history.isSuccess) return;
    let alive = true;
    void (async () => {
      const own = messages.filter((message) => message.senderUserId === session.user.id);
      const queued = await personalMessageQueue.list(session.user.id, id, scopeKey);
      for (const message of queued)
        if (own.some((server) => server.clientMessageId === message.id))
          await personalMessageQueue.remove(message.id);
      if (alive) {
        await loadPending();
        setAcknowledged((previous) =>
          previous.filter(
            (item) =>
              !own.some((server) => server.clientMessageId === item.receipt.clientMessageId),
          ),
        );
      }
    })().catch((error) => {
      if (alive) setError(error);
    });
    return () => {
      alive = false;
    };
  }, [messages, session.user.id, id, scopeKey, enabled, history.isSuccess, loadPending]);
  useEffect(() => {
    if (initial.current || nearBottom.current) {
      bottom.current?.scrollIntoView({ block: 'nearest' });
      setAtBottom(true);
      initial.current = false;
    }
  }, [messages.length, pending.length, acknowledged.length]);
  async function refresh() {
    await Promise.all([
      history.refetch(),
      metadata.refetch(),
      cache.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some(
            (key) => typeof key === 'string' && key.startsWith('/api/v1/conversations?'),
          ),
      }),
    ]);
  }
  async function markRead(sequence: number) {
    lastReadAttempt.current = sequence;
    try {
      await call('/api/v1/conversations/' + id + '/read', {
        method: 'POST',
        body: JSON.stringify({
          upToMessageSequence: sequence,
        } satisfies components['schemas']['AdvanceConversationCursorCommand']),
      });
      if (currentRef.current) setReadError(undefined);
      await cache.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some(
            (key) => typeof key === 'string' && key.startsWith('/api/v1/conversations?'),
          ),
      });
    } catch (error) {
      if (currentRef.current) setReadError(error);
    }
  }
  const maxSequence = messages.at(-1)?.sequence ?? 0;
  useEffect(() => {
    if (
      enabled &&
      history.isSuccess &&
      !history.isError &&
      atBottom &&
      document.visibilityState === 'visible' &&
      maxSequence > lastReadAttempt.current
    )
      void markRead(maxSequence);
  }, [maxSequence, enabled, history.isSuccess, history.isError, atBottom]);
  async function transmit(message: QueuedMessage, claimed = false) {
    if (!currentRef.current || (!claimed && operationInFlight.current) || !writable || !enabled)
      return;
    operationInFlight.current = true;
    setSending(message.id);
    setError(undefined);
    try {
      const receipt = await personalMessageQueue.send(message, owner, (command) =>
        call('/api/v1/conversations/' + id + '/messages', {
          method: 'POST',
          body: JSON.stringify(command),
        }),
      );
      if (currentRef.current)
        setAcknowledged((previous) => [
          ...previous.filter((item) => item.receipt.clientMessageId !== receipt.clientMessageId),
          { receipt, text: message.command.text ?? '', attachments: message.attachments },
        ]);
      await refresh();
    } catch (error) {
      if (currentRef.current) setError(error);
    } finally {
      if (currentRef.current) {
        await loadPending().catch(setError);
      }
      operationInFlight.current = false;
      if (currentRef.current) setSending(null);
    }
  }
  async function send(assets: FileAsset[] = [], caption?: string): Promise<boolean> {
    const text = (caption ?? draft).trim();
    if (
      (!text && !assets.length) ||
      operationInFlight.current ||
      !writable ||
      !enabled ||
      (assets.length > 0 && !canMedia)
    )
      return false;
    operationInFlight.current = true;
    const clientMessageId = crypto.randomUUID();
    setSending(clientMessageId);
    const message: QueuedMessage = {
      id: clientMessageId,
      ...owner,
      command: {
        clientMessageId,
        kind: assets.length ? attachmentMessageKind(assets) : 'Text',
        text: text || null,
        attachmentIds: assets.length ? assets.map((asset) => asset.id) : null,
        replyToMessageId: reply?.messageId ?? null,
      },
      createdAt: new Date().toISOString(),
      state: 'sending',
      attachments: assets.length ? assets.map(attachmentMetadata) : undefined,
    };
    try {
      await personalMessageQueue.put(message);
      if (!currentRef.current) {
        operationInFlight.current = false;
        return false;
      }
      setDraft('');
      setReply(null);
      await loadPending();
      await transmit(message, true);
      return true;
    } catch (error) {
      operationInFlight.current = false;
      if (currentRef.current) setError(error);
      if (currentRef.current) setSending(null);
      return false;
    }
  }
  const name = summary ? conversationTitle(summary) : metadata.data?.title || 'گفت‌وگو';
  const peerRead =
    reads.data?.conversationId === id && reads.data.visibility === 'Visible'
      ? reads.data.peerReadThroughSequence
      : null;
  if (metadata.isPending)
    return (
      <div className={s.roomState}>
        <Button asChild variant="ghost">
          <Link href="/personal/messages">
            <ArrowRight size={18} />
            بازگشت به پیام‌ها
          </Link>
        </Button>
        <LoadingSkeleton />
      </div>
    );
  if (metadata.isError || forbidden || messageDenied)
    return (
      <div className={s.roomState}>
        <Button asChild variant="ghost">
          <Link href="/personal/messages">
            <ArrowRight size={18} />
            بازگشت به پیام‌ها
          </Link>
        </Button>
        <ErrorState
          error={metadata.error ?? history.error ?? new ApiError(403)}
          onRetry={() => void refresh()}
        />
      </div>
    );
  const conversation = metadata.data;
  return (
    <>
      <section className={s.room} data-message-room aria-label={'گفتگو با ' + name}>
        <header className={s.roomHeader}>
          <Button asChild className={s.back} size="icon" variant="ghost">
            <Link href="/personal/messages" aria-label="بازگشت به فهرست گفتگوها">
              <ArrowRight size={21} />
            </Link>
          </Button>
          <ProfileAvatar
            photo={
              conversation.type === 'Direct'
                ? conversation.participants.find((p) => p.user.userId !== session.user.id)?.user
                    .profilePhoto
                : conversation.type === 'Saved'
                  ? session.user.profilePhoto
                  : undefined
            }
            name={name}
            className={s.avatar}
          />
          <div className={s.identity}>
            <h2>{name}</h2>
            <p>
              {conversation.type === 'Direct'
                ? 'گفت‌وگوی مستقیم'
                : conversation.type === 'Saved'
                  ? 'یادداشت‌های شخصی'
                  : conversation.type === 'Channel'
                    ? 'کانال'
                    : 'گروه'}{' '}
              · {conversation.scope === 'Personal' ? 'شخصی' : 'آموزشگاه'}
            </p>
          </div>
          <ConversationInfo conversation={conversation} />
        </header>
        <div className={s.scope}>
          <Building2 size={14} />
          {conversation.scope === 'Personal'
            ? 'فضای شخصی · مستقل از عضویت آموزشگاهی'
            : (summary?.organization?.organizationName ?? 'فضای آموزشگاه')}
        </div>
        <div
          className={s.history}
          ref={scroller}
          onScroll={() => {
            const node = scroller.current;
            if (node) {
              nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
              setAtBottom(node.scrollHeight - node.scrollTop - node.clientHeight < 24);
            }
          }}
          aria-label="پیام‌های گفتگو"
          tabIndex={0}
        >
          {history.isPending ? (
            <LoadingSkeleton />
          ) : history.isError ? (
            <ErrorState error={history.error} onRetry={() => void history.refetch()} />
          ) : (
            <>
              {history.hasNextPage && (
                <Button
                  className={s.older}
                  variant="outline"
                  disabled={history.isFetchingNextPage}
                  onClick={() => void history.fetchNextPage()}
                >
                  {history.isFetchingNextPage ? 'در حال دریافت…' : 'پیام‌های قدیمی‌تر'}
                </Button>
              )}
              {!messages.length && !acknowledged.length && !pending.length && (
                <EmptyState
                  title="هنوز پیامی ثبت نشده است"
                  description="اگر ارسال با حساب فعلی مجاز باشد، گفتگو را از پایین صفحه شروع کنید."
                />
              )}
              {messages.map((message) => {
                const own = message.senderUserId === session.user.id;
                return (
                  <article key={message.messageId} className={`${s.bubble} ${own ? s.own : ''}`}>
                    {conversation.type === 'Group' && !own && (
                      <span className={s.messageSender}>{message.sender.displayName}</span>
                    )}
                    {message.reply && <blockquote>{visibleReply(message.reply)}</blockquote>}
                    {(message.isDeleted || message.text || !message.attachments.length) && (
                      <p dir="auto">
                        {message.isDeleted
                          ? 'این پیام حذف شده است'
                          : (message.text ??
                            (message.attachments.length
                              ? 'پیوست فایل'
                              : message.kind === 'Poll'
                                ? 'نظرسنجی'
                                : message.kind === 'Checklist'
                                  ? 'فهرست کارها'
                                  : 'پیام'))}
                      </p>
                    )}
                    {!message.isDeleted && message.attachments.length > 0 && (
                      <div
                        className={s.attachments}
                        data-gallery={
                          message.attachments.length > 1 &&
                          message.attachments.every((asset) =>
                            asset.contentType.startsWith('image/'),
                          )
                            ? true
                            : undefined
                        }
                      >
                        {message.attachments.map((asset) => (
                          <MessageAttachment
                            key={asset.fileAssetId}
                            asset={asset}
                            conversationId={id}
                          />
                        ))}
                      </div>
                    )}
                    <div className={s.messageMeta}>
                      <time title={date(message.sentAtUtc, true)}>
                        {shortTime(message.sentAtUtc)}
                        {message.isEdited ? ' · ویرایش‌شده' : ''}
                      </time>
                      {own &&
                        (peerRead !== null &&
                        peerRead !== undefined &&
                        peerRead >= message.sequence ? (
                          <CheckCheck
                            className={s.readTick}
                            size={16}
                            aria-label="خوانده‌شدن مطابق وضعیت مجاز سرور"
                          />
                        ) : (
                          <Check size={15} aria-label="ارسال در سرور ثبت شده" />
                        ))}
                      {!message.isDeleted && writable && (
                        <button
                          aria-label={'پاسخ به پیام ' + message.sequence}
                          onClick={() => setReply(message)}
                        >
                          <ArrowUpLeft size={17} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {acknowledged.map((item) => (
                <article key={item.receipt.clientMessageId} className={`${s.bubble} ${s.own}`}>
                  <p dir="auto">{item.text}</p>
                  <AttachmentSummary attachments={item.attachments} />
                  <small className={s.localStatus}>
                    <Check size={14} />
                    در سرور ثبت شد · در حال دریافت سابقه
                  </small>
                </article>
              ))}
              {pending.map((message) => (
                <article key={message.id} className={`${s.bubble} ${s.own} ${s.pending}`}>
                  <p dir="auto">{message.command.text}</p>
                  <AttachmentSummary attachments={message.attachments} />
                  <small className={s.localStatus}>
                    {sending === message.id
                      ? 'در حال ارسال…'
                      : (message.error ?? 'نتیجهٔ ارسال هنوز تأیید نشده است.')}
                  </small>
                  {sending !== message.id && (
                    <div className={s.pendingActions}>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          !!sending || !writable || (!!message.retryAt && message.retryAt > now)
                        }
                        onClick={() => void transmit(message)}
                      >
                        تلاش دوباره با همین پیام
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void refresh()}>
                        بررسی سابقه
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            حذف از این دستگاه
                          </Button>
                        </DialogTrigger>
                        <DialogContent
                          title="حذف پیام تأییدنشده از این دستگاه"
                          description="این کار فقط نسخهٔ در انتظار را پاک می‌کند. اگر سرور پیام را قبلاً دریافت کرده باشد، پیام ارسال‌شده حذف نمی‌شود."
                        >
                          <Button
                            variant="destructive"
                            onClick={() =>
                              void personalMessageQueue
                                .remove(message.id)
                                .then(loadPending)
                                .catch(setError)
                            }
                          >
                            حذف نسخهٔ محلی
                          </Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </article>
              ))}
              <div ref={bottom} />
            </>
          )}
        </div>
        <div className={s.composerArea}>
          {writable && needsRestriction && restriction.isError && (
            <div className={s.mediaPermissionError} role="status">
              بررسی دسترسی ارسال پیوست انجام نشد.
              <button onClick={() => void restriction.refetch()}>بررسی دوباره</button>
            </div>
          )}
          {!!error && (
            <div className={s.sendError} role="alert">
              {error instanceof Error ? error.message : 'عملیات انجام نشد.'}
            </div>
          )}
          {!!readError && (
            <button className={s.readRetry} onClick={() => void markRead(lastReadAttempt.current)}>
              خواندن هنوز تأیید نشده؛ تلاش دوباره
            </button>
          )}
          {reply && (
            <div className={s.reply}>
              <ArrowUpLeft size={18} />
              <span>
                <strong>
                  {currentReply ? 'پاسخ به ' + currentReply.sender.displayName : 'پاسخ به پیام'}
                </strong>
                <small>
                  {!currentReply
                    ? 'پیام در دسترس نیست'
                    : currentReply.isDeleted
                      ? 'پیام حذف شده'
                      : currentReply.text || 'پیوست'}
                </small>
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="لغو پاسخ"
                onClick={() => setReply(null)}
              >
                <X size={17} />
              </Button>
            </div>
          )}
          {writable && !history.isError ? (
            <form
              className={s.composer}
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <AttachmentPicker
                conversationId={id}
                disabled={!canMedia || !!sending}
                caption={draft}
                onSend={send}
              />
              <textarea
                ref={composer}
                aria-label="متن پیام"
                placeholder="پیامی بنویسید…"
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="submit"
                className={s.send}
                disabled={!!sending || !draft.trim()}
                aria-label="ارسال پیام"
              >
                <Send size={21} />
              </button>
            </form>
          ) : (
            <p className={s.readOnly}>ارسال با وضعیت فعلی این گفتگو در دسترس نیست.</p>
          )}
        </div>
      </section>
      <aside className={s.inspector}>
        <span className={s.largeAvatar}>{name.slice(0, 1)}</span>
        <h2>{name}</h2>
        <p>{conversation.scope === 'Personal' ? 'فضای شخصی' : 'فضای آموزشگاه'}</p>
        <dl>
          <div>
            <dt>وضعیت گفتگو</dt>
            <dd>{conversation.status === 'Active' ? 'فعال' : 'آرشیوشده'}</dd>
          </div>
          <div>
            <dt>عضویت‌های فعال</dt>
            <dd>
              {number(conversation.participants.filter((item) => item.status === 'Active').length)}
            </dd>
          </div>
          <div>
            <dt>نقش شما در گفتگو</dt>
            <dd>{membership ? conversationRoleLabels[membership.role] : 'ثبت نشده'}</dd>
          </div>
        </dl>
        <Link href="/personal/settings">
          <Settings size={16} />
          تنظیمات
        </Link>
      </aside>
    </>
  );
}
function ConversationInfo({
  conversation,
}: {
  conversation: components['schemas']['ManagedConversationResult'];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="اطلاعات گفتگو">
          <Info size={21} />
        </Button>
      </DialogTrigger>
      <DialogContent title="اطلاعات گفتگو" description={conversation.title}>
        <p>{conversation.description || 'توضیحی ثبت نشده است.'}</p>
        <p className={s.infoNote}>
          {conversation.scope === 'Personal'
            ? 'این گفتگو شخصی است.'
            : 'این گفتگو به آموزشگاه تعلق دارد؛ خروج سازنده مالکیت آن را شخصی نمی‌کند.'}
        </p>
        <h3>اعضای فعال</h3>
        <ul className={s.memberList}>
          {conversation.participants
            .filter((member) => member.status === 'Active')
            .map((member) => (
              <li key={member.participantId}>
                <span>
                  {member.user.displayName}
                  <small>
                    <bdi dir="ltr">@{member.user.username}</bdi>
                  </small>
                </span>
                <span>{conversationRoleLabels[member.role]}</span>
              </li>
            ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
