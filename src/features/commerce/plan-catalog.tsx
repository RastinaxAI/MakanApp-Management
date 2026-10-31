'use client';
import { ListView } from '@/components/ui/list-view';
export function PlanCatalog() {
  return (
    <ListView
      title="کاتالوگ پلن‌ها"
      endpoint="/api/admin/v1/commerce/plans"
      columns={[
        {
          key: 'displayName',
          title: 'نام پلن',
          sub: 'code',
          link: (row) => '/admin/commerce/' + row.planId,
        },
        { key: 'audience', title: 'مخاطب' },
        { key: 'catalogVisible', title: 'نمایش در کاتالوگ' },
        { key: 'newPurchaseAvailable', title: 'فروش جدید' },
        { key: 'renewalAvailable', title: 'تمدید' },
        { key: 'versionCount', title: 'نسخه‌ها' },
        { key: 'latestPublishedVersion', title: 'آخرین نسخه منتشرشده' },
        { key: 'createdAtUtc', title: 'تاریخ ایجاد' },
      ]}
    />
  );
}
