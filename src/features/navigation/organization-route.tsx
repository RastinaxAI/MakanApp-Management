import { notFound } from 'next/navigation';
import {
  OrganizationGate,
  OrganizationDashboard,
  PeoplePage,
  PersonDetail,
  GuardiansPage,
  GuardianDetail,
  OrganizationClasses,
  OrganizationClassDetail,
  ReportsPage,
} from '@/features/organization/pages';
import { SchedulePage, SessionDetail } from '@/features/organization/sessions';
export function renderOrganizationRoute(sections: string[]) {
  const [page, id] = sections;
  if (sections.length > 2) notFound();
  let content: React.ReactNode;
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    switch (page) {
      case 'people':
        content = <PersonDetail id={id} />;
        break;
      case 'guardians':
        content = <GuardianDetail id={id} />;
        break;
      case 'classes':
        content = <OrganizationClassDetail id={id} />;
        break;
      case 'sessions':
        content = <SessionDetail id={id} />;
        break;
      default:
        notFound();
    }
  } else
    switch (page) {
      case undefined:
        content = <OrganizationDashboard />;
        break;
      case 'people':
        content = <PeoplePage />;
        break;
      case 'guardians':
        content = <GuardiansPage />;
        break;
      case 'classes':
        content = <OrganizationClasses />;
        break;
      case 'schedule':
        content = <SchedulePage />;
        break;
      case 'reports':
        content = <ReportsPage />;
        break;
      default:
        notFound();
    }
  return <OrganizationGate>{content}</OrganizationGate>;
}
