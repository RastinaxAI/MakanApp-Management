'use client';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowRight,
  ArrowUpLeft,
  BookOpen,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  Ellipsis,
  FileText,
  LayoutDashboard,
  Layers,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { BrandMark } from '@/components/ui/brand';
import {
  canCompose,
  chats,
  directionInfo,
  directions,
  filterChats,
  filterPlans,
  formatUnknownAmount,
  initialMessages,
  initialPlans,
  type Direction,
  type PreviewChat,
  type PreviewMessage,
  type PreviewPlan,
  type Scenario,
  type Screen,
} from './model';
import s from './review.module.css';

const scenarios: { id: Scenario; label: string }[] = [
  { id: 'ready', label: 'عادی' },
  { id: 'loading', label: 'بارگذاری' },
  { id: 'empty', label: 'خالی' },
  { id: 'error', label: 'خطا' },
  { id: 'revoked', label: 'پایان دسترسی' },
];
const number = (n: number) => new Intl.NumberFormat('fa-IR').format(n);
function IconButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={s.iconButton}
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content
          dir="rtl"
          className={s.dialog}
          onOpenAutoFocus={() => {
            returnFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <div className={s.dialogHead}>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className={s.iconButton} aria-label="بستن">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className={s.dialogDescription}>{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function State({
  scenario,
  onRetry,
  emptyText,
}: {
  scenario: Scenario;
  onRetry: () => void;
  emptyText: string;
}) {
  if (scenario === 'loading')
    return (
      <div className={s.skeleton} role="status" aria-label="در حال بارگذاری نمونه">
        <i />
        <i />
        <i />
        <i />
        <span>در حال آماده‌سازی نمای نمونه…</span>
      </div>
    );
  return (
    <div className={s.state} role={scenario === 'error' ? 'alert' : 'status'}>
      <div className={s.stateIcon}>{scenario === 'revoked' ? <ShieldCheck /> : <Search />}</div>
      <h2>
        {scenario === 'error'
          ? 'دریافت اطلاعات انجام نشد'
          : scenario === 'revoked'
            ? 'دسترسی این بخش پایان یافته است'
            : emptyText}
      </h2>
      <p>
        {scenario === 'error'
          ? 'دادهٔ قبلی به‌عنوان اطلاعات تازه نمایش داده نمی‌شود. دوباره تلاش کنید.'
          : scenario === 'revoked'
            ? 'فضای شخصی شما محفوظ است. برای پیگیری دسترسی رسمی با مدیر آموزشگاه تماس بگیرید.'
            : 'جستجو یا فیلتر را تغییر دهید، یا اولین مورد را اضافه کنید.'}
      </p>
      <button className={s.secondary} onClick={onRetry}>
        {scenario === 'error'
          ? 'تلاش دوباره'
          : scenario === 'revoked'
            ? 'بازگشت به نمونهٔ عادی'
            : 'پاک‌کردن فیلترها'}
      </button>
    </div>
  );
}
export function Review({ direction, screen }: { direction: Direction; screen: Screen }) {
  const [scenario, setScenario] = useState<Scenario>('ready');
  const [notice, setNotice] = useState('');
  const info = directionInfo[direction];
  return (
    <div className={`${s.review} ${s[direction]}`} dir="rtl">
      <div className={s.reviewBar}>
        <Link href="/design-review" className={s.reviewBack}>
          <ArrowRight size={16} /> مقایسهٔ طرح‌ها
        </Link>
        <strong>پیش‌نمایش طراحی · دادهٔ ساختگی · بدون اتصال API</strong>
        <div className={s.reviewSwitch}>
          {directions.map((d) => (
            <Link
              key={d}
              href={`/design-review/${d}/${screen}`}
              aria-current={d === direction ? 'page' : undefined}
            >
              {directionInfo[d].name}
            </Link>
          ))}
        </div>
      </div>
      <div className={s.testBar}>
        <span>
          طرح {info.number} · {info.name}
        </span>
        <div className={s.screenSwitch}>
          <Link
            href={`/design-review/${direction}/plans`}
            aria-current={screen === 'plans' ? 'page' : undefined}
          >
            مدیریت پلن‌ها
          </Link>
          <Link
            href={`/design-review/${direction}/messenger`}
            aria-current={screen === 'messenger' ? 'page' : undefined}
          >
            پیام‌رسان
          </Link>
        </div>
        <label>
          وضعیت نمونه{' '}
          <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
            {scenarios.map((state) => (
              <option key={state.id} value={state.id}>
                {state.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={s.appShell}>
        <aside className={s.navigation} aria-label="ناوبری نمونه">
          <Link className={s.brand} href="/design-review">
            <BrandMark />
            <strong>
              ماکان<span>فضای کار شما</span>
            </strong>
          </Link>
          <div className={s.navSection}>فضای کار</div>
          <nav>
            <button
              className={s.navItem}
              onClick={() =>
                setNotice('این تحویل، دو صفحهٔ پلن‌ها و پیام‌رسان را برای مقایسه پوشش می‌دهد.')
              }
            >
              <LayoutDashboard size={20} />
              <span>نمای کلی</span>
            </button>
            <Link
              className={`${s.navItem} ${screen === 'plans' ? s.navActive : ''}`}
              href={`/design-review/${direction}/plans`}
            >
              <Layers size={20} />
              <span>مدیریت پلن‌ها</span>
            </Link>
            <Link
              className={`${s.navItem} ${screen === 'messenger' ? s.navActive : ''}`}
              href={`/design-review/${direction}/messenger`}
            >
              <MessageCircle size={20} />
              <span>پیام‌رسان</span>
              <b>۷</b>
            </Link>
            <button
              className={s.navItem}
              onClick={() =>
                setNotice(
                  'منابع و یادگیری در نقشهٔ راه هستند؛ این صفحه در تحویل اول طراحی نشده است.',
                )
              }
            >
              <BookOpen size={20} />
              <span>منابع و یادگیری</span>
            </button>
          </nav>
          <div className={s.navFoot}>
            <div className={s.navHelp}>
              <ShieldCheck size={24} />
              <p>
                همه‌چیز در جای خودش<small>فضای شخصی مستقل از آموزشگاه</small>
              </p>
            </div>
            <button
              className={s.account}
              onClick={() =>
                setNotice('هویت و نقش این نمونه ساختگی است؛ نشست واقعی استفاده نمی‌شود.')
              }
            >
              <span className={s.avatar}>آم</span>
              <span>
                آرمان محمدی
                <small>{screen === 'plans' ? 'مالک پلتفرم · نمونه' : 'حساب شخصی · نمونه'}</small>
              </span>
              <Settings size={18} />
            </button>
          </div>
        </aside>
        <main className={s.workspace}>
          <header className={s.workspaceHeader}>
            <div className={s.breadcrumb}>
              فضای {screen === 'plans' ? 'مدیریت' : 'شخصی'} <ChevronLeft size={14} />{' '}
              <strong>{screen === 'plans' ? 'پلن‌ها و اشتراک' : 'پیام‌ها'}</strong>
            </div>
            <div className={s.contextPill}>
              {screen === 'plans' ? <ShieldCheck size={16} /> : <MessageCircle size={16} />}{' '}
              {screen === 'plans' ? 'پلتفرم ماکان' : 'فضای شخصی'} <ChevronDown size={14} />
            </div>
          </header>
          {screen === 'plans' ? (
            <Plans
              direction={direction}
              scenario={scenario}
              reset={() => setScenario('ready')}
              notify={setNotice}
            />
          ) : (
            <Messenger
              direction={direction}
              scenario={scenario}
              reset={() => setScenario('ready')}
              notify={setNotice}
            />
          )}
        </main>
      </div>
      <Modal
        open={!!notice}
        onOpenChange={(open) => {
          if (!open) setNotice('');
        }}
        title="دربارهٔ این نمونه"
        description="محیط بررسی طراحی؛ مستقل از اطلاعات و حساب واقعی"
      >
        <p>{notice}</p>
        <button className={s.primary} onClick={() => setNotice('')}>
          متوجه شدم
        </button>
      </Modal>
    </div>
  );
}

function Plans({
  direction,
  scenario,
  reset,
  notify,
}: {
  direction: Direction;
  scenario: Scenario;
  reset: () => void;
  notify: (message: string) => void;
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState('همه');
  const [selected, setSelected] = useState<PreviewPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [newAudience, setNewAudience] = useState<'فردی' | 'سازمانی'>('فردی');
  const [saved, setSaved] = useState('');
  const filtered = scenario === 'empty' ? [] : filterPlans(plans, query, audience);
  const clear = () => {
    setQuery('');
    setAudience('همه');
    reset();
  };
  const previewDetail = (plan: PreviewPlan) => (
    <>
      <div className={s.planDetailTitle}>
        <div className={s.planIcon}>
          <Layers size={24} />
        </div>
        <div>
          <span className={s.eyebrow}>تعریف پلن / {plan.audience}</span>
          <h2>{plan.name}</h2>
          <bdi className={s.code}>{plan.code}</bdi>
        </div>
      </div>
      <p className={s.description}>{plan.description}</p>
      <div className={s.detailGrid}>
        <div>
          <small>آخرین نسخه</small>
          <strong>نسخهٔ {plan.version}</strong>
        </div>
        <div>
          <small>وضعیت نسخه</small>
          <strong>{plan.versionState}</strong>
        </div>
        <div>
          <small>نمایش کاتالوگ</small>
          <strong>{plan.visibility}</strong>
        </div>
        <div>
          <small>عرضهٔ پلن</small>
          <strong>{plan.sale}</strong>
        </div>
        <div>
          <small>قیمت و دوره</small>
          <strong>{formatUnknownAmount(plan.price)}</strong>
        </div>
        <div>
          <small>حد و واحد سهمیه</small>
          <strong>{formatUnknownAmount(plan.quota)}</strong>
        </div>
      </div>
      <div className={s.infoBox}>
        <ShieldCheck size={20} />
        <p>
          نسخهٔ پلن با اشتراک خریداری‌شده تفاوت دارد. تغییر نمایش یا عرضه، اشتراک فعلی را خودکار لغو
          نمی‌کند.
        </p>
      </div>
      <div className={s.detailActions}>
        <button
          className={s.primary}
          onClick={() =>
            notify(
              'بررسی انتشار در نمونه: قیمت، دوره، سهمیه و قابلیت‌های مجاز باید تعیین شوند. هیچ نسخه‌ای در بک‌اند منتشر نشد.',
            )
          }
        >
          بررسی انتشار نسخه
        </button>
        <button
          className={s.secondary}
          onClick={() =>
            notify(
              'تغییر قیمت و سهمیه با نسخهٔ تازه انجام می‌شود. سیاست اثر بر اشتراک‌های جاری هنوز نیازمند تصمیم محصول است.',
            )
          }
        >
          نسخهٔ جدید
        </button>
      </div>
    </>
  );
  return (
    <div className={s.plansPage}>
      <div className={s.pageHeading}>
        <div>
          <span className={s.eyebrow}>کاتالوگ خدمات</span>
          <h1>پلن‌ها، روشن و قابل مدیریت</h1>
          <p>تعریف خدمات، نسخه‌ها و نحوهٔ عرضه را یک‌جا بررسی کنید.</p>
        </div>
        <button
          className={s.primary}
          disabled={scenario !== 'ready'}
          onClick={() => setCreating(true)}
        >
          <Plus size={18} /> ساخت پلن
        </button>
      </div>
      <div className={s.metrics}>
        <div>
          <span className={s.metricIcon}>
            <Layers size={20} />
          </span>
          <p>
            همهٔ پلن‌های نمونه
            <strong>
              {number(plans.length)} <small>پلن</small>
            </strong>
          </p>
        </div>
        <div>
          <span className={s.metricIcon}>
            <CheckCheck size={20} />
          </span>
          <p>
            نسخه‌های منتشرشده
            <strong>
              {number(plans.filter((p) => p.versionState === 'منتشرشده').length)}{' '}
              <small>نسخه</small>
            </strong>
          </p>
        </div>
        <div>
          <span className={s.metricIcon}>
            <FileText size={20} />
          </span>
          <p>
            در انتظار بررسی
            <strong>
              {number(plans.filter((p) => p.versionState === 'پیش‌نویس').length)}{' '}
              <small>پیش‌نویس</small>
            </strong>
          </p>
        </div>
      </div>
      <section className={s.catalog} aria-label="فهرست پلن‌ها">
        <div className={s.catalogHead}>
          <div>
            <h2>
              کاتالوگ پلن‌ها <span>{number(plans.length)}</span>
            </h2>
            <p>داده‌ها صرفاً برای بررسی چیدمان هستند.</p>
          </div>
          <div className={s.search}>
            <Search size={18} />
            <input
              aria-label="جستجوی پلن"
              placeholder="جستجوی نام یا کد پلن…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className={s.filterRow}>
          <div className={s.tabs} role="group" aria-label="نوع مخاطب پلن">
            {['همه', 'فردی', 'سازمانی'].map((a) => (
              <button key={a} aria-pressed={audience === a} onClick={() => setAudience(a)}>
                {a === 'همه' ? 'همهٔ پلن‌ها' : a}
              </button>
            ))}
          </div>
          <span className={s.fine}>
            <SlidersHorizontal size={15} /> {number(filtered.length)} نتیجه
          </span>
        </div>
        {scenario === 'loading' || scenario === 'error' || scenario === 'revoked' ? (
          <State scenario={scenario} onRetry={clear} emptyText="پلنی پیدا نشد" />
        ) : !filtered.length ? (
          <State scenario="empty" onRetry={clear} emptyText="پلنی با این مشخصات پیدا نشد" />
        ) : (
          <>
            {direction === 'atlas' ? (
              <div className={s.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>نام و شناسهٔ پلن</th>
                      <th>مخاطب</th>
                      <th>آخرین نسخه</th>
                      <th>نمایش / عرضه</th>
                      <th>قیمت</th>
                      <th>
                        <span className={s.srOnly}>جزئیات</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <button className={s.planName} onClick={() => setSelected(p)}>
                            <span className={s.planIcon}>
                              <Layers size={19} />
                            </span>
                            <span>
                              <strong>{p.name}</strong>
                              <bdi>{p.code}</bdi>
                            </span>
                          </button>
                        </td>
                        <td>{p.audience}</td>
                        <td>
                          <span className={p.versionState === 'منتشرشده' ? s.status : s.draft}>
                            {p.versionState}
                          </span>
                          <small className={s.subText}>نسخهٔ {p.version}</small>
                        </td>
                        <td>
                          {p.visibility}
                          <small className={s.subText}>{p.sale}</small>
                        </td>
                        <td className={s.fine}>{formatUnknownAmount(p.price)}</td>
                        <td>
                          <IconButton label={`جزئیات ${p.name}`} onClick={() => setSelected(p)}>
                            <ChevronLeft size={19} />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : direction === 'orbit' ? (
              <div className={s.planCards}>
                {filtered.map((p) => (
                  <article key={p.id} className={s.planCard}>
                    <div className={s.row}>
                      <span className={s.planIcon}>
                        <Layers size={23} />
                      </span>
                      <span className={p.versionState === 'منتشرشده' ? s.status : s.draft}>
                        {p.versionState}
                      </span>
                    </div>
                    <span className={s.eyebrow}>
                      {p.audience} · نسخهٔ {p.version}
                    </span>
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                    <div className={s.cardPrice}>
                      {formatUnknownAmount(p.price)}
                      <small>قیمت و دوره</small>
                    </div>
                    <div className={s.row}>
                      <span className={s.fine}>
                        {p.visibility} · {p.sale}
                      </span>
                      <button className={s.textButton} onClick={() => setSelected(p)}>
                        جزئیات <ArrowUpLeft size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={s.masterDetail}>
                <div className={s.planList}>
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      className={`${s.planListItem} ${(selected?.id ?? filtered[0].id) === p.id ? s.selectedPlan : ''}`}
                      onClick={() => setSelected(p)}
                    >
                      <span className={s.planIcon}>
                        <Layers size={20} />
                      </span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.audience} · نسخهٔ {p.version}
                        </small>
                      </span>
                      <ChevronLeft size={18} />
                    </button>
                  ))}
                </div>
                <div className={s.inlineDetail}>
                  {previewDetail(
                    selected && filtered.some((p) => p.id === selected.id) ? selected : filtered[0],
                  )}
                </div>
              </div>
            )}
            <div className={s.catalogFoot}>
              <span>همهٔ داده‌های نمونه نمایش داده شده‌اند.</span>
              <span>قیمت و سقف سهمیه نیازمند تصمیم محصول</span>
            </div>
          </>
        )}
      </section>
      <div className={s.savedNotice} role="status">
        {saved}
      </div>
      <div className={s.bottomNote}>
        <ShieldCheck size={18} />
        <span>شخصی و سازمانی مستقل‌اند؛ خرید پلن، نقش یا نشان رسمی ایجاد نمی‌کند.</span>
      </div>
      <Modal
        open={!!selected && direction !== 'sepehr'}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="جزئیات پلن"
        description="مدل نمایشی؛ فیلدهای عرضه و نمایش پیشنهاد توسعهٔ قراردادند."
      >
        {selected && previewDetail(selected)}
      </Modal>
      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="ساخت پیش‌نویس پلن"
        description="این فرم فقط دادهٔ محلی همین نمونه را تغییر می‌دهد. با بارگذاری مجدد پاک می‌شود."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            setPlans((previous) => [
              ...previous,
              {
                ...initialPlans[1],
                id: `local-${previous.length}`,
                name: name.trim(),
                code: 'LOCAL-DRAFT',
                audience: newAudience,
              },
            ]);
            setCreating(false);
            setName('');
            setSaved('پیش‌نویس به نمونه اضافه شد؛ هیچ درخواستی به سرور ارسال نشد.');
          }}
        >
          <label className={s.field}>
            نام پلن
            <input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام پیشنهادی پلن"
            />
          </label>
          <label className={s.field}>
            مخاطب
            <select
              value={newAudience}
              onChange={(e) => setNewAudience(e.target.value as 'فردی' | 'سازمانی')}
            >
              <option>فردی</option>
              <option>سازمانی</option>
            </select>
          </label>
          <p className={s.infoBox}>
            قیمت، دوره و ظرفیت این نمونه تعیین نشده‌اند. ساخت پیش‌نویس به معنی آماده‌بودن فروش نیست.
          </p>
          <div className={s.detailActions}>
            <button type="submit" className={s.primary}>
              افزودن به نمونه
            </button>
            <button type="button" className={s.secondary} onClick={() => setCreating(false)}>
              انصراف
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Messenger({
  direction,
  scenario,
  reset,
  notify,
}: {
  direction: Direction;
  scenario: Scenario;
  reset: () => void;
  notify: (message: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'All' | 'Personal' | 'Organization'>('All');
  const [chat, setChat] = useState<PreviewChat>(chats[0]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [allMessages, setAllMessages] = useState<Record<string, PreviewMessage[]>>({
    sara: initialMessages,
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reply, setReply] = useState<PreviewMessage | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const messages = allMessages[chat.id] ?? [
    { id: `${chat.id}-sample`, text: chat.last, own: false, time: chat.time },
  ];
  const filtered = scenario === 'empty' ? [] : filterChats(query, scope, scenario === 'revoked');
  const revoked = scenario === 'revoked' && chat.scope === 'Organization';
  const allowed = canCompose(chat, scenario);
  const clear = () => {
    setQuery('');
    setScope('All');
    reset();
  };
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [chat.id, messages.length]);
  const openChat = (c: PreviewChat) => {
    setChat(c);
    setMobileOpen(true);
    setReply(null);
    setComposeOpen(false);
  };
  function send() {
    const text = drafts[chat.id]?.trim();
    if (!allowed || !text) return;
    setAllMessages((previous) => ({
      ...previous,
      [chat.id]: [
        ...messages,
        {
          id: `local-${messages.length}`,
          text,
          own: true,
          time: 'اکنون',
          local: true,
          reply: reply?.text,
        },
      ],
    }));
    setDrafts((previous) => ({ ...previous, [chat.id]: '' }));
    setReply(null);
  }
  return (
    <div className={`${s.messenger} ${mobileOpen ? s.mobileChat : ''}`}>
      <section className={s.chatSidebar} aria-label="فهرست گفت‌وگوها">
        <header className={s.chatSidebarHead}>
          <div>
            <span className={s.eyebrow}>در ارتباط بمانید</span>
            <h1>
              پیام‌ها <span>۷</span>
            </h1>
          </div>
          <IconButton label="گفت‌وگوی جدید" onClick={() => setComposeOpen(true)}>
            <Plus size={22} />
          </IconButton>
        </header>
        <div className={s.chatSearch}>
          <Search size={18} />
          <input
            aria-label="جستجوی گفت‌وگو"
            placeholder="جستجو در گفت‌وگوها"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={s.scopeTabs} role="group" aria-label="زمینهٔ گفت‌وگو">
          {(
            [
              { id: 'All', label: 'همه' },
              { id: 'Personal', label: 'شخصی' },
              { id: 'Organization', label: 'آموزشگاه' },
            ] as const
          ).map((f) => (
            <button key={f.id} aria-pressed={scope === f.id} onClick={() => setScope(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className={s.chatList}>
          {scenario === 'loading' || scenario === 'error' ? (
            <State scenario={scenario} onRetry={clear} emptyText="گفت‌وگویی نیست" />
          ) : !filtered.length ? (
            <State scenario="empty" onRetry={clear} emptyText="گفت‌وگویی پیدا نشد" />
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                className={`${s.chatItem} ${chat.id === c.id ? s.chatActive : ''}`}
                onClick={() => openChat(c)}
              >
                <span className={`${s.avatar} ${s[c.color]}`}>{c.initials}</span>
                <span className={s.chatSummary}>
                  <span className={s.row}>
                    <strong>{c.name}</strong>
                    <time>{c.time}</time>
                  </span>
                  {c.organization && (
                    <span className={s.orgLabel}>
                      <ShieldCheck size={12} />
                      {c.organization}
                    </span>
                  )}
                  <span className={s.row}>
                    <span className={s.lastMessage}>{c.last}</span>
                    {c.unread && <b className={s.unread}>{c.unread}</b>}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
        <button
          className={s.newChat}
          aria-label="شروع گفت‌وگوی جدید"
          onClick={() => setComposeOpen(true)}
        >
          <Plus size={22} />
          <span>گفت‌وگوی جدید</span>
        </button>
        <footer className={s.chatListFoot}>
          <ShieldCheck size={14} /> حریم خصوصی در همهٔ فضاها برقرار است
        </footer>
      </section>
      <section className={s.chatRoom} aria-label={`گفت‌وگو با ${chat.name}`}>
        <header className={s.roomHeader}>
          <button
            className={`${s.iconButton} ${s.mobileBack}`}
            aria-label="بازگشت به گفت‌وگوها"
            onClick={() => setMobileOpen(false)}
          >
            <ArrowRight size={22} />
          </button>
          <button className={s.roomIdentity} onClick={() => setDetails(true)}>
            <span className={`${s.avatar} ${s[chat.color]}`}>{chat.initials}</span>
            <span>
              <strong>{chat.name}</strong>
              <small>
                {chat.organization
                  ? `${chat.kind} · ${chat.organization}`
                  : 'گفت‌وگوی شخصی · نشست نمایشی'}
              </small>
            </span>
          </button>
          <div className={s.roomTools}>
            <IconButton
              label="جستجو در این گفتگو"
              onClick={() =>
                notify(
                  'جستجوی سراسری نمونه از فیلد فهرست گفت‌وگوها انجام می‌شود. جستجوی کامل پیام‌ها در مرحلهٔ اتصال، با صفحه‌بندی سرور پیاده می‌شود.',
                )
              }
            >
              <Search size={21} />
            </IconButton>
            <IconButton label="اطلاعات و حریم خصوصی گفتگو" onClick={() => setDetails(true)}>
              <Ellipsis size={23} />
            </IconButton>
          </div>
        </header>
        <div className={s.scopeNotice}>
          {chat.organization ? (
            <>
              <ShieldCheck size={14} /> فضای رسمی · {chat.organization} <span>مالکیت سازمانی</span>
            </>
          ) : (
            <>
              <ShieldCheck size={14} /> فضای شخصی <span>مستقل از نقش آموزشگاهی</span>
            </>
          )}
        </div>
        {scenario === 'loading' || scenario === 'error' || scenario === 'empty' || revoked ? (
          <div className={s.roomState}>
            <State
              scenario={revoked ? 'revoked' : scenario}
              onRetry={clear}
              emptyText="هنوز پیامی در این نمونه نیست"
            />
          </div>
        ) : (
          <>
            <div className={s.messages}>
              <div className={s.dayMarker}>امروز · دادهٔ نمونه</div>
              {messages.map((m) => (
                <article key={m.id} className={`${s.bubble} ${m.own ? s.ownBubble : ''}`}>
                  {m.reply && <blockquote>{m.reply}</blockquote>}
                  <p dir="auto">{m.text}</p>
                  <div className={s.messageMeta}>
                    <time>{m.time}</time>
                    {m.local ? (
                      <span>فقط در نمونه</span>
                    ) : m.own ? (
                      <CheckCheck size={15} aria-label="وضعیت ساختگی پیام نمونه" />
                    ) : null}
                    <button
                      title="پاسخ به پیام"
                      aria-label={`پاسخ به ${m.text}`}
                      onClick={() => setReply(m)}
                    >
                      <ArrowUpLeft size={15} />
                    </button>
                  </div>
                </article>
              ))}
              <div ref={end} />
              <p className={s.localOnly}>پیام‌ها ساختگی‌اند؛ ارسال و تحویل واقعی انجام نمی‌شود.</p>
            </div>
            <div className={s.composerArea}>
              {reply && (
                <div className={s.replyPreview}>
                  <ArrowUpLeft size={18} />
                  <span>
                    <strong>پاسخ به پیام</strong>
                    <small>{reply.text}</small>
                  </span>
                  <IconButton label="لغو پاسخ" onClick={() => setReply(null)}>
                    <X size={18} />
                  </IconButton>
                </div>
              )}
              {allowed ? (
                <form
                  className={s.composer}
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <IconButton
                    label="پیوست فایل نمونه"
                    onClick={() =>
                      notify(
                        'ارسال فایل در نمونه انجام نمی‌شود. نسخهٔ متصل باید انتخاب فایل، پیشرفت، لغو و مجوز دانلود را با قرارداد موجود پوشش دهد.',
                      )
                    }
                  >
                    <Paperclip size={23} />
                  </IconButton>
                  <textarea
                    rows={1}
                    aria-label="متن پیام"
                    placeholder="پیامی بنویسید…"
                    value={drafts[chat.id] ?? ''}
                    onChange={(e) =>
                      setDrafts((previous) => ({ ...previous, [chat.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <button
                    className={s.sendButton}
                    disabled={!drafts[chat.id]?.trim()}
                    type="submit"
                    aria-label="ثبت پیام در نمونه"
                  >
                    <Send size={21} />
                  </button>
                </form>
              ) : (
                <p className={s.readOnly}>این کانال در نمونه فقط خواندنی است.</p>
              )}
            </div>
          </>
        )}
      </section>
      {direction === 'atlas' && (
        <aside className={s.chatInspector}>
          <span className={`${s.largeAvatar} ${s[chat.color]}`}>{chat.initials}</span>
          <h2>{chat.name}</h2>
          <span className={s.fine}>{chat.kind}</span>
          <div className={s.inspectorBlock}>
            <small>زمینه</small>
            <strong>{chat.organization ?? 'حساب شخصی'}</strong>
            <p>
              {chat.organization
                ? 'فضای رسمی به آموزشگاه وابسته است.'
                : 'تاریخچهٔ شخصی با خروج از آموزشگاه حذف نمی‌شود.'}
            </p>
          </div>
          <button className={s.secondary} onClick={() => setDetails(true)}>
            <ShieldCheck size={17} /> اطلاعات و حریم خصوصی
          </button>
          {!revoked && (
            <div className={s.inspectorBlock}>
              <small>فایل‌ها و رسانه</small>
              <div className={s.filePreview}>
                <FileText size={20} />
                <span>
                  یادداشت جلسه<small>فایل نمونه · بدون دانلود</small>
                </span>
              </div>
            </div>
          )}
        </aside>
      )}
      <Modal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        title="شروع گفت‌وگوی نمونه"
        description="این فهرست دفترچهٔ مخاطبین واقعی نیست. انتخاب مخاطب فقط نمای چت را باز می‌کند."
      >
        <div className={s.contactList}>
          {chats
            .filter((c) => c.scope === 'Personal' && c.id !== 'saved')
            .map((c) => (
              <button key={c.id} onClick={() => openChat(c)}>
                <span className={`${s.avatar} ${s[c.color]}`}>{c.initials}</span>
                <span>
                  <strong>{c.name}</strong>
                  <small>مخاطب ساختگی</small>
                </span>
                <MessageCircle size={20} />
              </button>
            ))}
        </div>
        <p className={s.fine}>
          افزودن مخاطب واقعی، گروه و کانال با قراردادهای موجود در مرحلهٔ اجرای جهت منتخب پوشش داده
          می‌شوند.
        </p>
      </Modal>
      <Modal
        open={details}
        onOpenChange={setDetails}
        title={`اطلاعات ${chat.name}`}
        description="اطلاعات نمایشی؛ این موارد مجوز واقعی یا نشان تأییدشده ایجاد نمی‌کنند."
      >
        <div className={s.detailGrid}>
          <div>
            <small>زمینه</small>
            <strong>{chat.scope === 'Personal' ? 'شخصی' : 'سازمانی'}</strong>
          </div>
          <div>
            <small>وابستگی</small>
            <strong>{chat.organization ?? 'بدون وابستگی سازمانی'}</strong>
          </div>
        </div>
        <p className={s.infoBox}>
          داشتن نقش، نشان یا اشتراک، حریم خصوصی و مسدودی مخاطب را دور نمی‌زند.
        </p>
        <button
          className={s.secondary}
          onClick={() => {
            setDetails(false);
            notify(
              'مسدودسازی واقعی در نمونه اجرا نمی‌شود. اتصال Block/Unblock و تنظیمات مخاطب در مرحلهٔ پیام‌رسان از API موجود منتقل می‌شود.',
            );
          }}
        >
          بررسی رفتار مسدودسازی
        </button>
      </Modal>
    </div>
  );
}
