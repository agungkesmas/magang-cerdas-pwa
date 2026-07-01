import { redirect } from 'next/navigation';
import { getInternToken } from '@/lib/auth';
import InternShell from '@/components/intern/InternShell';

export const dynamic = 'force-dynamic';

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const intern = await getInternToken();
  if (!intern) redirect('/intern/login');
  return <InternShell intern={intern}>{children}</InternShell>;
}
