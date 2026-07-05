// ============================================================
// /api/pembina/assign-task — Pembina assign tugas individual ke peserta
// Reuse activities table with:
//   - intern_id = target peserta
//   - created_by_intern = false
//   - source = 'pembina'
//   - xp_reward: 10/20/30/50 (default 20)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const pembina = await getPembinaToken();
    if (!pembina) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { intern_id, title, description, xp_reward, deadline_date, deadline_hour } = await req.json();

    if (!intern_id) return NextResponse.json({ error: 'Pilih peserta magang' }, { status: 400 });
    if (!title?.trim()) return NextResponse.json({ error: 'Judul tugas wajib diisi' }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: 'Deskripsi wajib diisi' }, { status: 400 });

    const xp = parseInt(xp_reward, 10) || 20;
    if (![10, 20, 30, 50].includes(xp)) {
      return NextResponse.json({ error: 'XP tidak valid (10/20/30/50)' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify intern is in a group that pembina is also a member of
    const { data: pembinaGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'pembina')
      .eq('user_id', pembina.pembina_id);

    const { data: internGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'peserta')
      .eq('user_id', intern_id);

    const pembinaGroupIds = (pembinaGroups || []).map((g: any) => g.group_id);
    const internGroupIds = (internGroups || []).map((g: any) => g.group_id);
    const hasOverlap = pembinaGroupIds.some((id: string) => internGroupIds.includes(id));

    if (!hasOverlap) {
      return NextResponse.json({ error: 'Peserta ini tidak ada di grup yang Anda bimbing' }, { status: 403 });
    }

    // Check if intern is active
    const { data: intern } = await supabase
      .from('interns')
      .select('is_active, name')
      .eq('id', intern_id)
      .single();

    if (!intern || !intern.is_active) {
      return NextResponse.json({ error: 'Peserta tidak aktif' }, { status: 400 });
    }

    // Create activity assigned to specific intern
    const { data, error } = await supabase
      .from('activities')
      .insert({
        title: title.trim(),
        description: description.trim(),
        intern_id: intern_id,
        department: null,
        is_active: true,
        is_archived: false,
        created_by_intern: false,
        xp_reward: xp,
        due_date: deadline_date || null,
        is_recurring: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      activity: data,
      message: `Tugas "${title}" berhasil diberikan ke ${intern.name}`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
