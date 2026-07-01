// ============================================================
// /api/survival-kit/progress — Get/set Survival Kit module progress
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { EXP_REWARDS } from '@/lib/utils';

export async function GET() {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data } = await supabase
      .from('Interns')
      .select('survival_kit_progress')
      .eq('id', intern.intern_id)
      .single();

    return NextResponse.json({ success: true, progress: data?.survival_kit_progress || {} });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { module_id, status, quiz_passed } = await req.json();
    if (!module_id) {
      return NextResponse.json({ error: 'module_id wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: internData } = await supabase
      .from('Interns')
      .select('survival_kit_progress')
      .eq('id', intern.intern_id)
      .single();

    const progress = (internData?.survival_kit_progress as Record<string, any>) || {};
    const wasPassed = progress[module_id]?.quiz_passed;
    progress[module_id] = {
      status: status || 'in_progress',
      quiz_passed: quiz_passed || false,
      last_updated: new Date().toISOString()
    };

    await supabase
      .from('Interns')
      .update({ survival_kit_progress: progress })
      .eq('id', intern.intern_id);

    // Grant EXP for quiz pass (only first time)
    let expGained = 0;
    if (quiz_passed && !wasPassed) {
      expGained = EXP_REWARDS.SURVIVAL_KIT_QUIZ_PASS;
      const { data: i2 } = await supabase
        .from('Interns')
        .select('total_exp')
        .eq('id', intern.intern_id)
        .single();
      await supabase
        .from('Interns')
        .update({ total_exp: (i2?.total_exp || 0) + expGained })
        .eq('id', intern.intern_id);
    }

    return NextResponse.json({ success: true, progress, exp_gained: expGained });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
