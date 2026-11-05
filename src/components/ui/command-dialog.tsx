'use client';
import { useState, useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent } from './dialog';
import { Button } from './button';
import { DataView, fieldLabels } from './data-view';
import { label } from './states';
import { useAccess } from '@/features/access-context/provider';
import { operationFor, resolve, validator } from '@/lib/api/contract';
import { request } from '@/lib/api/client';
import { ApiError, isRecord } from '@/lib/api/errors';
import { latinDigits, localDateTime, utcDateTime } from '@/lib/formatting';
import { EntityPicker, PlanVersionPicker, referenceKind } from './entity-picker';
type CommandProps = {
  title: string;
  path: string;
  method?: string;
  defaults?: Record<string, unknown>;
  hidden?: string[];
  description?: string;
  preview?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSuccess?: (data: unknown) => void;
  onReload?: () => Promise<Record<string, unknown>>;
  resultView?: boolean;
};
export function CommandDialog(props: CommandProps) {
  const { can } = useAccess();
  const [open, setOpen] = useState(false);
  if (!can(props.path, props.method ?? 'POST')) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={props.danger ? 'destructive' : 'outline'}
          disabled={props.disabled}
        >
          {props.title}
        </Button>
      </DialogTrigger>
      {open && (
        <DialogContent title={props.title} description={props.description}>
          <CommandForm {...props} close={() => setOpen(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}
function CommandForm({
  title,
  path,
  method = 'POST',
  defaults = {},
  hidden = [],
  preview,
  close,
  onSuccess,
  onReload,
  resultView,
  disabled,
}: CommandProps & { close: () => void }) {
  const { guard, session } = useAccess();
  const cache = useQueryClient();
  const op = operationFor(method, path);
  const body = resolve(op?.body ?? {});
  const props = body.properties ?? {};
  const [initial] = useState(() =>
    Object.fromEntries(
      Object.entries(props).map(([key, value]) => [
        key,
        key in defaults
          ? defaults[key]
          : resolve(value).default !== undefined
            ? resolve(value).default
            : key === 'clientOperationId'
              ? crypto.randomUUID()
              : resolve(value).nullable
                ? null
                : resolve(value).type === 'boolean'
                  ? false
                  : resolve(value).type === 'array'
                    ? []
                    : resolve(value).type === 'number' || resolve(value).type === 'integer'
                      ? 0
                      : (resolve(value).enum?.[0] ?? ''),
      ]),
    ),
  );
  const schema = (
    validator(op?.body ?? { type: 'object' }) as z.ZodType<
      Record<string, unknown>,
      Record<string, unknown>
    >
  ).superRefine((data, ctx) => {
    for (const [key, value] of Object.entries(data))
      if (
        typeof value === 'string' &&
        !value.trim() &&
        body.required?.includes(key) &&
        !resolve(props[key] ?? {}).nullable
      )
        ctx.addIssue({ code: 'custom', message: 'این فیلد را تکمیل کنید.', path: [key] });
  });
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });
  const [error, setError] = useState<ApiError | null>(null),
    [success, setSuccess] = useState<unknown>(),
    [done, setDone] = useState(false),
    [waitUntil, setWaitUntil] = useState(0),
    [tick, setTick] = useState(Date.now());
  const inFlight = useRef(false);
  const [needsReload, setNeedsReload] = useState(false);
  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitUntil]);
  const versions = [
    'expectedVersion',
    'expectedCurrentVersion',
    'expectedRowVersion',
    'expectedPersonRowVersion',
    'clientOperationId',
    ...hidden,
  ];
  async function submit(data: Record<string, unknown>) {
    if (disabled || Date.now() < waitUntil || inFlight.current || needsReload) return;
    inFlight.current = true;
    setError(null);
    try {
      const result = await request<unknown>(
        '/api/backend' + path,
        { method, body: op?.body ? JSON.stringify(data) : undefined },
        guard,
      );
      await cache.invalidateQueries();
      onSuccess?.(result);
      if (resultView) {
        setSuccess(result);
        setDone(true);
      } else {
        close();
      }
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(503);
      setError(err);
      if ([409, 412].includes(err.status) && onReload) setNeedsReload(true);
      for (const [key, messages] of Object.entries(err.problem.errors ?? {}))
        form.setError(key, { message: messages.join(' ') });
      if (err.status === 429) {
        const until = Date.now() + (err.problem.retryAfter ?? 60) * 1000;
        setWaitUntil(until);
      }
    } finally {
      inFlight.current = false;
    }
  }
  if (done)
    return (
      <>
        <div role="status" className="form-message success">
          پاسخ عملیات دریافت شد. وضعیت ثبت‌شده سرور را بررسی کنید.
        </div>
        <div className="mt-4">
          <DataView value={success} />
        </div>
        <div className="form-actions">
          <Button onClick={close}>بستن</Button>
        </div>
      </>
    );
  return (
    <form className="form-grid" onSubmit={form.handleSubmit(submit)} noValidate>
      {preview}
      {Object.entries(props)
        .filter(([key]) => !versions.includes(key))
        .map(([key, field]) => {
          const s = resolve(field);
          const kind = path.startsWith('/api/admin/') ? referenceKind(key) : undefined;
          const fieldTitle =
            kind === 'user'
              ? key === 'initialManagerUserId'
                ? 'مدیر اولیه'
                : key === 'actorUserId'
                  ? 'عامل اقدام'
                  : 'کاربر'
              : kind === 'role'
                ? 'نقش'
                : kind === 'organization'
                  ? 'سازمان'
                  : kind === 'class'
                    ? 'کلاس'
                    : (formLabels[key] ?? fieldLabels[key] ?? key);
          if (s.type === 'array')
            return (
              <div key={key}>
                <span className="field-title">{fieldTitle}</span>
                <ArrayEditor name={key} schema={s.items ?? {}} form={form} />
                {form.formState.errors[key] && (
                  <p className="field-error">اطلاعات ردیف‌ها را بررسی کنید.</p>
                )}
              </div>
            );
          if (path.startsWith('/api/admin/') && s.format === 'date-time')
            return (
              <div key={key}>
                <span className="field-title">{fieldTitle}</span>
                <Controller
                  name={key}
                  control={form.control}
                  render={({ field: controlled }) => (
                    <input
                      aria-label={fieldTitle}
                      type="datetime-local"
                      value={localDateTime(
                        typeof controlled.value === 'string' ? controlled.value : null,
                      )}
                      onChange={(e) =>
                        controlled.onChange(
                          e.target.value ? utcDateTime(e.target.value) : s.nullable ? null : '',
                        )
                      }
                    />
                  )}
                />
                <p className="field-help">
                  به وقت دستگاه شما؛ برای سرور به UTC تبدیل می‌شود.{s.nullable ? ' اختیاری.' : ''}
                </p>
                {form.formState.errors[key] && (
                  <p className="field-error">{String(form.formState.errors[key]?.message)}</p>
                )}
              </div>
            );
          if (kind || (path.startsWith('/api/admin/') && key === 'planVersionId'))
            return (
              <div key={key}>
                <span className="field-title">{fieldTitle}</span>
                <Controller
                  name={key}
                  control={form.control}
                  render={({ field: controlled }) =>
                    kind ? (
                      <EntityPicker
                        kind={kind}
                        value={typeof controlled.value === 'string' ? controlled.value : null}
                        title={fieldTitle}
                        nullable={!!s.nullable}
                        onChange={(c) => controlled.onChange(c?.value ?? null)}
                      />
                    ) : (
                      <PlanVersionPicker
                        audience={
                          path.endsWith('/commercial-contracts')
                            ? path.includes('/commerce/users/')
                              ? 'Individual'
                              : 'Organization'
                            : undefined
                        }
                        value={typeof controlled.value === 'string' ? controlled.value : null}
                        nullable={!!s.nullable}
                        onChange={(c) => controlled.onChange(c?.value ?? null)}
                      />
                    )
                  }
                />
                {form.formState.errors[key] && (
                  <p className="field-error">{String(form.formState.errors[key]?.message)}</p>
                )}
              </div>
            );
          return (
            <div key={key}>
              <label htmlFor={'command-' + key}>
                {formLabels[key] ?? fieldLabels[key] ?? key}
                {s.enum ? (
                  <select
                    id={'command-' + key}
                    aria-label={fieldTitle}
                    {...form.register(key, {
                      setValueAs: (v) => (v === '' && s.nullable ? null : v),
                    })}
                  >
                    {s.nullable && <option value="">بدون مقدار</option>}
                    {s.enum
                      .filter((v) => typeof v === 'string')
                      .map((v) => (
                        <option value={v} key={v}>
                          {label(v)}
                        </option>
                      ))}
                  </select>
                ) : s.type === 'boolean' ? (
                  <input id={'command-' + key} type="checkbox" {...form.register(key)} />
                ) : key === 'reason' || key === 'internalNote' || key === 'description' ? (
                  <textarea
                    id={'command-' + key}
                    aria-label={fieldTitle}
                    {...form.register(key, {
                      setValueAs: (v) => (v === '' && s.nullable ? null : v),
                    })}
                  />
                ) : (
                  <input
                    id={'command-' + key}
                    aria-label={fieldTitle}
                    dir={
                      s.format === 'uuid' ||
                      s.format === 'date-time' ||
                      /code|Code|Id|Version|Url/i.test(key)
                        ? 'ltr'
                        : undefined
                    }
                    type={s.type === 'number' || s.type === 'integer' ? 'number' : 'text'}
                    step={s.type === 'number' ? 'any' : undefined}
                    autoComplete="off"
                    {...form.register(key, {
                      setValueAs: (v) =>
                        (v == null || v === '') && s.nullable
                          ? null
                          : s.type === 'number' || s.type === 'integer'
                            ? Number(latinDigits(String(v)))
                            : v,
                    })}
                  />
                )}
                <span className="field-help">
                  {s.format === 'uuid'
                    ? 'شناسه را از منبع مرتبط انتخاب یا کپی کنید.'
                    : s.format === 'date-time'
                      ? 'زمان UTC با قالب 2026-10-18T10:00:00Z'
                      : s.nullable
                        ? 'اختیاری؛ مقدار خالی به صورت null ارسال می‌شود.'
                        : ''}
                </span>
              </label>
              {form.formState.errors[key] && (
                <span className="field-error">
                  {String(form.formState.errors[key]?.message ?? 'مقدار این فیلد معتبر نیست.')}
                </span>
              )}
            </div>
          );
        })}
      {error && (
        <div className="form-message error" role="alert">
          {error.message}
          {error.problem.code && (
            <small className="block mt-2" dir="ltr">
              {error.problem.code}
            </small>
          )}
          {error.problem.traceId && (
            <small className="block mt-2" dir="ltr">
              {error.problem.traceId}
            </small>
          )}
          {needsReload && onReload && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                void onReload()
                  .then((values) => {
                    if (
                      Object.entries(values).some(
                        ([key, value]) =>
                          value === undefined ||
                          (key !== 'expectedCurrentVersion' && value === null),
                      )
                    )
                      throw new ApiError(409);
                    for (const [key, value] of Object.entries(values)) form.setValue(key, value);
                    setNeedsReload(false);
                    setError(null);
                  })
                  .catch((e) => setError(e instanceof ApiError ? e : new ApiError(503)))
              }
            >
              دریافت نسخه تازه و حفظ ورودی
            </Button>
          )}
          {error.status === 504 && (
            <p>نتیجه اقدام نامشخص است؛ پیش از ارسال دوباره وضعیت منبع را بررسی کنید.</p>
          )}
        </div>
      )}
      {versions.includes('clientOperationId') && initial.clientOperationId != null && (
        <p className="field-help">شناسه این درخواست هنگام تکرار در همین فرم ثابت می‌ماند.</p>
      )}
      <div className="form-actions">
        <Button type="button" variant="ghost" onClick={close}>
          انصراف
        </Button>
        <Button
          type="submit"
          disabled={
            disabled || form.formState.isSubmitting || Date.now() < waitUntil || needsReload
          }
        >
          {form.formState.isSubmitting
            ? 'در حال ثبت…'
            : tick < waitUntil
              ? `انتظار ${Math.ceil((waitUntil - tick) / 1000)} ثانیه`
              : title}
        </Button>
      </div>
    </form>
  );
}
type SchemaShape = ReturnType<typeof resolve>;
function ArrayEditor({
  name,
  schema,
  form,
}: {
  name: string;
  schema: SchemaShape;
  form: ReturnType<typeof useForm<Record<string, unknown>>>;
}) {
  const [keys, setKeys] = useState<string[]>(() => {
    const current = form.getValues(name);
    return Array.isArray(current) ? current.map(() => crypto.randomUUID()) : [];
  });
  const item = resolve(schema);
  function add() {
    const value = form.getValues(name);
    const rows = Array.isArray(value) ? value : [];
    const next = Object.fromEntries(
      Object.entries(item.properties ?? {}).map(([k, s]) => [
        k,
        resolve(s).nullable
          ? null
          : resolve(s).type === 'boolean'
            ? false
            : resolve(s).type === 'number' || resolve(s).type === 'integer'
              ? 0
              : (resolve(s).enum?.[0] ?? ''),
      ]),
    );
    form.setValue(name, [...rows, next]);
    setKeys([...keys, crypto.randomUUID()]);
  }
  return (
    <div className="form-array">
      {keys.map((id, index) => (
        <div key={id} className="form-array-row">
          {Object.entries(item.properties ?? {}).map(([key, s]) => {
            const field = resolve(s);
            const p = `${name}.${index}.${key}`;
            return (
              <label key={p}>
                {key === 'key'
                  ? name === 'entitlements'
                    ? 'قابلیت'
                    : name === 'quotas'
                      ? 'سهمیه'
                      : 'نوع'
                  : (fieldLabels[key] ?? key)}
                {field.enum ? (
                  <select {...form.register(p)}>
                    {field.enum.map((v) => (
                      <option key={v} value={v}>
                        {label(v)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={
                      field.type === 'boolean'
                        ? 'checkbox'
                        : field.type === 'number' || field.type === 'integer'
                          ? 'number'
                          : 'text'
                    }
                    {...form.register(p, {
                      setValueAs: (v) =>
                        (v == null || v === '') && field.nullable
                          ? null
                          : field.type === 'number' || field.type === 'integer'
                            ? Number(v)
                            : v,
                    })}
                  />
                )}
                {form.getFieldState(p, form.formState).error && (
                  <span className="field-error">
                    {form.getFieldState(p, form.formState).error?.message}
                  </span>
                )}
              </label>
            );
          })}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              const rows = form.getValues(name);
              if (Array.isArray(rows))
                form.setValue(
                  name,
                  rows.filter((_, i) => i !== index),
                );
              setKeys(keys.filter((_, i) => i !== index));
            }}
          >
            <Trash2 size={14} />
            حذف ردیف
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add}>
        <Plus size={14} />
        افزودن ردیف
      </Button>
    </div>
  );
}

const formLabels: Record<string, string> = {
  name: 'نام سازمان',
  organizationName: 'نام سازمان',
  reason: 'دلیل این اقدام',
  fromRole: 'نقش فعلی برای تغییر',
  toRole: 'نقش جدید',
  roleKey: 'کلید نقش از کاتالوگ',
  initialManagerUserId: 'شناسه حساب مدیر اولیه',
  subscriptionEndsAtUtc: 'پایان اشتراک',
  invitationExpiresAtUtc: 'انقضای دعوت',
  destinationUserId: 'شناسه حساب مقصد دعوت',
  learnerOrganizationPersonId: 'شناسه پرونده سازمانی فراگیر',
  teacherMembershipId: 'شناسه عضویت معلم',
  restrictedUntilUtc: 'پایان محدودیت',
  expectedRowVersion: 'نسخه پرونده',
  expectedPersonRowVersion: 'نسخه شخص',
  activateImmediately: 'فعال‌سازی فوری',
  startsAtUtc: 'شروع',
  endsAtUtc: 'پایان',
  enrollmentId: 'شناسه ثبت‌نام',
};
