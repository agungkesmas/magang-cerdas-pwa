// ============================================================
// /api/pembina/interns/[id]/tags — Pembina toggle tag peserta bimbingan
//
// Standar industri: Pembina yang paling tahu karakter peserta sehari-hari,
// jadi perlu akses untuk tag/flag (Unggul, Perlu Perhatian, dll).
//
// Tag sharing dengan admin (sama kolom interns.tags) — siapa yang kasih
// tidak dicatat (Opsi A dari diskusi: simpel & konsisten).
//
// Akses: Hanya pembina yang anggota grup yang sama dengan peserta.
// Validasi tag: harus ada di PREDEFINED_TAGS (anti arbitrary tag).
//
// Peserta TIDAK bisa lihat tag-nya sendiri (privacy — untuk evaluasi internal).
// BKK TIDAK bisa lihat tag (privacy — internal BPJS).
//
// Body: { tag: string }
// Response: { success: true, tags: string[] (new array) }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken } from '@/lib/auth';

// Harus sama dengan PREDEFINED_TAGS di admin/interns/page.tsx
// (sumber kebenaran: kode admin — pembina tidak boleh add arbitrary tag)
const PREDEFINED_TAGS = [
  'Unggul',
  'Perlu Perhatian',
  'Leadership',
  'Fast Learner',
  'Bermasalah'
];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pembina = await getPembinaToken();
    if (!pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const internId = params.id;
    const { tag } = await req.json();

    // === Validasi input ===
    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Tag wajib diisi' }, { status: 400 });
    }
    if (!PREDEFINED_TAGS.includes(tag)) {
      return NextResponse.json(
        { error: `Tag tidak valid. Pilihan: ${PREDEFINED_TAGS.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // === 1. Verifikasi pembina anggota grup yang sama dengan peserta ===
    // (Pola sama dengan /api/pembina/assign-task — anti pembina asing edit tag)
    const { data: pembinaGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'pembina')
      .eq('user_id', pembina.pembina_id);

    const { data: internGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'peserta')
      .eq('user_id', internId);

    const pembinaGroupIds = (pembinaGroups || []).map((g: any) => g.group_id);
    const internGroupIds = (internGroups || []).map((g: any) => g.group_id);
    const hasOverlap = pembinaGroupIds.some((id: string) => internGroupIds.includes(id));

    if (!hasOverlap) {
      return NextResponse.json(
        { error: 'Peserta ini tidak ada di grup yang Anda bimbing' },
        { status: 403 }
      );
    }

    // === 2. Fetch current tags ===
    const { data: intern, error: iErr } = await supabase
      .from('interns')
      .select('id, tags, is_active')
      .eq('id', internId)
      .maybeSingle();

    if (iErr || !intern) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
    }

    if (!intern.is_active) {
      return NextResponse.json(
        { error: 'Tidak bisa edit tag peserta yang sudah diarsipkan' },
        { status: 400 }
      );
    }

    // === 3. Toggle tag ===
    const currentTags: string[] = Array.isArray(intern.tags) ? intern.tags : [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];

    // === 4. Update DB ===
    const { error: uErr } = await supabase
      .from('interns')
      .update({ tags: newTags })
      .eq('id', internId);

    if (uErr) {
      console.error('[pembina/interns/tags] update error:', uErr);
      return NextResponse.json({ error: `Gagal update tag: ${uErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tags: newTags,
      action: currentTags.includes(tag) ? 'removed' : 'added'
    });
  } catch (e: any) {
    console.error('[pembina/interns/tags] error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
