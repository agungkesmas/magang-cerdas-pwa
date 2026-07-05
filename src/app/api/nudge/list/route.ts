// ============================================================
// /api/nudge/list — List nudges (admin: by intern_id, intern: own)
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
    let query = supabase.from('nudges').select('*').order('created_at', { ascending: false }).limit(50);

    if (admin && internIdParam) {
      query = query.eq('intern_id', internIdParam);
    } else if (intern && !admin) {
      query = query.eq('intern_id', intern.intern_id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, nudges: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Mark as read
export async function PUT(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nudge_id } = await req.json();
    if (!nudge_id) {
      return NextResponse.json({ error: 'nudge_id wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('nudges')
      .update({ is_read: true })
      .eq('id', nudge_id)
      .eq('intern_id', intern.intern_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
