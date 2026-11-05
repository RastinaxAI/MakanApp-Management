'use client';
import { useEffect, useState } from 'react';
import { useApi } from '@/lib/api/hooks';
import { canReceivePlatformGrant, type PlatformMembership } from '@/lib/personal-class-policy';
import { ErrorState, label } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { number } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';

export function MembershipPicker({
  classId,
  value,
  onChange,
  disabled,
}: {
  classId: string;
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({
    role: 'Manager',
    activeOnly: 'true',
    page: String(page),
    pageSize: '10',
  });
  if (term) params.set('search', term);
  const q = useApi<components['schemas']['PersonalClassPageOfPlatformPersonalClassMembershipDto']>(
    `/api/admin/v1/personal-classes/${classId}/memberships?${params}`,
  );
  return (
    <fieldset disabled={disabled} className="form-grid">
      <legend>انتخاب مدیر کلاس</legend>
      <label>
        جست‌وجوی مدیر
        <input
          aria-label="جست‌وجوی مدیر کلاس"
          maxLength={100}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="نام یا نام کاربری"
        />
      </label>
      <p className="field-help">
        مجوز پایه فقط به مدیر فعال داده می‌شود؛ معلم اختیار خود را از مدیر دریافت می‌کند.
      </p>
      {q.isPending ? (
        <p role="status">در حال دریافت مدیران کلاس…</p>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {!q.data.items.length && <p role="status">مدیر فعالی با این جست‌وجو پیدا نشد.</p>}
          {q.data.items.map((member: PlatformMembership) => (
            <label className="feature-row" key={member.membershipId}>
              <span>
                <strong>{member.displayName}</strong>
                <small className="field-help block">
                  {member.username ? member.username + ' · ' : ''}
                  {label(member.localRoles)}
                </small>
              </span>
              <input
                type="radio"
                name="academic-manager"
                aria-label={'انتخاب ' + member.displayName}
                disabled={!canReceivePlatformGrant(member, classId)}
                checked={value === member.membershipId}
                onChange={() => onChange(member.membershipId)}
              />
            </label>
          ))}
          <div className="entity-pagination">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 1 || q.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              قبلی
            </Button>
            <span>
              صفحه {number(page)} · {number(q.data.totalCount)} عضو
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page * q.data.pageSize >= q.data.totalCount || q.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              بعدی
            </Button>
          </div>
        </>
      )}
    </fieldset>
  );
}
