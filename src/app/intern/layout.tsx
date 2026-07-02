import { redirect } from 'next/navigation';
import { getInternToken } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import InternShell from '@/components/intern/InternShell';

export const dynamic = 'force-dynamic';

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const intern = await getInternToken();
  if (!intern) return <>{children}</>;

  // Fetch logbook_enabled dari schools (bukan interns) — toggle sekarang per-institusi
  let logbookEnabled = true;
  try {
    const supabase = createServerClient();
    const { data: internData } = await supabase
      .from('interns')
      .select('school_origin')
      .eq('id', intern.intern_id)
      .single();

    if (internData?.school_origin) {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('logbook_enabled')
        .eq('name', internData.school_origin)
        .maybeSingle();
      if (schoolData) logbookEnabled = schoolData.logbook_enabled !== false;
    }
  } catch {}

  return (
    <InternShell intern={{ name: intern.name, username: intern.username, logbookEnabled }}>
      {children}
    </InternShell>
  );
}
