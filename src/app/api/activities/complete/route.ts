// ============================================================
// /api/activities/complete — Intern tandai aktivitas selesai
// +20 EXP per aktivitas
// Anti-exploit: cek apakah sudah completed sebelumnya
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

const EXP_REWARD = 20;

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { activity_id } = await req.json();
    if (!activity_id) return NextResponse.json({ error: 'activity_id wajib diisi' }, { status: 400 });

    const supabase = createServerClient();

    // 1. Fetch activity
    const { data: activity, error: aErr } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activity_id)
      .single();
    if (aErr || !activity) {
      return NextResponse.json({ error: 'Aktivitas tidak ditemukan' }, { status: 404 });
    }
    if (!activity.is_active) {
      return NextResponse.json({ error: 'Aktivitas sudah tidak aktif' }, { status: 400 });
    }
    if (activity.due_date && new Date(activity.due_date).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Aktivitas sudah lewat deadline' }, { status: 400 });
    }

    // 2. Verify access: per-intern (intern_id match) ATAU per-departemen (department match)
    let hasAccess = false;
    if (activity.intern_id) {
      hasAccess = activity.intern_id === intern.intern_id;
    } else {
      const { data: internData } = await supabase
        .from('interns')
        .select('department')
        .eq('id', intern.intern_id)
        .single();
      hasAccess = internData?.department === activity.department;
    }
    if (!hasAccess) {
      return NextResponse.json({ error: 'Anda tidak punya akses ke aktivitas ini' }, { status: 403 });
    }

    // 3. Anti-exploit: cek apakah sudah completed
    if (activity.intern_id) {
      // Mode per-intern: cek completed_by_intern_id
      if (activity.completed_by_intern_id === intern.intern_id) {
        return NextResponse.json({ error: 'Anda sudah menyelesaikan aktivitas ini' }, { status: 409 });
      }
    } else {
      // Mode per-departemen: cek activity_completions
      const { data: existing } = await supabase
        .from('activity_completions')
        .select('id')
        .eq('activity_id', activity_id)
        .eq('intern_id', intern.intern_id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'Anda sudah menyelesaikan aktivitas ini' }, { status: 409 });
      }
    }

    // 4. Mark as completed
    if (activity.intern_id) {
      // Mode per-intern: update completed_by_intern_id di activities
      const { error: uErr } = await supabase
        .from('activities')
        .update({
          completed_by_intern_id: intern.intern_id,
          completed_at: new Date().toISOString()
        })
        .eq('id', activity_id);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    } else {
      // Mode per-departemen: insert ke activity_completions
      const { error: iErr } = await supabase.from('activity_completions').insert({
        activity_id,
        intern_id: intern.intern_id
      });
      if (iErr) {
        if (iErr.code === '23505') {
          return NextResponse.json({ error: 'Anda sudah menyelesaikan aktivitas ini' }, { status: 409 });
        }
        return NextResponse.json({ error: iErr.message }, { status: 500 });
      }
    }

    // 5. Grant EXP
    const { data: internData } = await supabase
      .from('interns')
      .select('total_exp')
      .eq('id', intern.intern_id)
      .single();
    const newTotalExp = (internData?.total_exp || 0) + EXP_REWARD;
    await supabase.from('interns').update({ total_exp: newTotalExp }).eq('id', intern.intern_id);

    return NextResponse.json({
      success: true,
      exp_gained: EXP_REWARD,
      new_total_exp: newTotalExp
    });
  } catch (e: any) {
    console.error('[activities/complete] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
