'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { ListView } from '@/components/ui/list-view';
import { Panel, DataView } from '@/components/ui/data-view';
import { CommandDialog } from '@/components/ui/command-dialog';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton, ErrorState } from '@/components/ui/states';
import { useAccess } from '@/features/access-context/provider';
import { useApi } from '@/lib/api/hooks';
import { request } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { libraryActionAllowed, type LibrarySource } from '@/lib/library-policy';
import type { components } from '@/generated/api/schema';

const catalog = '/api/admin/v1/library/sources';
export function LibraryPage() {
  return (
    <>
      <PageHeader
        title="منابع کتابخانه"
        description="مدیریت منابع عمومی پلتفرم؛ پیش‌نویس، انتشار و بایگانی"
        action={<SourceEditor />}
      />
      <p className="notice">
        نمایش عمومی فقط برای منابع منتشرشده و عمومی است. استفاده هوش مصنوعی از منابع در این نسخه
        فعال نیست.
      </p>
      <ListView
        endpoint={catalog}
        title="فهرست منابع"
        fixed={{ Scope: 'Library', ClassId: '' }}
        statusEnum="EducationalSourceStatus"
        columns={[
          {
            key: 'title',
            title: 'عنوان منبع',
            sub: 'description',
            link: (r) => '/admin/library/' + r.sourceId,
          },
          { key: 'sourceType', title: 'نوع' },
          { key: 'publicationStatus', title: 'انتشار' },
          { key: 'visibility', title: 'نمایانی' },
          { key: 'status', title: 'وضعیت' },
          { key: 'revision', title: 'بازبینی' },
          { key: 'safetyStatus', title: 'بررسی ایمنی' },
        ]}
      />
    </>
  );
}
export function LibraryDetail({ id }: { id: string }) {
  const path = '/api/v1/sources/' + id;
  const { can, guard } = useAccess();
  const q = useApi<LibrarySource>(path);
  const [error, setError] = useState<unknown>();
  const [downloading, setDownloading] = useState(false);
  if (!can(path)) return <ErrorState error={new ApiError(403)} />;
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const source = q.data;
  if (source.scope !== 'Library') return <ErrorState error={new ApiError(404)} />;
  const allowed = (suffix: string, method: string) =>
    can(path + suffix, method) && libraryActionAllowed(source, method, path + suffix);
  const reload = async () => {
    const result = await q.refetch();
    if (!result.data || result.error) throw result.error ?? new ApiError(503);
    return { expectedVersion: result.data.version };
  };
  async function download() {
    setDownloading(true);
    setError(undefined);
    try {
      const blob = await request<Blob>(
        '/api/backend' + path + '/content?revision=' + source.revision,
        {},
        guard,
      );
      if (!(blob instanceof Blob)) throw new ApiError(502);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = source.file?.originalFileName ?? 'library-source.bin';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e);
    } finally {
      setDownloading(false);
    }
  }
  return (
    <>
      <PageHeader
        title={source.title}
        description="پرونده منبع کتابخانه پلتفرم"
        parent={{ href: '/admin/library', label: 'منابع کتابخانه' }}
        action={
          <Button variant="outline" onClick={() => void q.refetch()}>
            به‌روزرسانی منبع
          </Button>
        }
      />
      <div className="row-actions mb-5">
        {allowed('/draft', 'PATCH') && source.publicationStatus === 'Draft' && (
          <CommandDialog
            title="ویرایش پیش‌نویس"
            path={path + '/draft'}
            method="PATCH"
            defaults={{
              title: source.title,
              description: source.description,
              expectedVersion: source.version,
            }}
            onReload={reload}
          />
        )}
        {allowed('/versions', 'POST') && <SourceEditor source={source} reload={reload} />}
        {allowed('/publish', 'POST') && (
          <CommandDialog
            title="انتشار منبع"
            path={path + '/publish'}
            defaults={{ expectedVersion: source.version }}
            onReload={reload}
          />
        )}
        {allowed('/visibility', 'PUT') && (
          <CommandDialog
            title="تغییر نمایانی"
            path={path + '/visibility'}
            method="PUT"
            defaults={{ visibility: source.visibility, expectedVersion: source.version }}
            onReload={reload}
          />
        )}
        {allowed('/archive', 'POST') && (
          <CommandDialog
            title="بایگانی منبع"
            path={path + '/archive'}
            danger
            defaults={{ expectedVersion: source.version }}
            onReload={reload}
          />
        )}
        {allowed('/content', 'GET') && (
          <Button variant="outline" disabled={downloading} onClick={() => void download()}>
            دریافت فایل این بازبینی
          </Button>
        )}
      </div>
      {!!error && <ErrorState error={error} />}
      <div className="detail-grid">
        <Panel title="مشخصات منبع">
          <DataView
            value={source}
            fields={[
              'title',
              'description',
              'scope',
              'sourceType',
              'status',
              'visibility',
              'publicationStatus',
              'revision',
              'currentVersion',
              'publishedVersion',
              'createdAtUtc',
              'publishedAtUtc',
            ]}
          />
        </Panel>
        <Panel title="فایل و بررسی ایمنی">
          <DataView
            value={{
              file: source.file,
              safetyStatus: source.safetyStatus,
              processingStatus: source.processingStatus,
              processingFailureCode: source.processingFailureCode,
              fileReady: source.fileReady,
              sourceReady: source.sourceReady,
            }}
          />
        </Panel>
      </div>
      <p className="notice">
        محتوای بازبینی منتشرشده تغییر نمی‌کند؛ برای جایگزینی فایل، نسخه جدید بسازید. پردازش منبع به
        معنی فعال بودن بازیابی هوش مصنوعی نیست.
      </p>
    </>
  );
}
function SourceEditor({
  source,
  reload,
}: {
  source?: LibrarySource;
  reload?: () => Promise<Record<string, unknown>>;
}) {
  const { can, guard } = useAccess();
  const cache = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const title = source ? 'نسخه جدید منبع' : 'افزودن منبع';
  const path = source ? `/api/v1/sources/${source.sourceId}/versions` : catalog;
  const [name, setName] = useState(source?.title ?? '');
  const [description, setDescription] = useState(source?.description ?? '');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<components['schemas']['FileAssetResult'] | null>(null);
  const [operationId] = useState(() => crypto.randomUUID());
  const [version, setVersion] = useState(source?.version);
  const [error, setError] = useState<unknown>();
  const [pending, setPending] = useState(false);
  const [stale, setStale] = useState(false);
  const lock = useRef(false);
  const [waitUntil, setWaitUntil] = useState(0);
  useEffect(() => {
    if (!open) setVersion(source?.version);
  }, [open, source?.version]);
  if (!can(path, 'POST')) return null;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || stale || !file || !name.trim() || !reason.trim() || Date.now() < waitUntil)
      return;
    lock.current = true;
    setPending(true);
    setError(undefined);
    try {
      let asset = uploaded;
      if (!asset) {
        if (!file.size || file.size > 20 * 1024 * 1024) throw new ApiError(413);
        const body = new FormData();
        body.set('File', file);
        asset = await request('/api/library/upload', { method: 'POST', body }, guard);
        setUploaded(asset);
      }
      if (!asset || asset.status !== 'Ready') throw new ApiError(422, { code: 'FILE_NOT_READY' });
      const body = {
        title: name.trim(),
        description: description.trim() || null,
        reason: reason.trim(),
        fileAssetId: asset.id,
        ...(source
          ? { expectedVersion: version }
          : { clientOperationId: operationId, scope: 'Library', classId: null }),
      };
      const result = await request<LibrarySource>(
        '/api/backend' + path,
        { method: 'POST', body: JSON.stringify(body) },
        guard,
      );
      await cache.invalidateQueries();
      setFile(null);
      setUploaded(null);
      setReason('');
      setVersion(result.version);
      setOpen(false);
      router.push('/admin/library/' + result.sourceId);
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && [409, 412].includes(e.status)) setStale(true);
      if (e instanceof ApiError && e.status === 429)
        setWaitUntil(Date.now() + (e.problem.retryAfter ?? 60) * 1000);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!pending) setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">{title}</Button>
      </DialogTrigger>
      {open && (
        <DialogContent
          title={title}
          description="فایل با حساب جاری بارگذاری می‌شود و منبع فقط در کتابخانه پلتفرم ثبت می‌شود."
        >
          <form className="form-grid" onSubmit={submit}>
            <label>
              عنوان منبع
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={pending}
              />
            </label>
            <label>
              توضیحات
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={pending}
              />
            </label>
            <label>
              فایل منبع
              <input
                type="file"
                required={!file}
                disabled={pending}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setUploaded(null);
                }}
              />
            </label>
            <p className="field-help">
              حداکثر حجم در پنل ۲۰ مگابایت است؛ نوع و ایمنی فایل را سرور بررسی می‌کند.
            </p>
            {file && <p className="field-help">فایل انتخاب‌شده: {file.name}</p>}
            {uploaded && <p role="status">فایل بارگذاری شد؛ آماده ثبت منبع.</p>}
            <label>
              دلیل این اقدام
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={pending}
              />
            </label>
            {!!error && (
              <>
                <ErrorState error={error} />
                {error instanceof ApiError && [503, 504].includes(error.status) && (
                  <p className="notice">
                    نتیجه نامشخص است؛ ابتدا فهرست را بررسی کنید. شناسه پیگیری همین فرم در تلاش مجدد
                    حفظ می‌شود.
                  </p>
                )}
              </>
            )}
            {stale && reload && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const fresh = await reload();
                    if (typeof fresh.expectedVersion !== 'string') throw new ApiError(409);
                    setVersion(fresh.expectedVersion);
                    setStale(false);
                    setError(undefined);
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                دریافت نسخه تازه و حفظ ورودی
              </Button>
            )}
            <div className="form-actions">
              <Button
                type="submit"
                disabled={pending || stale || !file || !name.trim() || !reason.trim()}
              >
                {pending ? 'در حال ثبت…' : title}
              </Button>
            </div>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
