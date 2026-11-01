import { renderAdminRoute } from '@/features/navigation/admin-route';
import { requireOwnerPage } from '@/lib/server/owner-page';
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  await requireOwnerPage();
  return renderAdminRoute((await params).section ?? []);
}
