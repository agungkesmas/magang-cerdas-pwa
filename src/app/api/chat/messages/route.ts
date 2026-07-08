// ============================================================
// /api/chat/messages — List messages in a group (polling-friendly)
// GET ?group_id=X&limit=50&before=<message_id>
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken, getInternToken } from '@/lib/auth';
import { getWIBToday } from '@/lib/utils';

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
        .select('id, title, description, due_date, xp_reward, max_slots, current_slots_taken, is_active, is_recurring, start_date, end_date, created_at')
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

    // Fetch today's daily completions untuk intern (quest recurring, timezone WIB)
    let myDailyCompletions: Record<string, any> = {};
    if (intern && questIds.length > 0) {
      const todayStr = getWIBToday();
      const { data: dailies } = await supabase
        .from('quest_daily_completions')
        .select('quest_id, completion_date, xp_awarded, submitted_at')
        .eq('intern_id', intern.intern_id)
        .in('quest_id', questIds)
        .eq('completion_date', todayStr);
      (dailies || []).forEach((d: any) => { myDailyCompletions[d.quest_id] = d; });
    }

    // Fetch all quest_logs untuk pembina/admin (monitoring + Bonus XP)
    let allQuestLogs: Record<string, any[]> = {};
    if ((pembina || admin) && questIds.length > 0) {
      const { data: allLogs } = await supabase
        .from('quest_logs')
        .select('id, quest_id, intern_id, status, started_at, submitted_at, xp_awarded, interns!inner(name)')
        .in('quest_id', questIds);
      // Ambil bonus XP yang sudah diberikan (jika ada) untuk quest_log ini (non-recurring)
      const questLogIds = (allLogs || []).map((l: any) => l.id);
      let bonusMap: Record<string, { bonus_xp: number; note: string | null }> = {};
      if (questLogIds.length > 0) {
        const { data: bonuses } = await supabase
          .from('xp_bonus_logs')
          .select('quest_log_id, bonus_xp, note')
          .in('quest_log_id', questLogIds);
        (bonuses || []).forEach((b: any) => {
          bonusMap[b.quest_log_id] = { bonus_xp: b.bonus_xp, note: b.note };
        });
      }

      // Untuk quest recurring: fetch daily completions + daily bonus
      const recurringQuestIds = (allLogs || [])
        .filter((l: any) => questMap[l.quest_id]?.is_recurring)
        .map((l: any) => l.id);
      let dailyCompletionsMap: Record<string, any[]> = {}; // quest_log_id → array of daily completions
      let dailyBonusMap: Record<string, { bonus_xp: number; note: string | null }> = {};
      if (recurringQuestIds.length > 0) {
        const { data: allDailies } = await supabase
          .from('quest_daily_completions')
          .select('id, quest_id, intern_id, completion_date, xp_awarded, submitted_at, submission_notes')
          .in('quest_id', Object.keys(questMap).filter(qid => questMap[qid]?.is_recurring))
          .order('completion_date', { ascending: false });
        // Map by quest_log (cari matching log by quest_id + intern_id)
        const logByQuestIntern: Record<string, any> = {};
        (allLogs || []).forEach((l: any) => {
          logByQuestIntern[`${l.quest_id}_${l.intern_id}`] = l;
        });
        const dailyIds = (allDailies || []).map((d: any) => d.id);
        if (dailyIds.length > 0) {
          const { data: dailyBonuses } = await supabase
            .from('quest_daily_bonus_logs')
            .select('quest_daily_completion_id, bonus_xp, note')
            .in('quest_daily_completion_id', dailyIds);
          (dailyBonuses || []).forEach((b: any) => {
            dailyBonusMap[b.quest_daily_completion_id] = { bonus_xp: b.bonus_xp, note: b.note };
          });
        }
        (allDailies || []).forEach((d: any) => {
          const log = logByQuestIntern[`${d.quest_id}_${d.intern_id}`];
          if (!log) return;
          if (!dailyCompletionsMap[log.id]) dailyCompletionsMap[log.id] = [];
          const bonus = dailyBonusMap[d.id];
          dailyCompletionsMap[log.id].push({
            id: d.id,
            completion_date: d.completion_date,
            xp_awarded: d.xp_awarded,
            submitted_at: d.submitted_at,
            submission_notes: d.submission_notes,
            bonus_xp: bonus?.bonus_xp || 0,
            bonus_note: bonus?.note || null
          });
        });
      }

      (allLogs || []).forEach((l: any) => {
        if (!allQuestLogs[l.quest_id]) allQuestLogs[l.quest_id] = [];
        const bonus = bonusMap[l.id];
        const isRecurring = questMap[l.quest_id]?.is_recurring;
        allQuestLogs[l.quest_id].push({
          id: l.id, // quest_log_id — dipakai untuk Bonus XP
          intern_id: l.intern_id,
          intern_name: l.interns?.name,
          status: l.status,
          started_at: l.started_at,
          submitted_at: l.submitted_at,
          xp_awarded: l.xp_awarded,
          bonus_xp: bonus?.bonus_xp || 0,
          bonus_note: bonus?.note || null,
          // Untuk recurring: list daily completions (dengan bonus per-hari)
          daily_completions: isRecurring ? (dailyCompletionsMap[l.id] || []) : undefined,
          daily_count: isRecurring ? (dailyCompletionsMap[l.id]?.length || 0) : undefined,
          latest_daily_bonus_xp: isRecurring && dailyCompletionsMap[l.id]?.[0]?.bonus_xp ? dailyCompletionsMap[l.id][0].bonus_xp : 0
        });
      });
    }

    const result = (messages || []).map((m: any) => ({
      ...m,
      quest: m.quest_id ? questMap[m.quest_id] : null,
      my_quest_log: intern && m.quest_id ? (myQuestLogs[m.quest_id] || null) : null,
      my_daily_completion: intern && m.quest_id ? (myDailyCompletions[m.quest_id] || null) : null,
      quest_logs: (pembina || admin) && m.quest_id ? (allQuestLogs[m.quest_id] || []) : []
    }));

    return NextResponse.json({ success: true, messages: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
