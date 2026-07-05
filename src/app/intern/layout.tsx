import { getInternToken } from '@/lib/auth';
import InternShell from '@/components/intern/InternShell';
import SecurityWrapper from '@/components/shared/SecurityWrapper';

export const dynamic = 'force-dynamic';

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const intern = await getInternToken();
  if (!intern) return <>{children}</>;

  return (
    <SecurityWrapper>
      <InternShell intern={{ name: intern.name, username: intern.username }}>
        {children}
      </InternShell>
    </SecurityWrapper>
  );
}
