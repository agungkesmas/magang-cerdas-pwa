// ============================================================
// /api/quests/[id] — PATCH (edit quest) / DELETE (hard delete, admin only)
//
// RULES (industry best practice):
//   - Edit (PATCH): Pembina (creator) atau Admin
//     * Boleh edit title/description/deadline/max_slots HANYA jika current_slots_taken = 0
//     * XP hanya boleh diubah jika belum ada submission (quest_logs count = 0)
//     * Tidak boleh edit start_date ke masa lalu (untuk recurring)
//   - Delete (DELETE): Admin only, wajib header X-Confirm = "HAPUS"
//     * Hanya boleh jika quest_logs count = 0 (tidak ada peserta yang pernah ambil)
//     * Untuk quest yang sudah ada submission, gunakan archive sebagai alternatif
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questId = params.id;
    if (!questId) return NextResponse.json({ error: 'Quest ID wajib diisi' }, { status: 400 });

    // Auth: pembina atau admin
    const [pembina, admin] = await Promise.all([getPembinaToken(), getAdminToken()]);
    if (!pembina && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, deadline, xp_reward, max_slots } = body;

    const supabase = createServerClient();

    // 1. Fetch quest
    const { data: quest, error: qErr } = await supabase
      .from('activities')
      .select('*')
      .eq('id', questId)
      .eq('is_quest', true)
      .single();
    if (qErr || !quest) {
      return NextResponse.json({ error: 'Quest tidak ditemukan' }, { status: 404 });
    }

    // 2. Authorization: pembina hanya bisa edit quest miliknya; admin bebas
    if (pembina && !admin) {
      if (quest.created_by_pembina_id !== pembina.pembina_id) {
        return NextResponse.json(
          { error: 'Anda hanya bisa edit quest yang Anda deploy sendiri' },
          { status: 403 }
        );
      }
    }

    // 3. Cek apakah sudah ada peserta yang ambil quest
    const { count: slotsTaken } = await supabase
      .from('quest_logs')
      .select('id', { count: 'exact', head: true })
      .eq('quest_id', questId)
      .in('status', ['in_progress', 'completed']);

    // 4. Validasi field yang boleh diubah
    const updates: any = {};
    const changes: any = {};

    if (title !== undefined && title !== null) {
      const t = String(title).trim();
      if (!t) return NextResponse.json({ error: 'Judul tidak boleh kosong' }, { status: 400 });
      if (t.length > 255) return NextResponse.json({ error: 'Judul maksimal 255 karakter' }, { status: 400 });
      if (t !== quest.title) {
        // Judul boleh diubah selama belum ada submission completed
        const { count: completedCount } = await supabase
          .from('quest_logs')
          .select('id', { count: 'exact', head: true })
          .eq('quest_id', questId)
          .eq('status', 'completed');
        if ((completedCount || 0) > 0) {
          return NextResponse.json(
            { error: 'Judul tidak bisa diubah karena sudah ada peserta yang menyelesaikan quest' },
            { status: 400 }
          );
        }
        updates.title = t;
        changes.title = { from: quest.title, to: t };
      }
    }

    if (description !== undefined && description !== null) {
      const d = String(description).trim();
      if (!d) return NextResponse.json({ error: 'Deskripsi tidak boleh kosong' }, { status: 400 });
      if (d !== quest.description) {
        updates.description = d;
        changes.description = { from: quest.description, to: d };
      }
    }

    if (deadline !== undefined) {
      let deadlineISO: string | null = null;
      if (deadline) {
        const dDate = new Date(deadline);
        if (isNaN(dDate.getTime())) {
          return NextResponse.json({ error: 'Format deadline tidak valid' }, { status: 400 });
        }
        // Tidak boleh set deadline ke masa lalu
        if (dDate.getTime() < Date.now()) {
          return NextResponse.json(
            { error: 'Deadline tidak boleh di-set ke masa lalu' },
            { status: 400 }
          );
        }
        deadlineISO = dDate.toISOString();
      }
      if (deadlineISO !== quest.due_date) {
        updates.due_date = deadlineISO;
        changes.due_date = { from: quest.due_date, to: deadlineISO };
      }
    }

    if (xp_reward !== undefined && xp_reward !== null) {
      const xp = parseInt(xp_reward, 10);
      if (isNaN(xp) || xp < 1 || xp > 100) {
        return NextResponse.json({ error: 'XP harus antara 1-100' }, { status: 400 });
      }
      if (xp !== quest.xp_reward) {
        // XP hanya boleh diubah jika belum ada submission sama sekali
        if ((slotsTaken || 0) > 0) {
          return NextResponse.json(
            { error: 'XP tidak bisa diubah karena sudah ada peserta yang mengambil quest (anti-fraud)' },
            { status: 400 }
          );
        }
        updates.xp_reward = xp;
        changes.xp_reward = { from: quest.xp_reward, to: xp };
      }
    }

    if (max_slots !== undefined) {
      const slots = max_slots ? parseInt(max_slots, 10) : null;
      if (slots !== null && (isNaN(slots) || slots < 1 || slots > 999)) {
        return NextResponse.json({ error: 'Max slots tidak valid (1-999 atau kosong)' }, { status: 400 });
      }
      // Tidak boleh kurang dari current_slots_taken
      if (slots !== null && slots < (quest.current_slots_taken || 0)) {
        return NextResponse.json(
          { error: `Max slots tidak boleh kurang dari slot yang sudah terisi (${quest.current_slots_taken})` },
          { status: 400 }
        );
      }
      if (slots !== quest.max_slots) {
        updates.max_slots = slots;
        changes.max_slots = { from: quest.max_slots, to: slots };
      }
    }

    // Tidak ada perubahan
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, message: 'Tidak ada perubahan', quest });
    }

    // 5. Update quest
    const actorType = admin ? 'admin' : 'pembina';
    const actorId = admin ? (admin as any).sub : pembina!.pembina_id;
    const actorName = admin ? (admin as any).name : pembina!.name;

    updates.edited_at = new Date().toISOString();
    updates.edited_by_type = actorType;
    updates.edited_by_id = actorId;

    const { data: updated, error: uErr } = await supabase
      .from('activities')
      .update(updates)
      .eq('id', questId)
      .select()
      .single();
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // 6. Insert audit log
    await supabase.from('quest_audit_logs').insert({
      quest_id: questId,
      quest_title: updated.title,
      action: 'edit',
      actor_type: actorType,
      actor_id: actorId,
      actor_name: actorName,
      changes,
      created_at: new Date().toISOString()
    });

    // 7. Insert system message di chat (transparansi ke peserta)
    if (quest.group_id) {
      const changedFields = Object.keys(changes).join(', ');
      await supabase.from('chat_messages').insert({
        group_id: quest.group_id,
        sender_type: 'system',
        sender_id: actorId,
        sender_name: 'Sistem',
        message_type: 'system',
        content: `📝 ${actorName} mengedit quest "${updated.title}" (perubahan: ${changedFields})`
      });
    }

    return NextResponse.json({ success: true, quest: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ============================================================
// DELETE — Admin only, hard delete
// Wajib header x-confirm: "HAPUS"
// Hanya boleh jika quest_logs count = 0
// ============================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questId = params.id;
    if (!questId) return NextResponse.json({ error: 'Quest ID wajib diisi' }, { status: 400 });

    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json(
        { error: 'Hanya admin yang bisa menghapus quest permanen. Pembina gunakan archive.' },
        { status: 403 }
      );
    }

    // Konfirmasi wajib ketik "HAPUS"
    const confirm = req.headers.get('x-confirm');
    if (confirm !== 'HAPUS') {
      return NextResponse.json(
        { error: 'Konfirmasi gagal. Kirim header x-confirm: "HAPUS" untuk menghapus permanen.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch quest
    const { data: quest, error: qErr } = await supabase
      .from('activities')
      .select('id, title, group_id, created_by_pembina_id')
      .eq('id', questId)
      .eq('is_quest', true)
      .single();
    if (qErr || !quest) {
      return NextResponse.json({ error: 'Quest tidak ditemukan' }, { status: 404 });
    }

    // Cek apakah sudah ada peserta yang ambil quest (in_progress atau completed)
    const { count } = await supabase
      .from('quest_logs')
      .select('id', { count: 'exact', head: true })
      .eq('quest_id', questId)
      .in('status', ['in_progress', 'completed']);

    if ((count || 0) > 0) {
      return NextResponse.json(
        {
          error: `Quest tidak bisa dihapus permanen karena sudah ada ${count} peserta yang mengambil. Gunakan archive sebagai alternatif — history tetap tersimpan untuk audit.`,
          hint: 'archive'
        },
        { status: 400 }
      );
    }

    // Insert audit log SEBELUM delete (karena quest_id tidak ada FK, log tetap ada)
    await supabase.from('quest_audit_logs').insert({
      quest_id: questId,
      quest_title: quest.title,
      action: 'delete',
      actor_type: 'admin',
      actor_id: (admin as any).sub,
      actor_name: (admin as any).name,
      created_at: new Date().toISOString()
    });

    // Hapus chat_messages yang bertipe quest_card untuk quest ini
    await supabase
      .from('chat_messages')
      .delete()
      .eq('quest_id', questId);

    // Hapus quest_logs yang statusnya 'available' atau 'cancelled' (jika ada)
    await supabase
      .from('quest_logs')
      .delete()
      .eq('quest_id', questId);

    // Hapus activity_completions
    await supabase
      .from('activity_completions')
      .delete()
      .eq('activity_id', questId);

    // Hard delete quest
    const { error: dErr } = await supabase
      .from('activities')
      .delete()
      .eq('id', questId);
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

    // System message (kalau grup masih ada)
    if (quest.group_id) {
      await supabase.from('chat_messages').insert({
        group_id: quest.group_id,
        sender_type: 'system',
        sender_id: (admin as any).sub,
        sender_name: 'Sistem',
        message_type: 'system',
        content: `🗑️ Admin menghapus permanen quest "${quest.title}"`
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
