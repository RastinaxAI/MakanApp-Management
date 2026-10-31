import type { components } from '@/generated/api/schema';
type Item = components['schemas']['PlatformProvisioningItem'];
export function provisioningStages(item: Item) {
  return [
    {
      title: 'ایجاد سازمان',
      done: !!item.organizationId,
      detail: item.organizationId ? 'سازمان ثبت شده است.' : 'ثبت سازمان هنوز تأیید نشده است.',
    },
    {
      title: 'تخصیص اشتراک',
      done: !!item.subscriptionId,
      detail: item.subscriptionId
        ? 'اشتراک تخصیص یافته؛ وضعیت اعتبار در پرونده سازمان بررسی شود.'
        : item.planVersionId
          ? 'تخصیص اشتراک هنوز تأیید نشده است.'
          : 'پلنی برای این درخواست انتخاب نشده است.',
    },
    {
      title: 'ایجاد دعوت مدیر',
      done: !!item.managerInvitationId,
      detail: item.managerInvitationId
        ? 'دعوت ایجاد شده؛ پذیرش مدیر هنوز از این پاسخ مشخص نیست.'
        : item.initialManagerUserId
          ? 'ایجاد دعوت هنوز تأیید نشده است.'
          : 'مدیر اولیه انتخاب نشده است.',
    },
  ];
}
export function subscriptionReady(
  subscription: components['schemas']['PlatformSubscriptionSummary'],
  now = Date.now(),
) {
  return (
    !!subscription &&
    subscription.status === 'Active' &&
    Date.parse(subscription.startsAtUtc) <= now &&
    (subscription.endsAtUtc === null || Date.parse(subscription.endsAtUtc) > now)
  );
}
