'use client';
import {
  useEffect,
  useRef,
  useState,
  useId,
  cloneElement,
  isValidElement,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { usePersonal } from '../provider';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import s from './school.module.css';
export const base = '/personal/education';
export function SchoolHeading({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  back?: boolean;
}) {
  return (
    <div className={s.heading}>
      {back && (
        <Link className={s.back} href={base + '/classes'}>
          <ArrowRight size={18} />
          کلاس‌ها
        </Link>
      )}
      <div>
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
export function Card({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={s.card}>
      {title && (
        <div className={s.cardHeading}>
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Status({ children }: { children: ReactNode }) {
  return <span className={s.status}>{children}</span>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      {isValidElement<{ id?: string }>(children) ? cloneElement(children, { id }) : children}
    </div>
  );
}
export function FormDialog({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{title}</Button>
      </DialogTrigger>
      <DialogContent title={title} className={s.formDialog}>
        <div className={s.form}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
export function useSchoolAction() {
  const { call, session } = usePersonal(),
    cache = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [success, setSuccess] = useState('');
  const pending = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function run<T>(path: string, body?: unknown, method = 'POST'): Promise<T | undefined> {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    setSuccess('');
    try {
      const result = await call<T>(path, {
        method,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (!alive.current) return;
      setSuccess('تغییرات ثبت شد.');
      void cache.invalidateQueries({ queryKey: ['personal', session.user.id, session.revision] });
      return result;
    } catch (e) {
      if (alive.current && !(e instanceof Error && e.name === 'AbortError')) setError(e);
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return {
    run,
    busy,
    error,
    feedback: (
      <>
        {!!error && <ErrorState error={error} />}
        {success && (
          <p className={s.success} role="status">
            <CheckCircle2 size={18} />
            {success}
          </p>
        )}
      </>
    ),
  };
}
export function Pager({
  page,
  total,
  onChange,
  size = 30,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
  size?: number;
}) {
  return (
    <div className={s.pager}>
      <Button
        variant="outline"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="صفحهٔ قبل"
      >
        <ChevronRight size={18} />
      </Button>
      <span>
        صفحهٔ {new Intl.NumberFormat('fa-IR').format(page)} ·{' '}
        {new Intl.NumberFormat('fa-IR').format(total)} مورد
      </span>
      <Button
        variant="outline"
        disabled={page * size >= total}
        onClick={() => onChange(page + 1)}
        aria-label="صفحهٔ بعد"
      >
        <ChevronLeft size={18} />
      </Button>
    </div>
  );
}
export function toUtc(value: string) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) throw new Error('زمان معتبر وارد کنید.');
  return date.toISOString();
}
export { safeMeetingUrl } from './policy';
