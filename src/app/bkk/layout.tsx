import { redirect } from 'next/navigation';
import { getBKKToken } from '@/lib/auth';
import BKKShell from '@/components/bkk/BKKShell';
import SecurityWrapper from '@/components/shared/SecurityWrapper';

export const dynamic = 'force-dynamic';

export default async function BKKLayout({ children }: { children: React.ReactNode }) {
  const teacher = await getBKKToken();
  if (!teacher) return <>{children}</>;
  return (
    <SecurityWrapper>
      <BKKShell teacher={{ name: teacher.name, schools: teacher.schools }}>
        {children}
      </BKKShell>
    </SecurityWrapper>
  );
}
