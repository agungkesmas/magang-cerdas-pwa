// ============================================================
// /api/chat/messages — List messages in a group (polling-friendly)
// GET ?group_id=X&limit=50&before=<message_id>
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken, getInternToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    const intern = await getInternToken();
    if (!admin && !pembina && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('group_id');
    if (!groupId) return NextResponse.json({ error: 'group_id wajib diisi' }, { status: 400 });
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = createServerClient();

    // Verify access (kalau bukan admin, harus member grup)
    if (!admin) {
      const userId = pembina ? pembina.pembina_id : intern!.intern_id;
      const userType = pembina ? 'pembina' : 'peserta';
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_type', userType)
        .eq('user_id', userId)
        .maybeSingle();
      if (!membership) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    // Fetch messages
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch quest details untuk message_type='quest_card'
    const questIds = (messages || []).filter((m: any) => m.message_type === 'quest_card' && m.quest_id).map((m: any) => m.quest_id);
    let questMap: Record<string, any> = {};
    if (questIds.length > 0) {
      const { data: quests } = await supabase
        .from('activities')
        .select('id, title, description, due_date, xp_reward, max_slots, current_slots_taken, is_active, created_at')
        .in('id', questIds);
      (quests || []).forEach((q: any) => { questMap[q.id] = q; });
    }

    // Fetch quest_logs untuk intern (status pengerjaan)
    let myQuestLogs: Record<string, any> = {};
    if (intern && questIds.length > 0) {
      const { data: logs } = await supabase
        .from('quest_logs')
        .select('quest_id, status, started_at, submitted_at, submission_notes, xp_awarded')
        .eq('intern_id', intern.intern_id)
        .in('quest_id', questIds);
      (logs || []).forEach((l: any) => { myQuestLogs[l.quest_id] = l; });
    }

    // Fetch all quest_logs untuk pembina/admin (monitoring)
    let allQuestLogs: Record<string, any[]> = {};
    if ((pembina || admin) && questIds.length > 0) {
      const { data: allLogs } = await supabase
        .from('quest_logs')
        .select('quest_id, intern_id, status, started_at, submitted_at, xp_awarded, interns!inner(name)')
        .in('quest_id', questIds);
      (allLogs || []).forEach((l: any) => {
        if (!allQuestLogs[l.quest_id]) allQuestLogs[l.quest_id] = [];
        allQuestLogs[l.quest_id].push({
          intern_id: l.intern_id,
          intern_name: l.interns?.name,
          status: l.status,
          started_at: l.started_at,
          submitted_at: l.submitted_at,
          xp_awarded: l.xp_awarded
        });
      });
    }

    const result = (messages || []).map((m: any) => ({
      ...m,
      quest: m.quest_id ? questMap[m.quest_id] : null,
      my_quest_log: intern && m.quest_id ? (myQuestLogs[m.quest_id] || null) : null,
      quest_logs: (pembina || admin) && m.quest_id ? (allQuestLogs[m.quest_id] || []) : []
    }));

    return NextResponse.json({ success: true, messages: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
