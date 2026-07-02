// ============================================================
// /api/activities/list — List aktivitas
// Admin: semua aktivitas (with completion info)
// Intern: aktivitas yang assigned ke mereka (per-intern ATAU per-departemen mereka)
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

    const supabase = createServerClient();

    if (admin && !intern) {
      // Admin: list semua aktivitas with completion count
      const { data: activities, error: aErr } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });
      if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

      // Get completions untuk mode department
      const { data: completions } = await supabase
        .from('activity_completions')
        .select('activity_id, intern_id, completed_at, interns!inner(name)')
        .in('activity_id', (activities || []).map((a) => a.id));

      const completionsMap: Record<string, any[]> = {};
      (completions || []).forEach((c: any) => {
        if (!completionsMap[c.activity_id]) completionsMap[c.activity_id] = [];
        completionsMap[c.activity_id].push({
          intern_id: c.intern_id,
          intern_name: c.interns?.name,
          completed_at: c.completed_at
        });
      });

      // For per-intern activities, get intern name
      const internIds = (activities || []).filter((a) => a.intern_id).map((a) => a.intern_id);
      let internNamesMap: Record<string, string> = {};
      if (internIds.length > 0) {
        const { data: interns } = await supabase
          .from('interns')
          .select('id, name')
          .in('id', internIds);
        (interns || []).forEach((i: any) => {
          internNamesMap[i.id] = i.name;
        });
      }

      const result = (activities || []).map((a) => ({
        ...a,
        assigned_intern_name: a.intern_id ? internNamesMap[a.intern_id] || 'Unknown' : null,
        completions: completionsMap[a.id] || [],
        completion_count: a.completed_by_intern_id ? 1 : (completionsMap[a.id]?.length || 0)
      }));

      return NextResponse.json({ success: true, activities: result });
    }

    // Intern: list aktivitas yang assigned ke mereka
    // 1. Aktivitas per-intern (intern_id = current)
    // 2. Aktivitas per-departemen (department = intern.department, intern_id IS NULL)
    const { data: internData } = await supabase
      .from('interns')
      .select('department')
      .eq('id', intern!.intern_id)
      .single();

    if (!internData) return NextResponse.json({ error: 'Intern tidak ditemukan' }, { status: 404 });

    const { data: activities, error: aErr } = await supabase
      .from('activities')
      .select('*')
      .eq('is_active', true)
      .or(`intern_id.eq.${intern!.intern_id},and(intern_id.is.null,department.eq.${internData.department})`)
      .order('created_at', { ascending: false });
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    // Get completions by this intern
    const { data: myCompletions } = await supabase
      .from('activity_completions')
      .select('activity_id, completed_at')
      .eq('intern_id', intern!.intern_id)
      .in('activity_id', (activities || []).map((a) => a.id));

    const myCompletionMap: Record<string, string | null> = {};
    (myCompletions || []).forEach((c: any) => {
      myCompletionMap[c.activity_id] = c.completed_at;
    });

    const result = (activities || []).map((a) => ({
      ...a,
      my_completion: a.completed_by_intern_id === intern!.intern_id ? a.completed_at : (myCompletionMap[a.id] || null),
      is_completed: a.completed_by_intern_id === intern!.intern_id || !!myCompletionMap[a.id],
      is_overdue: a.due_date ? new Date(a.due_date).getTime() < Date.now() : false
    }));

    return NextResponse.json({ success: true, activities: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
