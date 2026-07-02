import { redirect } from 'next/navigation';
import { getInternToken } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import InternShell from '@/components/intern/InternShell';

export const dynamic = 'force-dynamic';

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const intern = await getInternToken();
  if (!intern) return <>{children}</>;

  // Fetch fresh logbook_enabled flag (in case admin just toggled it)
  let logbookEnabled = true;
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('interns')
      .select('logbook_enabled')
      .eq('id', intern.intern_id)
      .single();
    if (data) logbookEnabled = data.logbook_enabled !== false;
  } catch {}

  return (
    <InternShell intern={{ name: intern.name, username: intern.username, logbookEnabled }}>
      {children}
    </InternShell>
  );
}
