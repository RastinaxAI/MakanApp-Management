'use client';
import dynamic from 'next/dynamic';
import { LoadingSkeleton } from '@/components/ui/states';

const Dashboard = dynamic(() => import('@/features/overview/dashboard').then((m) => m.Dashboard), {
  loading: () => <LoadingSkeleton />,
});
const PersonalClassesPage = dynamic(
  () => import('@/features/personal-classes/pages').then((m) => m.PersonalClassesPage),
  { loading: () => <LoadingSkeleton /> },
);
const PersonalClassRequestDetail = dynamic(
  () => import('@/features/personal-classes/pages').then((m) => m.PersonalClassRequestDetail),
  { loading: () => <LoadingSkeleton /> },
);
const PersonalClassDetail = dynamic(
  () => import('@/features/personal-classes/pages').then((m) => m.PersonalClassDetail),
  { loading: () => <LoadingSkeleton /> },
);
const OrganizationsPage = dynamic(
  () => import('@/features/organizations/pages').then((m) => m.OrganizationsPage),
  { loading: () => <LoadingSkeleton /> },
);
const OrganizationDetail = dynamic(
  () => import('@/features/organizations/pages').then((m) => m.OrganizationDetail),
  { loading: () => <LoadingSkeleton /> },
);
const UsersPage = dynamic(() => import('@/features/users/pages').then((m) => m.UsersPage), {
  loading: () => <LoadingSkeleton />,
});
const UserDetail = dynamic(() => import('@/features/users/pages').then((m) => m.UserDetail), {
  loading: () => <LoadingSkeleton />,
});
const EducationPage = dynamic(
  () => import('@/features/education/pages').then((m) => m.EducationPage),
  { loading: () => <LoadingSkeleton /> },
);
const ClassDetail = dynamic(() => import('@/features/education/pages').then((m) => m.ClassDetail), {
  loading: () => <LoadingSkeleton />,
});
const LibraryPage = dynamic(() => import('@/features/library/pages').then((m) => m.LibraryPage), {
  loading: () => <LoadingSkeleton />,
});
const LibraryDetail = dynamic(
  () => import('@/features/library/pages').then((m) => m.LibraryDetail),
  {
    loading: () => <LoadingSkeleton />,
  },
);
const RolesPage = dynamic(() => import('@/features/iam/pages').then((m) => m.RolesPage), {
  loading: () => <LoadingSkeleton />,
});
const AccountPage = dynamic(() => import('@/features/iam/pages').then((m) => m.AccountPage), {
  loading: () => <LoadingSkeleton />,
});
const CommercePage = dynamic(
  () => import('@/features/commerce/pages').then((m) => m.CommercePage),
  { loading: () => <LoadingSkeleton /> },
);
const PlanDetail = dynamic(() => import('@/features/commerce/pages').then((m) => m.PlanDetail), {
  loading: () => <LoadingSkeleton />,
});
const FinancePage = dynamic(() => import('@/features/commerce/pages').then((m) => m.FinancePage), {
  loading: () => <LoadingSkeleton />,
});
const OrderDetail = dynamic(() => import('@/features/commerce/pages').then((m) => m.OrderDetail), {
  loading: () => <LoadingSkeleton />,
});
const OperationsPage = dynamic(
  () => import('@/features/operations/pages').then((m) => m.OperationsPage),
  { loading: () => <LoadingSkeleton /> },
);
const AuditPage = dynamic(() => import('@/features/operations/pages').then((m) => m.AuditPage), {
  loading: () => <LoadingSkeleton />,
});
const MessagingPage = dynamic(
  () => import('@/features/operations/pages').then((m) => m.MessagingPage),
  { loading: () => <LoadingSkeleton /> },
);
const ModerationPage = dynamic(
  () => import('@/features/moderation/pages').then((m) => m.ModerationPage),
  { loading: () => <LoadingSkeleton /> },
);
const ModerationDetail = dynamic(
  () => import('@/features/moderation/pages').then((m) => m.ModerationDetail),
  { loading: () => <LoadingSkeleton /> },
);

export function AdminView({ section, id }: { section: string; id?: string }) {
  if (id) {
    switch (section) {
      case 'personal-class-requests':
        return <PersonalClassRequestDetail id={id} />;
      case 'personal-classes':
        return <PersonalClassDetail id={id} />;
      case 'library':
        return <LibraryDetail id={id} />;
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
    }
  }
  switch (section) {
    case 'personal-classes':
    case 'personal-class-requests':
      return <PersonalClassesPage />;
    case 'library':
      return <LibraryPage />;
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
      return <Dashboard />;
  }
}
