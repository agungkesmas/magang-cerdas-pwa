import { getInternToken } from '@/lib/auth';
import InternShell from '@/components/intern/InternShell';

export const dynamic = 'force-dynamic';

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const intern = await getInternToken();
  if (!intern) return <>{children}</>;

  return (
    <InternShell intern={{ name: intern.name, username: intern.username }}>
      {children}
    </InternShell>
  );
}
