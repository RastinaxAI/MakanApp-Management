'use client';
import { useState } from 'react';
import { FileDown, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ListView } from '@/components/ui/list-view';
import { Panel, DataView } from '@/components/ui/data-view';
import { CommandDialog } from '@/components/ui/command-dialog';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton, ErrorState, StatusBadge } from '@/components/ui/states';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import { request } from '@/lib/api/client';
import { ApiError, isRecord } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
export function ModerationPage() {
  return (
    <>
      <PageHeader
        title="رسیدگی به گزارش‌ها"
        description="بررسی پرونده‌ها، شواهد مجاز و تصمیم‌های مدیریتی"
      />
      <ListView
        endpoint="/api/admin/v1/moderation/cases"
        title="پرونده‌های رسیدگی"
        statusEnum="ModerationCaseStatus"
        columns={[
          { key: 'caseId', title: 'پرونده', link: (r) => '/admin/moderation/' + r.caseId },
          { key: 'source', title: 'منبع' },
          { key: 'organization.name', title: 'سازمان' },
          { key: 'priority', title: 'اولویت' },
          { key: 'status', title: 'وضعیت' },
          { key: 'createdAtUtc', title: 'تاریخ ایجاد' },
          { key: 'updatedAtUtc', title: 'آخرین تغییر' },
        ]}
      />
    </>
  );
}
export function ModerationDetail({ id }: { id: string }) {
  const path = '/api/admin/v1/moderation/cases/' + id;
  const { can, guard } = useAccess();
  const q = useApi<components['schemas']['PlatformModerationCaseDetail']>(path);
  const [expanded, setExpanded] = useState<unknown>(null),
    [downloadError, setDownloadError] = useState<unknown>();
  if (!can(path)) return <ErrorState error={new ApiError(403)} />;
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const data = q.data;
  const defaults = { expectedVersion: data.case.version };
  const reload = async () => {
    setExpanded(null);
    const r = await q.refetch();
    return { expectedVersion: r.data?.case.version };
  };
  async function download(file: components['schemas']['PlatformModerationEvidenceItem']) {
    try {
      const blob = await request<Blob>(
        `/api/backend${path}/evidence/files/${file.fileAssetId}`,
        {},
        guard,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName.replace(/[\\/]/g, '_');
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setDownloadError(e);
    }
  }
  return (
    <>
      <PageHeader
        title="پرونده رسیدگی"
        description="دسترسی به شواهد محدود به همین پرونده و مجوز جاری است."
        parent={{ href: '/admin/moderation', label: 'گزارش‌ها' }}
        action={<StatusBadge value={data.case.status} />}
      />
      <div className="notice">
        <ShieldCheck size={18} />
        شواهد و متن مجاز فقط در محدوده پرونده دریافت می‌شوند؛ این مسیر امکان مرور عمومی گفتگوهای
        خصوصی نیست.
      </div>
      <Panel title="اطلاعات و وضعیت پرونده">
        <DataView value={data.case} />
        <div className="row-actions mt-5">
          <CommandDialog
            title="شروع بررسی"
            path={path + '/start-review'}
            defaults={defaults}
            onReload={reload}
          />
          <CommandDialog
            title="ثبت اقدام"
            path={path + '/actions'}
            defaults={defaults}
            onReload={reload}
          />
          <CommandDialog
            title="حل پرونده"
            path={path + '/resolve'}
            defaults={defaults}
            onReload={reload}
          />
          <CommandDialog
            title="رد پرونده"
            path={path + '/dismiss'}
            defaults={defaults}
            onReload={reload}
          />
          <CommandDialog
            title="اجرای حذف محتوا"
            path={path + '/enforce-content-removal'}
            defaults={defaults}
            onReload={reload}
            danger
          />
        </div>
      </Panel>
      <div className="detail-grid">
        <Panel title="شواهد گزارش">
          <DataView value={data.abuseReport} />
        </Panel>
        <Panel title="رخداد ایمنی">
          <DataView value={data.safetyIncident} />
        </Panel>
      </div>
      <Panel title="پیوست‌های مجاز">
        {data.attachments.map((file) => (
          <div key={file.fileAssetId} className="feature-row">
            <span>{file.fileName}</span>
            {can(`${path}/evidence/files/${file.fileAssetId}`) && (
              <Button size="sm" variant="outline" onClick={() => void download(file)}>
                <FileDown size={15} />
                دریافت فایل
              </Button>
            )}
          </div>
        ))}
        {!!downloadError && <ErrorState error={downloadError} />}
      </Panel>
      <Panel
        title="زمینه گسترش‌یافته پرونده"
        description="این اطلاعات فقط با مجوز مستقل و تأیید امنیتی لازم دریافت می‌شوند."
        action={
          <CommandDialog
            title="درخواست زمینه مجاز"
            path={path + '/expanded-context'}
            defaults={defaults}
            onReload={reload}
            onSuccess={setExpanded}
          />
        }
      >
        {expanded && isRecord(expanded) ? (
          <DataView value={expanded} fields={['contextMessages']} />
        ) : (
          <p className="text-muted text-xs">
            برای دریافت شواهد تکمیلی، درخواست مجاز این پرونده را ثبت کنید.
          </p>
        )}
      </Panel>
      <Panel title="اقدام‌های ثبت‌شده">
        <DataView value={{ actions: data.actions }} />
      </Panel>
    </>
  );
}
