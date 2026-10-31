'use client';
import { Panel, DataView } from '@/components/ui/data-view';
import { CommandDialog } from '@/components/ui/command-dialog';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import { money } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';

export function PlanVersion({
  version,
  reload,
}: {
  version: components['schemas']['PlatformPlanVersionItem'];
  reload: () => Promise<components['schemas']['PlatformPlanVersionItem'] | undefined>;
}) {
  const v = version;
  const base = '/api/admin/v1/commerce/plan-versions/' + v.planVersionId;
  const { can } = useAccess();
  const q = useApi<components['schemas']['CommercialValidationDto']>(
    base + '/validation',
    v.status === 'Draft',
  );
  const draftDefaults = {
    priceToman: v.priceToman ?? null,
    explicitlyFree: false,
    calendar: v.calendar ?? null,
    saleTermsReference: v.saleTermsReference ?? null,
    warningPercent: v.warningPercent ?? null,
    criticalWarningPercent: v.criticalWarningPercent ?? null,
    entitlements: v.entitlements,
    quotas: v.quotas,
    expectedVersion: v.version,
  };
  return (
    <Panel title={'نسخه ' + v.versionNumber} description={money(v.priceAmount, v.currency)}>
      <DataView value={v} hide={['priceAmount', 'currency']} />
      {v.status === 'Draft' && (
        <>
          <div className="mt-4">
            {q.isPending && can(base + '/validation') ? (
              <LoadingSkeleton />
            ) : q.isError ? (
              <ErrorState error={q.error} onRetry={() => void q.refetch()} />
            ) : (
              q.data && (
                <>
                  <p className={q.data.canPublish ? 'form-message success' : 'notice warning'}>
                    {q.data.canPublish
                      ? 'این نسخه از نظر سرور آماده انتشار است.'
                      : 'انتشار تا تکمیل اطلاعات مجاز نیست.'}
                  </p>
                  <DataView value={q.data} fields={['missingFields', 'canPublish']} />
                </>
              )
            )}
          </div>
          <div className="row-actions mt-5">
            <CommandDialog
              title="ویرایش پیش‌نویس"
              method="PUT"
              path={base + '/draft'}
              defaults={draftDefaults}
              description="نسخه پیش‌نویس را اصلاح کنید. قیمت نامشخص رایگان محسوب نمی‌شود؛ رایگان بودن باید صریحاً تأیید شود."
              preview={
                <p className="notice">
                  نسخه {v.versionNumber}؛ {v.planVersionId}
                </p>
              }
              onReload={async () => {
                const fresh = await reload();
                return { expectedVersion: fresh?.version };
              }}
              resultView
            />
            <CommandDialog
              title="انتشار نسخه"
              path={base + '/publish'}
              defaults={{ expectedVersion: q.data?.version }}
              disabled={!q.data?.canPublish || q.isFetching}
              preview={
                <div className="notice">
                  <p>
                    نسخه {v.versionNumber}؛ {money(v.priceAmount, v.currency)}
                  </p>
                  <p>پس از انتشار، این نسخه درجا ویرایش نمی‌شود.</p>
                </div>
              }
              onReload={async () => {
                await reload();
                const r = await q.refetch({ throwOnError: true });
                return { expectedVersion: r.data?.version };
              }}
            />
          </div>
        </>
      )}
    </Panel>
  );
}
