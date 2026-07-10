// ============================================================
// Helper: Check jeda antar tugas (quest + self-added activity)
//
// Aturan:
// - Setelah task selesai (quest submit / activity complete), 
//   harus tunggu JEDA_HOURS jam sebelum mulai task baru
// - Berlaku untuk quest + self-added activity (gabungan)
// - Cek: latest quest_logs.submitted_at + latest activities.completed_at
//
// Returns:
//   { blocked: boolean, remainingMinutes: number, message: string }
// ============================================================

import { createServerClient } from './supabase';

export const JEDA_BETWEEN_TASKS_HOURS = 2; // 2 jam antar task (task 1 → task 2)
export const JEDA_THIRD_TASK_HOURS = 3;    // 3 jam untuk task ke-3 (lebih ketat)

interface JedaResult {
  blocked: boolean;
  remainingMinutes: number;
  message: string;
  taskCountToday: number;
}

export async function checkTaskJeda(
  internId: string,
  supabase: any,
  jedaHours: number = JEDA_BETWEEN_TASKS_HOURS
): Promise<JedaResult> {
  const now = Date.now();
  const jedaMs = jedaHours * 60 * 60 * 1000;

  // Get today's WIB range
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const wibStart = new Date(`${todayStr}T00:00:00+07:00`);
  const wibEnd = new Date(`${todayStr}T23:59:59.999+07:00`);

  // 1. Get latest quest submission today
  // NOTE: jangan filter by status='completed' karena recurring quest
  // bisa di-reset ke 'available' setelah submit. Yang penting submitted_at terisi.
  const { data: latestQuest } = await supabase
    .from('quest_logs')
    .select('submitted_at')
    .eq('intern_id', internId)
    .not('submitted_at', 'is', null)
    .gte('submitted_at', wibStart.toISOString())
    .lte('submitted_at', wibEnd.toISOString())
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Get latest self-added activity completion today
  const { data: latestActivity } = await supabase
    .from('activities')
    .select('completed_at')
    .eq('created_by_intern', true)
    .eq('completed_by_intern_id', internId)
    .not('completed_at', 'is', null)
    .gte('completed_at', wibStart.toISOString())
    .lte('completed_at', wibEnd.toISOString())
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Find the most recent task completion time
  const candidates: Date[] = [];
  if (latestQuest?.submitted_at) {
    candidates.push(new Date(latestQuest.submitted_at));
  }
  if (latestActivity?.completed_at) {
    candidates.push(new Date(latestActivity.completed_at));
  }
  const lastTime: Date | null = candidates.length > 0
    ? candidates.reduce((max, d) => (d > max ? d : max))
    : null;

  // 4. Count total tasks completed today
  // NOTE: count semua quest_logs dengan submitted_at hari ini (regardless of status)
  const { count: questCount } = await supabase
    .from('quest_logs')
    .select('id', { count: 'exact', head: true })
    .eq('intern_id', internId)
    .not('submitted_at', 'is', null)
    .gte('submitted_at', wibStart.toISOString())
    .lte('submitted_at', wibEnd.toISOString());

  const { count: activityCount } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('created_by_intern', true)
    .eq('completed_by_intern_id', internId)
    .not('completed_at', 'is', null)
    .gte('completed_at', wibStart.toISOString())
    .lte('completed_at', wibEnd.toISOString());

  const taskCountToday = (questCount || 0) + (activityCount || 0);

  // 5. If no previous task today, no jeda needed
  if (!lastTime) {
    return { blocked: false, remainingMinutes: 0, message: '', taskCountToday };
  }

  // 6. Check if jeda has passed
  const elapsed = now - lastTime.getTime();
  if (elapsed >= jedaMs) {
    return { blocked: false, remainingMinutes: 0, message: '', taskCountToday };
  }

  // 7. Blocked — calculate remaining time
  const remaining = Math.ceil((jedaMs - elapsed) / (60 * 1000));
  const hrs = Math.floor(remaining / 60);
  const mins = remaining % 60;
  const timeStr = hrs > 0 ? `${hrs} jam ${mins} menit` : `${mins} menit`;
  const lastTimeStr = lastTime.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    blocked: true,
    remainingMinutes: remaining,
    taskCountToday,
    message: `Jeda antar tugas belum terpenuhi. Task terakhir selesai jam ${lastTimeStr} WIB. Tunggu ${timeStr} lagi sebelum mulai task baru.`
  };
}

// ============================================================
// Check apakah peserta sudah punya quest in_progress (anti-paralel)
// ============================================================
export async function hasInProgressQuest(internId: string, supabase: any): Promise<{ blocked: boolean; questTitle: string | null; message: string }> {
  const { data } = await supabase
    .from('quest_logs')
    .select('id, quest_id, activities!inner(title)')
    .eq('intern_id', internId)
    .eq('status', 'in_progress')
    .maybeSingle();

  if (data) {
    const title = (data.activities as any)?.title || 'quest tidak diketahui';
    return {
      blocked: true,
      questTitle: title,
      message: `Anda masih punya quest yang sedang dikerjakan: "${title}". Selesaikan (SUBMIT) atau batalkan quest tersebut dulu sebelum mulai quest baru.`
    };
  }

  return { blocked: false, questTitle: null, message: '' };
}
