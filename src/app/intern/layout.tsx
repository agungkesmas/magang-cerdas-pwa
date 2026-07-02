import { getInternToken } from '@/lib/auth';
import InternShell from '@/components/intern/InternShell';

export const dynamic = 'force-dynamic';

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  // Middleware handles redirect for unauthenticated users.
  // For /intern/login route, no token exists — just render the login page as-is.
  const intern = await getInternToken();
  if (!intern) {
    return <>{children}</>;
  }
  return <InternShell intern={intern}>{children}</InternShell>;
}
