// ============================================================
// /api/pembina/interns/[id]/bonus-eligible-activities
// Return daftar aktivitas peserta yang BISA dikasih Bonus XP
//   - Sudah completed (ada row di activity_completions)
//   - BUKAN quest (quest pakai sistem bonus terpisah di Chat Grup)
//   - BUKAN recurring (sudah punya bonus +50 EXP all-complete)
//   - Belum pernah dapat bonus (bonus_xp = 0 / null)
//
// Akses: Pembina (harus dari departemen sama dengan peserta, atau Lintas Bidang)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pembina = await getPembinaToken();
    if (!pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const internId = params.id;
    if (!internId) {
      return NextResponse.json({ error: 'Intern ID wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Fetch intern (untuk validasi departemen)
    const { data: intern, error: iErr } = await supabase
      .from('interns')
      .select('id, name, department, total_exp')
      .eq('id', internId)
      .maybeSingle();

    if (iErr || !intern) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
    }

    // 2. Validasi: pembina & peserta harus punya minimal 1 grup yang sama
    // (Cakupan: grup departemen, project, event, ATAU sistem "Diskusi Magang All")
    const { data: pembinaGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'pembina')
      .eq('user_id', pembina.pembina_id);
    const { data: internGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'peserta')
      .eq('user_id', internId);

    const pembinaGroupIds = new Set((pembinaGroups || []).map((g: any) => g.group_id));
    const hasSharedGroup = (internGroups || []).some((g: any) => pembinaGroupIds.has(g.group_id));

    if (!hasSharedGroup) {
      return NextResponse.json(
        { error: 'Anda tidak punya grup yang sama dengan peserta ini. Gabung grup yang sama (mis. "Diskusi Magang All") sebelum bisa kasih Bonus XP.' },
        { status: 403 }
      );
    }

    // 3. Fetch activity_completions dengan filter eligible
    const { data: completions, error: cErr } = await supabase
      .from('activity_completions')
      .select(`
        id,
        activity_id,
        completed_at,
        completion_notes,
        bonus_xp,
        activities!inner(
          id, title, description, department, due_date,
          is_quest, is_recurring, is_active,
          created_by_intern, xp_reward
        )
      `)
      .eq('intern_id', internId)
      .order('completed_at', { ascending: false })
      .limit(50);

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    // 4. Filter eligible: BUKAN quest, BUKAN recurring, bonus_xp = 0 / null
    const eligible = (completions || []).filter((c: any) => {
      const act = c.activities;
      if (!act) return false;
      if (act.is_quest) return false;
      if (act.is_recurring) return false;
      if (c.bonus_xp && c.bonus_xp > 0) return false;
      return true;
    }).map((c: any) => {
      const act = c.activities;
      return {
        completion_id: c.id,
        activity_id: c.activity_id,
        title: act.title,
        description: act.description,
        completed_at: c.completed_at,
        xp_reward: act.xp_reward || 20,
        is_self_added: act.created_by_intern === true,
        department: act.department,
        completion_notes: c.completion_notes
      };
    });

    return NextResponse.json({
      success: true,
      intern: {
        id: intern.id,
        name: intern.name,
        department: intern.department,
        total_exp: intern.total_exp
      },
      eligible_activities: eligible,
      count: eligible.length
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
