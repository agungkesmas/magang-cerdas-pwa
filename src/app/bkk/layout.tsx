import { redirect } from 'next/navigation';
import { getBKKToken } from '@/lib/auth';
import BKKShell from '@/components/bkk/BKKShell';

export const dynamic = 'force-dynamic';

export default async function BKKLayout({ children }: { children: React.ReactNode }) {
  const teacher = await getBKKToken();
  if (!teacher) return <>{children}</>;
  return <BKKShell teacher={teacher}>{children}</BKKShell>;
}
