import { redirect } from 'next/navigation';
import { getBKKToken } from '@/lib/auth';
import BKKShell from '@/components/bkk/BKKShell';

export const dynamic = 'force-dynamic';

// Daftar path yang TIDAK butuh auth BKK (login page sendiri)
// Layout ini wrap SEMUA /bkk/* routes, jadi perlu exclude login.
const PUBLIC_BKK_PATHS = ['/bkk/login'];

export default async function BKKLayout({ children }: { children: React.ReactNode }) {
  const teacher = await getBKKToken();

  // Kalau ada token valid → render dengan shell
  if (teacher) {
    return (
      <BKKShell teacher={{ name: teacher.name, schools: teacher.schools }}>
        {children}
      </BKKShell>
    );
  }

  // Tidak ada token valid → cek apakah ini login page
  // Kita tidak bisa akses pathname langsung di layout server component,
  // jadi selalu render children (login page punya layout-nya sendiri).
  // Untuk route protected, masing-masing page akan 401 via API call →
  // halaman jadi error state, user harus manual ke login.
  // Better UX: client component di setiap protected page handle redirect.
  // Untuk sekarang, biarkan login page render normal (anak layout ini).
  return <>{children}</>;
}
