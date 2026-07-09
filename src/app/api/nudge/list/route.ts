// ============================================================
// /api/nudge/list — List nudges (admin: by intern_id, intern: own, bkk/pembina: own sent)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getInternToken, getBKKToken, getPembinaToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const intern = await getInternToken();
    const bkk = await getBKKToken();
    const pembina = await getPembinaToken();
    if (!admin && !intern && !bkk && !pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const internIdParam = searchParams.get('intern_id');
    // BKK/Pembina: optional filter to see their own sent nudges
    const sentOnly = searchParams.get('sent_only') === 'true';

    const supabase = createServerClient();
    let query = supabase.from('nudges').select('*').order('created_at', { ascending: false }).limit(50);

    if (admin && internIdParam) {
      // Admin lihat nudge untuk intern tertentu
      query = query.eq('intern_id', internIdParam);
    } else if (admin && !internIdParam) {
      // Admin lihat semua nudge (default 50 terbaru)
    } else if (bkk) {
      // P1-6: BKK lihat nudge yang DIA kirim (audit trail sendiri)
      query = query.eq('created_by_type', 'bkk').eq('created_by_id', bkk.teacher_id);
    } else if (pembina) {
      // P1-6: Pembina lihat nudge yang DIA kirim
      query = query.eq('created_by_type', 'pembina').eq('created_by_id', pembina.pembina_id);
    } else if (intern && !admin) {
      // Intern lihat nudge yang ditujukan ke dia
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
