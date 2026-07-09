import { getPembinaToken } from '@/lib/auth';
import PembinaShell from '@/components/pembina/PembinaShell';

export const dynamic = 'force-dynamic';

export default async function PembinaLayout({ children }: { children: React.ReactNode }) {
  const pembina = await getPembinaToken();
  // Kalau ada token valid → render dengan shell
  if (pembina) {
    return (
      <PembinaShell pembina={{ name: pembina.name, pembina_code: pembina.pembina_code, department: pembina.department }}>
        {children}
      </PembinaShell>
    );
  }
  // Tidak ada token valid → render children tanpa shell
  // Login page punya layout sendiri yang akan handle-nya
  return <>{children}</>;
}
