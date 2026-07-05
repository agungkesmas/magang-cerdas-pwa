// ============================================================
// /api/activities/create — Admin assign aktivitas/pengumuman
// ============================================================
// Jenis: 'task' (dengan XP + deadline) atau 'announcement' (info saja)
// Target: 'all' (semua peserta) / 'Pelayanan' / 'Pemasaran' / 'Keuangan'
// Mode: 'once' (sekali selesai) atau 'recurring' (harian berulang)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

const VALID_DEPARTMENTS = ['Pelayanan', 'Pemasaran', 'Keuangan'];
const VALID_TARGETS = ['all', ...VALID_DEPARTMENTS];
const VALID_TYPES = ['task', 'announcement'];

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      title,
      description,
      target = 'all',
      activity_type = 'task',
      xp_reward = 20,
      due_date,
      is_recurring = false,
      start_date,
      end_date,
      skip_weekend = true,
      daily_deadline_hour = 17,
      scheduled_date
    } = await req.json();

    // Validation
    if (!title?.trim()) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: 'Deskripsi wajib diisi' }, { status: 400 });
    if (!VALID_TARGETS.includes(target)) {
      return NextResponse.json({ error: 'Target tidak valid (all/Pelayanan/Pemasaran/Keuangan)' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(activity_type)) {
      return NextResponse.json({ error: 'Jenis tidak valid (task/announcement)' }, { status: 400 });
    }

    // Announcement: no XP, no deadline, no recurring
    const isAnnouncement = activity_type === 'announcement';
    const finalXp = isAnnouncement ? 0 : (parseInt(xp_reward, 10) || 20);
    if (!isAnnouncement && ![10, 20, 30, 50].includes(finalXp)) {
      return NextResponse.json({ error: 'XP tidak valid (10/20/30/50)' }, { status: 400 });
    }

    // Parse due_date (optional, untuk task non-recurring)
    let parsedDueDate: string | null = null;
    if (!isAnnouncement && due_date) {
      const d = new Date(due_date);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Format deadline tidak valid' }, { status: 400 });
      }
      parsedDueDate = d.toISOString();
    }

    // Validation untuk recurring mode (task only)
    let parsedStartDate: string | null = null;
    let parsedEndDate: string | null = null;
    if (!isAnnouncement && is_recurring) {
      if (!start_date || !end_date) {
        return NextResponse.json({ error: 'Mode recurring wajib set start_date & end_date' }, { status: 400 });
      }
      const sd = new Date(start_date);
      const ed = new Date(end_date);
      if (isNaN(sd.getTime()) || isNaN(ed.getTime())) {
        return NextResponse.json({ error: 'Format tanggal range tidak valid' }, { status: 400 });
      }
      if (ed < sd) {
        return NextResponse.json({ error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' }, { status: 400 });
      }
      parsedStartDate = sd.toISOString().split('T')[0];
      parsedEndDate = ed.toISOString().split('T')[0];
    }

    // Parse scheduled_date (optional — kalau di-set di masa depan, aktivitas belum aktif sampai tanggal H)
    let parsedScheduledDate: string | null = null;
    let isActive = true;
    if (scheduled_date) {
      const sd = new Date(scheduled_date);
      if (!isNaN(sd.getTime())) {
        parsedScheduledDate = sd.toISOString();
        // If scheduled date is in the future, set is_active = false (will be activated by cron/check)
        if (sd.getTime() > Date.now()) {
          isActive = false;
        }
      }
    }

    const deadlineHour = Number(daily_deadline_hour);
    if (isNaN(deadlineHour) || deadlineHour < 0 || deadlineHour > 23) {
      return NextResponse.json({ error: 'Daily deadline hour tidak valid (0-23)' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Determine department field: 'all' → null (means broadcast to all)
    const departmentValue = target === 'all' ? null : target;

    const { data, error } = await supabase
      .from('activities')
      .insert({
        title: title.trim(),
        description: description.trim(),
        intern_id: null, // Admin tidak lagi assign ke 1 peserta (itu tugas pembina)
        department: departmentValue,
        is_broadcast: target === 'all', // New field: true kalau broadcast ke semua
        activity_type: activity_type, // New field: 'task' atau 'announcement'
        xp_reward: finalXp,
        due_date: parsedDueDate,
        is_active: isActive,
        is_archived: false,
        created_by: admin.sub,
        created_by_intern: false,
        is_recurring: !isAnnouncement && !!is_recurring,
        start_date: parsedStartDate,
        end_date: parsedEndDate,
        skip_weekend: !!skip_weekend,
        daily_deadline_hour: deadlineHour,
        scheduled_date: parsedScheduledDate,
      })
      .select()
      .single();

    if (error) {
      console.error('[activities/create] DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      activity: data,
      message: isAnnouncement
        ? `Pengumuman "${title}" berhasil dikirim ke ${target === 'all' ? 'semua peserta' : target}`
        : `Tugas "${title}" berhasil diberikan ke ${target === 'all' ? 'semua peserta' : target}`
    });
  } catch (e: any) {
    console.error('[activities/create] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
