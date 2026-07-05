import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'BKK Login — MAGANG-CERDAS' };

export default function BKKLoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bpjs-green">{children}</div>;
}
