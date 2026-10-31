'use client';
import { useEffect, useState } from 'react';
import { Search, ArrowUpLeft } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/states';
import Link from '@/components/ui/app-link';
import { useApi } from '@/lib/api/hooks';
import { useAccess } from '@/features/access-context/provider';
import type { components } from '@/generated/api/schema';
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const { can } = useAccess();
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setTerm(input.trim()), 250);
    return () => clearTimeout(t);
  }, [input]);
  const orgs = useApi<components['schemas']['PlatformOrganizationPage']>(
    '/api/admin/v1/organizations?search=' + encodeURIComponent(term) + '&page=1&pageSize=5',
    open && term.length >= 2,
  );
  const users = useApi<components['schemas']['PlatformUserPage']>(
    '/api/admin/v1/users?search=' + encodeURIComponent(term) + '&page=1&pageSize=5',
    open && term.length >= 2,
  );
  if (!can('/api/admin/v1/organizations') && !can('/api/admin/v1/users')) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        className="global-search-trigger"
        onClick={() => setOpen(true)}
        aria-label="جست‌وجوی سازمان یا کاربر"
      >
        <Search size={18} />
        <span>جست‌وجوی سازمان یا کاربر</span>
        <kbd dir="ltr">Ctrl K</kbd>
      </button>
      {open && (
        <DialogContent
          title="پیدا کردن سازمان یا کاربر"
          description="نام یا شماره قابل جست‌وجو را وارد کنید؛ نتایج بر اساس مجوز حساب نمایش داده می‌شوند."
        >
          <div className="entity-search">
            <Search size={18} />
            <input
              aria-label="عبارت جست‌وجوی سراسری"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="حداقل دو حرف بنویسید…"
            />
          </div>
          {term.length >= 2 && (
            <div className="global-search-results">
              {can('/api/admin/v1/organizations') && (
                <section>
                  <h3>سازمان‌ها</h3>
                  {orgs.isPending ? (
                    <p role="status">در حال جست‌وجو…</p>
                  ) : orgs.isError ? (
                    <ErrorState error={orgs.error} onRetry={() => void orgs.refetch()} />
                  ) : orgs.data?.items.length ? (
                    orgs.data.items.map((o) => (
                      <Link
                        key={o.id}
                        className="search-result"
                        href={'/admin/organizations/' + o.id}
                        onClick={() => setOpen(false)}
                      >
                        <span>{o.name}</span>
                        <ArrowUpLeft size={15} />
                      </Link>
                    ))
                  ) : (
                    <p className="field-help">سازمانی پیدا نشد.</p>
                  )}
                </section>
              )}
              {can('/api/admin/v1/users') && (
                <section>
                  <h3>کاربران</h3>
                  {users.isPending ? (
                    <p role="status">در حال جست‌وجو…</p>
                  ) : users.isError ? (
                    <ErrorState error={users.error} onRetry={() => void users.refetch()} />
                  ) : users.data?.items.length ? (
                    users.data.items.map((u) => (
                      <Link
                        key={u.userId}
                        className="search-result"
                        href={'/admin/users/' + u.userId}
                        onClick={() => setOpen(false)}
                      >
                        <span>
                          {u.displayName}
                          <small dir="ltr">{u.maskedPhone}</small>
                        </span>
                        <ArrowUpLeft size={15} />
                      </Link>
                    ))
                  ) : (
                    <p className="field-help">کاربری پیدا نشد.</p>
                  )}
                </section>
              )}
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
