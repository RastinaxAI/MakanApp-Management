'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ListView } from '@/components/ui/list-view';
import { CommandDialog } from '@/components/ui/command-dialog';
import { Panel, DataView, IdCopy } from '@/components/ui/data-view';
import { LoadingSkeleton, ErrorState } from '@/components/ui/states';
import { useApi } from '@/lib/api/hooks';
import type { components } from '@/generated/api/schema';
export function SchedulePage() {
  return (
    <>
      <PageHeader
        title="برنامه و جلسات"
        description="جلسات سازمان در بازه زمانی موردنظر؛ نمایش زمان به وقت تهران"
      />
      <ListView
        endpoint="/api/v1/academic/schedule"
        title="جلسات قابل دسترسی"
        columns={[
          { key: 'title', title: 'جلسه', link: (r) => '/organization/sessions/' + r.id },
          { key: 'classTitle', title: 'کلاس' },
          { key: 'startUtc', title: 'شروع' },
          { key: 'endUtc', title: 'پایان' },
          { key: 'status', title: 'وضعیت' },
        ]}
      />
    </>
  );
}
export function SessionDetail({ id }: { id: string }) {
  const path = '/api/v1/academic/sessions/' + id;
  const q = useApi<components['schemas']['SessionResult']>(path);
  const attendance = useApi<components['schemas']['SessionAttendanceResult']>(path + '/attendance');
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} />;
  const session = q.data;
  const reload = async () => {
    const r = await q.refetch();
    return { expectedRowVersion: r.data?.rowVersion };
  };
  return (
    <>
      <PageHeader
        title={session.title}
        description="جلسه، حضور و اصلاح مستند سوابق"
        parent={{ href: '/organization/schedule', label: 'برنامه و جلسات' }}
      />
      <Panel title="مشخصات جلسه">
        <DataView value={session} />
        <div className="row-actions mt-5">
          <CommandDialog
            title="ویرایش جلسه"
            method="PATCH"
            path={path}
            defaults={{ ...session, expectedRowVersion: session.rowVersion }}
            onReload={reload}
          />
          <CommandDialog
            title="تکمیل جلسه"
            path={path + '/complete'}
            defaults={{ expectedRowVersion: session.rowVersion }}
            onReload={reload}
          />
          <CommandDialog
            title="لغو جلسه"
            path={path + '/cancel'}
            defaults={{ expectedRowVersion: session.rowVersion }}
            onReload={reload}
            danger
          />
        </div>
      </Panel>
      <Panel
        title="دفتر حضور"
        action={
          <CommandDialog
            title="ثبت حضور"
            method="PUT"
            path={path + '/attendance'}
            defaults={{
              entries:
                attendance.data?.entries.map((e) => ({
                  enrollmentId: e.enrollmentId,
                  status: e.status,
                })) ?? [],
            }}
            resultView
          />
        }
      >
        {attendance.isPending ? (
          <LoadingSkeleton />
        ) : attendance.isError ? (
          <ErrorState error={attendance.error} onRetry={() => void attendance.refetch()} />
        ) : (
          <>
            {attendance.data.entries.map((entry) => (
              <div className="nested-block" key={entry.enrollmentId}>
                <DataView value={entry} />
                {entry.attendanceId && entry.rowVersion && (
                  <div className="mt-4">
                    <CommandDialog
                      title="اصلاح مستند حضور"
                      method="PATCH"
                      path={`${path}/attendance/${entry.attendanceId}`}
                      defaults={{ status: entry.status, expectedRowVersion: entry.rowVersion }}
                      onReload={async () => {
                        const r = await attendance.refetch();
                        return {
                          expectedRowVersion: r.data?.entries.find(
                            (e) => e.attendanceId === entry.attendanceId,
                          )?.rowVersion,
                        };
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            <h3 className="mt-5 mb-3">سوابق اصلاح حضور</h3>
            <DataView value={{ revisions: attendance.data.revisions }} />
          </>
        )}
      </Panel>
    </>
  );
}
