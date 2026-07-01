import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Admin Login — MAGANG-CERDAS' };

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bpjs-blue">{children}</div>;
}
