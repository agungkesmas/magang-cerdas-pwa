import { redirect } from 'next/navigation';
import { getPembinaToken } from '@/lib/auth';
import PembinaShell from '@/components/pembina/PembinaShell';

export const dynamic = 'force-dynamic';

export default async function PembinaLayout({ children }: { children: React.ReactNode }) {
  const pembina = await getPembinaToken();
  if (!pembina) {
    return <>{children}</>;
  }
  return (
    <PembinaShell pembina={{ name: pembina.name, pembina_code: pembina.pembina_code, department: pembina.department }}>
      {children}
    </PembinaShell>
  );
}
