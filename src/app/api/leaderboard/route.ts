// ============================================================
// /api/leaderboard — Public leaderboard (top interns by EXP)
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('interns')
      .select('id, name, major, department, total_exp, streak_count')
      .eq('is_active', true)
      .order('total_exp', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, leaderboard: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
