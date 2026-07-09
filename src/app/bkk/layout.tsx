import { redirect } from 'next/navigation';
import { getBKKToken } from '@/lib/auth';
import BKKShell from '@/components/bkk/BKKShell';

export const dynamic = 'force-dynamic';

export default async function BKKLayout({ children }: { children: React.ReactNode }) {
  const teacher = await getBKKToken();
  // P2-13: kalau token invalid/expired/BKK archived → redirect ke login
  // (sebelumnya render children tanpa shell → UX buruk, page jadi blank/error)
  if (!teacher) {
    redirect('/bkk/login');
  }
  return (
    <BKKShell teacher={{ name: teacher.name, schools: teacher.schools }}>
      {children}
    </BKKShell>
  );
}
