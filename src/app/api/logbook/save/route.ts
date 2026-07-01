// ============================================================
// /api/logbook/save — Save daily logbook entry
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { EXP_REWARDS, formatDateShort } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entry_date, activity, learning_summary, difficulties } = await req.json();
    if (!entry_date || !activity) {
      return NextResponse.json({ error: 'entry_date dan activity wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Upsert (one entry per intern per date)
    const { data: existing } = await supabase
      .from('Logbook')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('entry_date', entry_date)
      .maybeSingle();

    let expGained = 0;
    if (existing) {
      const { data, error } = await supabase
        .from('Logbook')
        .update({
          activity,
          learning_summary: learning_summary || null,
          difficulties: difficulties || null
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, logbook: data, exp_gained: 0, updated: true });
    } else {
      const { data, error } = await supabase
        .from('Logbook')
        .insert({
          intern_id: intern.intern_id,
          entry_date,
          activity,
          learning_summary: learning_summary || null,
          difficulties: difficulties || null
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Grant EXP for new entry
      expGained = EXP_REWARDS.LOGBOOK_ENTRY;
      const { data: internData } = await supabase
        .from('Interns')
        .select('total_exp')
        .eq('id', intern.intern_id)
        .single();
      if (internData) {
        await supabase
          .from('Interns')
          .update({ total_exp: (internData.total_exp || 0) + expGained })
          .eq('id', intern.intern_id);
      }

      return NextResponse.json({
        success: true,
        logbook: data,
        exp_gained: expGained,
        new_total_exp: (internData?.total_exp || 0) + expGained
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
