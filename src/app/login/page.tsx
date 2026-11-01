import { LoginForm } from '@/features/auth/login';
import { connection } from 'next/server';
import { serverConfig } from '@/lib/server/config';
import { ownerPolicyConfigured } from '@/lib/owner-policy';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { canonicalLocalLoginUrl } from '@/lib/login-origin';

export default async function Page() {
  await connection();
  const config = serverConfig();
  const canonical = canonicalLocalLoginUrl((await headers()).get('host'), config.origin);
  if (canonical) redirect(canonical);
  return (
    <LoginForm
      accessTesting={
        config.allowUnconfiguredOwnerOtp && !ownerPolicyConfigured(config.ownerRoleKeys)
      }
    />
  );
}
