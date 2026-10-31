'use client';
import { useState } from 'react';
import { Panel, DataView, IdCopy } from '@/components/ui/data-view';
import { CommandDialog } from '@/components/ui/command-dialog';
import { EntityPicker, type Choice } from '@/components/ui/entity-picker';
import { ErrorState, EmptyState, LoadingSkeleton, label, UpdatedAt } from '@/components/ui/states';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import { money, number } from '@/lib/formatting';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';

type Summary = components['schemas']['CommercialSummaryDto'];
const root = '/api/admin/v1/commerce';

export function CommercialContracts() {
  const [kind, setKind] = useState<'user' | 'organization'>('user');
  const [choice, setChoice] = useState<Choice | null>(null);
  return (
    <>
      <Panel
        title="انتخاب صاحب قرارداد"
        description="قرارداد فردی و سازمانی مستقل از نقش و عضویت آموزشی است."
      >
        <div className="form-grid">
          <label>
            نوع قرارداد
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as typeof kind);
                setChoice(null);
              }}
            >
              <option value="user">فردی</option>
              <option value="organization">سازمانی</option>
            </select>
          </label>
          <EntityPicker
            key={kind}
            kind={kind}
            title={kind === 'user' ? 'کاربر صاحب قرارداد' : 'سازمان صاحب قرارداد'}
            value={choice?.value ?? null}
            onChange={setChoice}
          />
        </div>
      </Panel>
      {choice ? (
        <CommercialSummary
          key={kind + choice.value}
          kind={kind}
          id={choice.value}
          name={choice.label}
        />
      ) : (
        <EmptyState
          title="صاحب قرارداد را انتخاب کنید"
          description="وضعیت قرارداد، سهمیه و سوابق همان حساب یا سازمان نمایش داده می‌شود."
        />
      )}
    </>
  );
}

export function CommercialHistory({ id }: { id: string }) {
  const path = `${root}/history/${id}`;
  const { can } = useAccess();
  const q = useApi<components['schemas']['CommercialHistoryDto'][]>(path);
  if (!can(path)) return null;
  return (
    <Panel
      title="تاریخچه تجاری"
      description="سوابق ثبت‌شده سرور شامل عامل اقدام، دلیل و مقادیر قبل و بعد است."
    >
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length ? (
        q.data.map((entry) => (
          <div className="nested-block" key={entry.id}>
            <DataView value={entry} />
          </div>
        ))
      ) : (
        <EmptyState title="سابقه تجاری ثبت نشده است" />
      )}
    </Panel>
  );
}

export function CommercialSummary({
  kind,
  id,
  name,
}: {
  kind: 'user' | 'organization';
  id: string;
  name: string;
}) {
  const base = `${root}/${kind === 'user' ? 'users' : 'organizations'}/${id}`;
  const path = base + '/subscription';
  const { can } = useAccess();
  const q = useApi<Summary>(path);
  if (!can(path)) return <ErrorState error={new ApiError(403)} />;
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const data = q.data;
  return (
    <>
      <Panel
        title={`قرارداد تجاری ${name}`}
        description="ثبت قرارداد، نقش آموزشی یا عضویت سازمانی ایجاد نمی‌کند."
        action={
          <CommandDialog
            title="ثبت قرارداد تجاری"
            path={base + '/commercial-contracts'}
            disabled={data.version === undefined}
            defaults={{
              expectedCurrentVersion: data.version,
              billingAnchorUtc: new Date().toISOString(),
              billingPeriodIndex: 0,
            }}
            description="پس از بررسی صاحب قرارداد و نسخه منتشرشده پلن، دلیل ثبت قرارداد را وارد و تأیید کنید."
            preview={
              <div className="notice">
                <strong>{name}</strong>
                <IdCopy value={id} />
                <p>نوع قرارداد: {label(data.ownerType)}</p>
                <p>وضعیت فعلی: {label(data.state)}</p>
              </div>
            }
            onReload={async () => {
              const r = await q.refetch({ throwOnError: true });
              return { expectedCurrentVersion: r.data?.version };
            }}
            resultView
          />
        }
      >
        <DataView value={data} hide={['quotas', 'monthlyPriceToman', 'renewalPriceToman']} />
        <div className="view-grid mt-4">
          <div className="view-field">
            <span>قیمت ماهانه</span>
            {money(data.monthlyPriceToman, data.displayCurrency)}
          </div>
          <div className="view-field">
            <span>قیمت تمدید</span>
            {money(data.renewalPriceToman, data.displayCurrency)}
          </div>
        </div>
        <p className="field-help">
          مقدار نامشخص به معنی رایگان یا نامحدود نیست. وضعیت تجاری، دسترسی آموزشی را جایگزین
          نمی‌کند.
        </p>
      </Panel>
      <Panel title="سهمیه‌ها و مصرف">
        {data.quotas.length ? (
          <div className="table-scroll" role="region" aria-label="جدول سهمیه‌ها" tabIndex={0}>
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    'سهمیه',
                    'نوع',
                    'واحد',
                    'سقف',
                    'مصرف‌شده',
                    'رزروشده',
                    'باقی‌مانده',
                    'وضعیت',
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.quotas.map((quota) => (
                  <tr key={quota.key}>
                    <td>{label(quota.key)}</td>
                    <td>{label(quota.kind)}</td>
                    <td>{quota.unit}</td>
                    <td>
                      {quota.isUnlimited === true
                        ? 'نامحدود'
                        : quota.limit === null
                          ? 'نامشخص'
                          : number(quota.limit)}
                    </td>
                    <td>
                      {quota.isUsageAvailable === false ? 'در دسترس نیست' : number(quota.consumed)}
                    </td>
                    <td>
                      {quota.isUsageAvailable === false ? 'در دسترس نیست' : number(quota.reserved)}
                    </td>
                    <td>
                      {quota.isUsageAvailable === false
                        ? 'در دسترس نیست'
                        : quota.remaining === null
                          ? 'نامشخص'
                          : number(quota.remaining)}
                    </td>
                    <td>
                      {quota.isOverQuota
                        ? 'عبور از سهمیه'
                        : quota.warningLevel
                          ? label(quota.warningLevel)
                          : '—'}
                      <p className="field-help">
                        هشدار:{' '}
                        {quota.warningPercent == null ? '—' : number(quota.warningPercent) + '٪'}؛
                        بحرانی:{' '}
                        {quota.criticalWarningPercent == null
                          ? '—'
                          : number(quota.criticalWarningPercent) + '٪'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="سهمیه‌ای گزارش نشده است" />
        )}
        <p className="field-help">
          سهمیه هوش مصنوعی و منابع در مدل تجاری وجود دارد؛ اجرای هوش مصنوعی و چرخه کامل منابع در این
          انتشار فعال نیست.
        </p>
      </Panel>
      <CommercialHistory id={id} />
      <UpdatedAt at={q.dataUpdatedAt} />
    </>
  );
}
