// ============================================================
// /api/admin/interns/[id]/timeline — Riwayat aktivitas peserta
// Gabungkan: attendance + activity_completions + activity_daily_completions
//            + quest_logs + leave_requests + certificates
// Akses: Admin (semua peserta) | Pembina (hanya peserta bimbingan) | BKK (hanya peserta sekolahnya)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken, getBKKToken } from '@/lib/auth';
import { ensureCustomHolidaysLoaded } from '@/lib/holidays-loader';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const internId = params.id;
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    const bkk = await getBKKToken();
    if (!admin && !pembina && !bkk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load custom holidays untuk tier calculation dinamis (jika ditampilkan)
    await ensureCustomHolidaysLoaded();

    const supabase = createServerClient();

    // 1. Fetch intern profile
    const { data: intern, error: internErr } = await supabase
      .from('interns')
      .select('id, name, school_origin, major, department, start_date, end_date, total_exp, streak_count, is_active, certificate_unlocked, certificate_id, photo_url, email, whatsapp, tags, created_at')
      .eq('id', internId)
      .single();
    if (internErr || !intern) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
    }

    // 2. Authorization check
    // Pembina: hanya bisa lihat peserta yang dia bimbing (cek group_members)
    if (!admin && pembina) {
      // Cari grup yang berisi intern ini DAN pembina ini
      const { data: internGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_type', 'peserta')
        .eq('user_id', internId);
      const { data: pembinaGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_type', 'pembina')
        .eq('user_id', pembina.pembina_id);
      const internSet = new Set((internGroups || []).map((g) => g.group_id));
      const overlap = (pembinaGroups || []).some((g) => internSet.has(g.group_id));
      if (!overlap) {
        return NextResponse.json({ error: 'Akses ditolak — peserta bukan bimbingan Anda' }, { status: 403 });
      }
    }
    // BKK: hanya bisa lihat peserta dari sekolahnya (bkk.schools array dari token)
    if (!admin && !pembina && bkk) {
      const allowedSchools = (bkk.schools || []).map((s: string) => s.toLowerCase());
      const internSchool = (intern.school_origin || '').toLowerCase();
      if (!internSchool || !allowedSchools.includes(internSchool)) {
        return NextResponse.json({ error: 'Akses ditolak — peserta bukan dari sekolah Anda' }, { status: 403 });
      }
    }

    // 3. Parallel fetch semua sumber data
    const [attendanceRes, completionsRes, dailyCompletionsRes, questLogsRes, leavesRes, certificatesRes, groupMembershipsRes, bonusXpRes] = await Promise.all([
      // Attendance (Check-In/Out)
      supabase
        .from('attendance')
        .select('id, timestamp, type, latitude, longitude, distance_meters, is_within_geofence, notes, photo_url')
        .eq('intern_id', internId)
        .order('timestamp', { ascending: false })
        .limit(500),

      // Activity completions (one-time) — XP dari activities.xp_reward
      // Include created_by_intern & bonus_xp untuk tombol "Bonus XP" pembina
      supabase
        .from('activity_completions')
        .select('id, activity_id, completed_at, bonus_xp, bonus_note, bonus_at, activities!inner(id, title, description, department, due_date, is_recurring, xp_reward, created_by_intern, is_quest)')
        .eq('intern_id', internId)
        .order('completed_at', { ascending: false })
        .limit(200),

      // Activity daily completions (recurring)
      supabase
        .from('activity_daily_completions')
        .select('id, activity_id, completion_date, completion_notes, exp_awarded, bonus_exp_awarded, completed_at, activities!inner(id, title, description, department)')
        .eq('intern_id', internId)
        .order('completed_at', { ascending: false })
        .limit(500),

      // Quest logs (quest_id references activities.id — Quest = activities dengan is_quest=true)
      supabase
        .from('quest_logs')
        .select('id, quest_id, status, xp_awarded, submission_notes, submitted_at, started_at, activities!inner(id, title, description, xp_reward, is_quest)')
        .eq('intern_id', internId)
        .order('submitted_at', { ascending: false })
        .limit(200),

      // Leave requests
      supabase
        .from('leave_requests')
        .select('id, type, start_date, end_date, reason, status, review_notes, created_at, reviewed_at')
        .eq('intern_id', internId)
        .order('created_at', { ascending: false })
        .limit(100),

      // Certificates (nama tabel aktual lowercase 'certificates' & 'officials' di DB)
      supabase
        .from('certificates')
        .select('id, tier, issue_date, verification_id, pdf_url, created_at, officials(name, position, branch)')
        .eq('intern_id', internId)
        .order('created_at', { ascending: false }),

      // Group memberships
      supabase
        .from('group_members')
        .select('group_id, role, joined_at, groups(id, name, group_type, department)')
        .eq('user_type', 'peserta')
        .eq('user_id', internId)
        .order('joined_at', { ascending: false }),

      // Bonus XP logs (dari pembina)
      supabase
        .from('xp_bonus_logs')
        .select('id, quest_log_id, bonus_xp, note, created_at, pembina_id, quest_id, activities(title), pembina_magang(name)')
        .eq('intern_id', internId)
        .order('created_at', { ascending: false })
        .limit(200)
    ]);

    if (attendanceRes.error) console.error('[timeline] attendance err:', attendanceRes.error);
    if (completionsRes.error) console.error('[timeline] completions err:', completionsRes.error);
    if (dailyCompletionsRes.error) console.error('[timeline] daily err:', dailyCompletionsRes.error);
    if (questLogsRes.error) console.error('[timeline] quest err:', questLogsRes.error);
    if (leavesRes.error) console.error('[timeline] leave err:', leavesRes.error);
    if (certificatesRes.error) console.error('[timeline] cert err:', certificatesRes.error);
    if (groupMembershipsRes.error) console.error('[timeline] groups err:', groupMembershipsRes.error);
    if (bonusXpRes.error) console.error('[timeline] bonus xp err:', bonusXpRes.error);

    // 4. Build unified timeline
    type TimelineItem = {
      timestamp: string;
      type: 'check_in' | 'check_out' | 'task_complete' | 'task_daily_complete' | 'quest' | 'leave' | 'certificate' | 'group_join' | 'bonus_xp';
      title: string;
      description?: string;
      metadata?: any;
      id: string;
    };

    const timeline: TimelineItem[] = [];

    // Attendance
    (attendanceRes.data || []).forEach((a: any) => {
      timeline.push({
        id: `att-${a.id}`,
        timestamp: a.timestamp,
        type: a.type === 'Check-In' ? 'check_in' : 'check_out',
        title: a.type === 'Check-In' ? 'Check-In' : 'Check-Out',
        description: a.notes || undefined,
        metadata: {
          latitude: a.latitude,
          longitude: a.longitude,
          distance_meters: a.distance_meters,
          is_within_geofence: a.is_within_geofence,
          has_photo: !!a.photo_url
        }
      });
    });

    // Activity completions (one-time)
    (completionsRes.data || []).forEach((c: any) => {
      const act = c.activities;
      timeline.push({
        id: `comp-${c.id}`,
        timestamp: c.completed_at,
        type: 'task_complete',
        title: `Tugas Selesai: ${act?.title || 'Aktivitas'}`,
        description: act?.description || undefined,
        metadata: {
          activity_id: c.activity_id,
          completion_id: c.id,
          department: act?.department,
          due_date: act?.due_date,
          is_recurring: act?.is_recurring,
          is_self_added: act?.created_by_intern === true,
          is_quest: act?.is_quest === true,
          xp_reward: act?.xp_reward,
          bonus_xp: c.bonus_xp || 0,
          bonus_note: c.bonus_note || null,
          bonus_at: c.bonus_at || null,
          has_bonus: (c.bonus_xp || 0) > 0
        }
      });
    });

    // Activity daily completions (recurring)
    (dailyCompletionsRes.data || []).forEach((c: any) => {
      const act = c.activities;
      timeline.push({
        id: `daily-${c.id}`,
        timestamp: c.completed_at,
        type: 'task_daily_complete',
        title: `Tugas Harian Selesai: ${act?.title || 'Aktivitas'}`,
        description: c.completion_notes || act?.description || undefined,
        metadata: {
          activity_id: c.activity_id,
          completion_date: c.completion_date,
          exp_awarded: c.exp_awarded,
          bonus_exp_awarded: c.bonus_exp_awarded
        }
      });
    });

    // Quest logs
    (questLogsRes.data || []).forEach((q: any) => {
      const act = q.activities;
      timeline.push({
        id: `quest-${q.id}`,
        timestamp: q.submitted_at || q.started_at || q.created_at,
        type: 'quest',
        title: `Quest: ${act?.title || 'Quest'}`,
        description: act?.description || q.submission_notes || undefined,
        metadata: {
          quest_id: q.quest_id,
          status: q.status,
          xp_awarded: q.xp_awarded,
          xp_reward: act?.xp_reward,
          started_at: q.started_at,
          submitted_at: q.submitted_at
        }
      });
    });

    // Leave requests
    (leavesRes.data || []).forEach((l: any) => {
      timeline.push({
        id: `leave-${l.id}`,
        timestamp: l.created_at,
        type: 'leave',
        title: `Pengajuan ${l.type}: ${l.start_date} → ${l.end_date}`,
        description: l.reason,
        metadata: {
          status: l.status,
          review_notes: l.review_notes,
          reviewed_at: l.reviewed_at
        }
      });
    });

    // Certificates
    (certificatesRes.data || []).forEach((c: any) => {
      timeline.push({
        id: `cert-${c.id}`,
        timestamp: c.created_at,
        type: 'certificate',
        title: `Sertifikat Diterbitkan: ${c.tier}`,
        description: `Verification ID: ${c.verification_id}`,
        metadata: {
          certificate_id: c.id,
          tier: c.tier,
          issue_date: c.issue_date,
          verification_id: c.verification_id,
          pdf_url: c.pdf_url,
          official_name: c.officials?.name,
          official_position: c.officials?.position,
          official_branch: c.officials?.branch
        }
      });
    });

    // Bonus XP dari pembina
    (bonusXpRes.data || []).forEach((b: any) => {
      timeline.push({
        id: `bonus-${b.id}`,
        timestamp: b.created_at,
        type: 'bonus_xp',
        title: `Bonus XP: +${b.bonus_xp} dari ${b.pembina_magang?.name || 'Pembina'}`,
        description: b.note || undefined,
        metadata: {
          bonus_xp: b.bonus_xp,
          note: b.note,
          quest_log_id: b.quest_log_id,
          quest_id: b.quest_id,
          quest_title: b.activities?.title,
          pembina_id: b.pembina_id,
          pembina_name: b.pembina_magang?.name
        }
      });
    });

    // Group joins
    (groupMembershipsRes.data || []).forEach((g: any) => {
      timeline.push({
        id: `group-${g.group_id}`,
        timestamp: g.joined_at,
        type: 'group_join',
        title: `Bergabung ke Grup: ${g.groups?.name || 'Grup'}`,
        description: g.groups?.group_type === 'system' ? 'Grup sistem (auto-managed)' : undefined,
        metadata: {
          group_id: g.group_id,
          role: g.role,
          group_type: g.groups?.group_type,
          department: g.groups?.department
        }
      });
    });

    // 5. Sort timeline descending (newest first)
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 6. Compute summary stats
    const summary = {
      total_attendance: (attendanceRes.data || []).length,
      total_checkins: (attendanceRes.data || []).filter((a: any) => a.type === 'Check-In').length,
      total_checkouts: (attendanceRes.data || []).filter((a: any) => a.type === 'Check-Out').length,
      total_tasks_completed: (completionsRes.data || []).length + (dailyCompletionsRes.data || []).length,
      total_quests: (questLogsRes.data || []).filter((q: any) => q.status === 'completed').length,
      total_leaves: (leavesRes.data || []).length,
      has_certificate: (certificatesRes.data || []).length > 0,
      certificate_count: (certificatesRes.data || []).length,
      total_bonus_xp: (bonusXpRes.data || []).reduce((sum: number, b: any) => sum + (b.bonus_xp || 0), 0),
      bonus_xp_count: (bonusXpRes.data || []).length,
      timeline_entries: timeline.length
    };

    return NextResponse.json({
      success: true,
      intern,
      timeline,
      summary,
      groups: (groupMembershipsRes.data || []).map((g: any) => g.groups),
      certificates: certificatesRes.data || []
    });
  } catch (e: any) {
    console.error('[timeline] error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
