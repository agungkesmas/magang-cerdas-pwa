import { redirect } from 'next/navigation';
import { getPembinaToken } from '@/lib/auth';
import PembinaShell from '@/components/pembina/PembinaShell';

export const dynamic = 'force-dynamic';

export default async function PembinaLayout({ children }: { children: React.ReactNode }) {
  const pembina = await getPembinaToken();
  // P2-13: kalau token invalid/expired/pembina archived → redirect ke login
  if (!pembina) {
    redirect('/pembina/login');
  }
  return (
    <PembinaShell pembina={{ name: pembina.name, pembina_code: pembina.pembina_code, department: pembina.department }}>
      {children}
    </PembinaShell>
  );
}
