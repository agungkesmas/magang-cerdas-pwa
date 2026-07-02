import { getAdminToken } from '@/lib/auth';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware handles redirect for unauthenticated users.
  // For /admin/login route, no token exists — just render the login page as-is.
  const admin = await getAdminToken();
  if (!admin) {
    return <>{children}</>;
  }
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
