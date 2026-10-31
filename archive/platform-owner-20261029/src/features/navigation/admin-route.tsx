import { notFound } from 'next/navigation';
import { Dashboard } from '@/features/overview/dashboard';
import { OrganizationsPage, OrganizationDetail } from '@/features/organizations/pages';
import { UsersPage, UserDetail } from '@/features/users/pages';
import { EducationPage, ClassDetail } from '@/features/education/pages';
import { RolesPage, AccountPage } from '@/features/iam/pages';
import { CommercePage, PlanDetail, FinancePage, OrderDetail } from '@/features/commerce/pages';
import { OperationsPage, AuditPage, MessagingPage } from '@/features/operations/pages';
import { ModerationPage, ModerationDetail } from '@/features/moderation/pages';
export function renderAdminRoute(sections: string[]) {
  const [page, id] = sections;
  if (sections.length > 2) notFound();
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    switch (page) {
      case 'organizations':
        return <OrganizationDetail id={id} />;
      case 'users':
        return <UserDetail id={id} />;
      case 'education':
        return <ClassDetail id={id} />;
      case 'commerce':
        return <PlanDetail id={id} />;
      case 'finance':
        return <OrderDetail id={id} />;
      case 'moderation':
        return <ModerationDetail id={id} />;
      default:
        notFound();
    }
  }
  switch (page) {
    case undefined:
      return <Dashboard />;
    case 'organizations':
      return <OrganizationsPage />;
    case 'users':
      return <UsersPage />;
    case 'education':
      return <EducationPage />;
    case 'roles':
      return <RolesPage />;
    case 'account':
      return <AccountPage />;
    case 'commerce':
      return <CommercePage />;
    case 'finance':
      return <FinancePage />;
    case 'operations':
      return <OperationsPage />;
    case 'audit':
      return <AuditPage />;
    case 'messaging':
      return <MessagingPage />;
    case 'moderation':
      return <ModerationPage />;
    default:
      notFound();
  }
}
