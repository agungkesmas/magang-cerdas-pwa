import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { getWIBToday } from '@/lib/utils';

export async function GET() {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, group:groups(id, name, department)')
      .eq('user_type', 'peserta')
      .eq('user_id', intern.intern_id);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ success: true, quests: [] });
    }

    const groupIds = memberships.map((m: any) => m.group_id);
    const groupMap: Record<string, any> = {};
    memberships.forEach((m: any) => {
      const g = Array.isArray(m.group) ? m.group[0] : m.group;
      if (g) groupMap[m.group_id] = g;
    });

    const { data: quests } = await supabase
      .from('activities')
      .select('id, title, description, xp_reward, is_recurring, due_date, is_active, start_date, end_date, group_id, created_at')
      .eq('is_quest', true)
      .eq('is_active', true)
      .eq('is_archived', false)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });

    if (!quests || quests.length === 0) {
      return NextResponse.json({ success: true, quests: [] });
    }

    const questIds = quests.map((q: any) => q.id);
    const { data: questLogs } = await supabase
      .from('quest_logs')
      .select('quest_id, status, started_at')
      .eq('intern_id', intern.intern_id)
      .in('quest_id', questIds);
    const logMap: Record<string, any> = {};
    (questLogs || []).forEach((l: any) => { logMap[l.quest_id] = l; });

    let todayMap: Record<string, any> = {};
    const todayStr = getWIBToday();
    try {
      const { data: todayCompletions } = await supabase
        .from('quest_daily_completions')
        .select('quest_id, xp_awarded, completion_date')
        .eq('intern_id', intern.intern_id)
        .in('quest_id', questIds)
        .eq('completion_date', todayStr);
      (todayCompletions || []).forEach((c: any) => { todayMap[c.quest_id] = c; });
    } catch {}

    const result = quests.map((q: any) => {
      const log = logMap[q.id];
      const todayCompletion = todayMap[q.id];
      const grp = groupMap[q.group_id];
      const isRecurring = q.is_recurring;
      const isCompletedToday = isRecurring && !!todayCompletion;
      const isPermanentlyDone = !isRecurring && log?.status === 'completed';
      const isInProgress = log?.status === 'in_progress' && !isCompletedToday && !isPermanentlyDone;
      const isOverdue = q.due_date ? new Date(q.due_date).getTime() < Date.now() : false;

      let derivedStatus: 'available' | 'in_progress' | 'completed_today' | 'completed_permanent' | 'overdue';
      if (isPermanentlyDone) derivedStatus = 'completed_permanent';
      else if (isCompletedToday) derivedStatus = 'completed_today';
      else if (isInProgress) derivedStatus = 'in_progress';
      else if (isOverdue) derivedStatus = 'overdue';
      else derivedStatus = 'available';

      return {
        id: q.id,
        title: q.title,
        description: q.description,
        xp_reward: q.xp_reward || 20,
        is_recurring: isRecurring,
        due_date: q.due_date,
        start_date: q.start_date,
        end_date: q.end_date,
        group_id: q.group_id,
        group_name: grp?.name || null,
        group_department: grp?.department || null,
        status: derivedStatus,
        started_at: log?.started_at || null,
        today_xp: todayCompletion?.xp_awarded || null
      };
    });

    return NextResponse.json({ success: true, quests: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
