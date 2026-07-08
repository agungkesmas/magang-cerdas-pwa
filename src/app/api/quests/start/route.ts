// ============================================================
// /api/quests/start — Peserta klik START di Quest Card
// Insert ke quest_logs: status=in_progress
// Update activities.current_slots_taken (+1)
// Anti-double: UNIQUE(quest_id, intern_id)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { getWIBTodayRange, getWIBToday } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { quest_id, group_id } = await req.json();
    if (!quest_id) return NextResponse.json({ error: 'quest_id wajib diisi' }, { status: 400 });
    if (!group_id) return NextResponse.json({ error: 'group_id wajib diisi' }, { status: 400 });

    const supabase = createServerClient();

    // 0. CEK: Peserta sudah check-in hari ini? (timezone WIB)
    const { start: wibStart, end: wibEnd } = getWIBTodayRange();
    const { data: todayCheckIn } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-In')
      .gte('timestamp', wibStart.toISOString())
      .lte('timestamp', wibEnd.toISOString())
      .maybeSingle();
    if (!todayCheckIn) {
      return NextResponse.json(
        { error: 'Anda belum check-in hari ini. Lakukan check-in terlebih dahulu sebelum memulai quest.' },
        { status: 403 }
      );
    }

    // 0a. CEK: Peserta sudah check-out hari ini? (tidak bisa START quest baru, tapi masih bisa SUBMIT)
    const { data: todayCheckOut } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-Out')
      .gte('timestamp', wibStart.toISOString())
      .lte('timestamp', wibEnd.toISOString())
      .maybeSingle();
    if (todayCheckOut) {
      return NextResponse.json(
        { error: 'Anda sudah check-out hari ini. Tidak bisa memulai quest baru. Kamu masih bisa menyelesaikan (submit) quest yang sudah di-start.' },
        { status: 403 }
      );
    }

    // 1. Fetch quest
    const { data: quest, error: qErr } = await supabase
      .from('activities')
      .select('*')
      .eq('id', quest_id)
      .eq('is_quest', true)
      .single();
    if (qErr || !quest) return NextResponse.json({ error: 'Quest tidak ditemukan' }, { status: 404 });
    if (!quest.is_active) return NextResponse.json({ error: 'Quest sudah tidak aktif' }, { status: 400 });
    if (quest.due_date && new Date(quest.due_date).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Quest sudah lewat deadline' }, { status: 400 });
    }

    // 1b. Untuk quest RECURRING: cek sudah complete + limit harian + jeda 3 jam (timezone WIB)
    if (quest.is_recurring) {
      const todayStr = getWIBToday();
      try {
        const { data: todayCompletion } = await supabase
          .from('quest_daily_completions')
          .select('id, completion_date, xp_awarded, submitted_at')
          .eq('quest_id', quest_id)
          .eq('intern_id', intern.intern_id)
          .eq('completion_date', todayStr)
          .maybeSingle();
        if (todayCompletion) {
          return NextResponse.json(
            { error: `Sudah selesai quest ini hari ini (+${todayCompletion.xp_awarded} XP). Kembali besok untuk kerjakan lagi.` },
            { status: 409 }
          );
        }

        // 1c. LIMIT: quest max 2, self-added max 2, total max 3
        const { count: questCountToday } = await supabase
          .from('quest_daily_completions')
          .select('id', { count: 'exact', head: true })
          .eq('intern_id', intern.intern_id)
          .eq('completion_date', todayStr);
        // Self-added count pakai range WIB
        const ts = wibStart;
        const te = wibEnd;
        const { count: selfAddedCount } = await supabase
          .from('activities')
          .select('id', { count: 'exact', head: true })
          .eq('intern_id', intern.intern_id)
          .eq('created_by_intern', true)
          .gte('created_at', ts.toISOString())
          .lte('created_at', te.toISOString());
        const questN = questCountToday || 0;
        const selfN = selfAddedCount || 0;
        const totalN = questN + selfN;

        if (questN >= 2) {
          return NextResponse.json(
            { error: 'Batas quest harian tercapai (maksimal 2 quest per hari).' + (selfN < 2 ? ' Kamu masih bisa menambah pekerjaan mandiri.' : '') },
            { status: 429 }
          );
        }
        if (totalN >= 3) {
          return NextResponse.json(
            { error: 'Batas harian tercapai (maksimal 3 aktivitas per hari). Kembali besok.' },
            { status: 429 }
          );
        }

        // 1d. JEDA 3 JAM untuk aktivitas ke-3 (kalau sudah 2 total)
        if (totalN >= 2) {
          // Cari timestamp aktivitas ke-2 (terbaru)
          let latestActivityTime: Date | null = null;
          // Cek quest terbaru
          const { data: latestQuest } = await supabase
            .from('quest_daily_completions')
            .select('submitted_at')
            .eq('intern_id', intern.intern_id)
            .eq('completion_date', todayStr)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestQuest?.submitted_at) latestActivityTime = new Date(latestQuest.submitted_at);
          // Cek self-added terbaru
          const { data: latestSelf } = await supabase
            .from('activities')
            .select('created_at')
            .eq('intern_id', intern.intern_id)
            .eq('created_by_intern', true)
            .gte('created_at', ts.toISOString())
            .lte('created_at', te.toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestSelf?.created_at) {
            const selfTime = new Date(latestSelf.created_at);
            if (!latestActivityTime || selfTime > latestActivityTime) latestActivityTime = selfTime;
          }
          if (latestActivityTime) {
            const elapsed = Date.now() - latestActivityTime.getTime();
            const threeHours = 3 * 60 * 60 * 1000;
            if (elapsed < threeHours) {
              const remaining = Math.ceil((threeHours - elapsed) / (60 * 1000));
              const hours = Math.floor(remaining / 60);
              const mins = remaining % 60;
              return NextResponse.json(
                { error: `Aktivitas ke-3 harus menunggu jeda 3 jam dari aktivitas sebelumnya. Tunggu ${hours} jam ${mins} menit lagi.` },
                { status: 429 }
              );
            }
          }
        }
      } catch {
        console.warn('[quests/start] quest_daily_completions belum ada — lewati cek');
      }
    }

    // 2. Verify intern adalah member grup
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', group_id)
      .eq('user_type', 'peserta')
      .eq('user_id', intern.intern_id)
      .maybeSingle();
    if (!membership) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

    // 3. Cek apakah sudah pernah start
    const { data: existing } = await supabase
      .from('quest_logs')
      .select('id, status')
      .eq('quest_id', quest_id)
      .eq('intern_id', intern.intern_id)
      .maybeSingle();
    if (existing) {
      if (existing.status === 'in_progress') {
        return NextResponse.json({ error: 'Anda sudah start quest ini' }, { status: 409 });
      }
      // SELF-HEALING untuk quest recurring:
      // Kalau status='completed' (legacy dari kode lama sebelum fix, ATAU migration belum di-run),
      // auto-reset ke 'in_progress' supaya bisa mulai lagi.
      // Untuk non-recurring: status='completed' = permanen, tolak.
      if (existing.status === 'completed' && !quest.is_recurring) {
        return NextResponse.json({ error: 'Anda sudah menyelesaikan quest ini' }, { status: 409 });
      }
      // Untuk recurring (status='completed' legacy atau 'available'/'cancelled'): allow re-start
      await supabase
        .from('quest_logs')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // 4. Cek max_slots
      if (quest.max_slots) {
        const { count } = await supabase
          .from('quest_logs')
          .select('id', { count: 'exact', head: true })
          .eq('quest_id', quest_id)
          .in('status', ['in_progress', 'completed']);
        if ((count || 0) >= quest.max_slots) {
          return NextResponse.json({ error: 'Slot quest sudah penuh' }, { status: 400 });
        }
      }

      // 5. Insert quest_log
      const { error: lErr } = await supabase.from('quest_logs').insert({
        quest_id,
        intern_id: intern.intern_id,
        group_id,
        status: 'in_progress',
        started_at: new Date().toISOString()
      });
      if (lErr) {
        if (lErr.code === '23505') {
          return NextResponse.json({ error: 'Anda sudah pernah ambil quest ini' }, { status: 409 });
        }
        return NextResponse.json({ error: lErr.message }, { status: 500 });
      }

      // 6. Update current_slots_taken
      await supabase
        .from('activities')
        .update({ current_slots_taken: (quest.current_slots_taken || 0) + 1 })
        .eq('id', quest_id);
    }

    // 7. (REMOVED) System message "🔵 X memulai quest" — info sudah ada di Quest Card "Progress Peserta"
    // Aktivitas tetap tercatat di quest_logs untuk audit trail

    return NextResponse.json({ success: true, status: 'in_progress' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
