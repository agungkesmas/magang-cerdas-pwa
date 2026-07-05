import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Magang Login — MAGANG-CERDAS' };

export default function InternLoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-agent-bg">{children}</div>;
}
