import { renderOrganizationRoute } from '@/features/navigation/organization-route';
import { requireOwnerPage } from '@/lib/server/owner-page';
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  await requireOwnerPage();
  return renderOrganizationRoute((await params).section ?? []);
}
