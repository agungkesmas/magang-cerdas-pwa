// ============================================================
// /api/admin/rename-mading — One-time admin endpoint
// Rename grup sistem "All Peserta Magang" → "Mading Pengumuman"
// supaya konsisten dengan label di dashboard peserta magang.
//
// Setelah rename berhasil, endpoint ini aman dijalankan ulang (idempotent).
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function POST() {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Step 1: Cek apakah grup lama "All Peserta Magang" masih ada
    const { data: oldGroup, error: qErr } = await supabase
      .from('groups')
      .select('id, name, group_type, department, is_active')
      .eq('group_type', 'system')
      .eq('name', 'All Peserta Magang')
      .maybeSingle();

    if (qErr) {
      return NextResponse.json({ error: 'Query error: ' + qErr.message }, { status: 500 });
    }

    if (!oldGroup) {
      // Cek apakah grup baru sudah ada
      const { data: newGroup } = await supabase
        .from('groups')
        .select('id, name, group_type, department')
        .eq('group_type', 'system')
        .eq('name', 'Mading Pengumuman')
        .maybeSingle();

      if (newGroup) {
        return NextResponse.json({
          success: true,
          message: 'Grup sudah dalam nama "Mading Pengumuman" — tidak perlu rename lagi',
          group: newGroup
        });
      }
      return NextResponse.json({
        success: false,
        message: 'Grup "All Peserta Magang" tidak ditemukan, dan "Mading Pengumuman" juga belum ada'
      }, { status: 404 });
    }

    // Step 2: Update nama + description
    const { data: updated, error: uErr } = await supabase
      .from('groups')
      .update({
        name: 'Mading Pengumuman',
        description: 'Grup sistem — pengumuman resmi dari admin & pembina BPJS Ketenagakerjaan (broadcast ke semua peserta aktif)',
        updated_at: new Date().toISOString()
      })
      .eq('id', oldGroup.id)
      .select()
      .single();

    if (uErr) {
      return NextResponse.json({ error: 'Update error: ' + uErr.message }, { status: 500 });
    }

    // Step 3: Verifikasi member count tetap (rename tidak hapus anggota)
    const { count: pesertaCount } = await supabase
      .from('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', updated.id)
      .eq('user_type', 'peserta');

    const { count: pembinaCount } = await supabase
      .from('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', updated.id)
      .eq('user_type', 'pembina');

    return NextResponse.json({
      success: true,
      message: 'Berhasil! Grup "All Peserta Magang" telah di-rename menjadi "Mading Pengumuman"',
      before: oldGroup,
      after: updated,
      members: {
        peserta: pesertaCount || 0,
        pembina: pembinaCount || 0
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
