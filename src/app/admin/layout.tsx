import { redirect } from 'next/navigation';
import { getAdminToken } from '@/lib/auth';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminToken();
  if (!admin) redirect('/admin/login');

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
