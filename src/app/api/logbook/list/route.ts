// ============================================================
// /api/logbook/list — List logbook entries (own or by intern)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getInternToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const intern = await getInternToken();
    if (!admin && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const internIdParam = searchParams.get('intern_id');

    const supabase = createServerClient();
    let query = supabase
      .from('Logbook')
      .select('*')
      .order('entry_date', { ascending: false });

    if (admin && internIdParam) {
      query = query.eq('intern_id', internIdParam);
    } else if (intern && !admin) {
      query = query.eq('intern_id', intern.intern_id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, logbook: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
