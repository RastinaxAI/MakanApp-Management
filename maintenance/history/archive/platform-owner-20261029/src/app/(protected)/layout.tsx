import { requireOwnerPage } from '@/lib/server/owner-page';
import { AccessProvider } from '@/features/access-context/provider';
import { Shell } from '@/components/layout/shell';
export const dynamic = 'force-dynamic';
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireOwnerPage();
  return (
    <AccessProvider>
      <Shell>{children}</Shell>
    </AccessProvider>
  );
}
