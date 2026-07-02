// ============================================================
// /api/tasks/generate-all — Pre-generate AI instructions untuk semua jurusan
// Admin create task → ketik deskripsi singkat → klik generate → AI buat variasi per jurusan
// Hasil disimpan di tabel task_completions (chunk_index=0, completed_count=0, ai_instruction=text)
// untuk semua intern yang jurusannya match
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';
import { generateTaskInstruction } from '@/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id, base_description } = await req.json();
    if (!task_id || !base_description) {
      return NextResponse.json({ error: 'task_id dan base_description wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Fetch task untuk verify exists
    const { data: task, error: tErr } = await supabase
      .from('tasks')
      .select('id, title, base_description, department, mode')
      .eq('id', task_id)
      .single();
    if (tErr || !task) {
      return NextResponse.json({ error: 'Task tidak ditemukan' }, { status: 404 });
    }

    // 2. Tentukan target interns berdasarkan mode
    let targetInterns: { id: string; major: string; major_id: string | null }[] = [];

    if (task.mode === 'individual') {
      // Semua intern aktif di departemen task
      const { data: interns, error: iErr } = await supabase
        .from('interns')
        .select('id, major, major_id')
        .eq('is_active', true)
        .eq('department', task.department);
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
      targetInterns = interns || [];
    } else {
      // assigned/team: hanya intern yang di-assign
      const { data: assignments, error: aErr } = await supabase
        .from('task_assignments')
        .select('interns!inner(id, major, major_id)')
        .eq('task_id', task_id);
      if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
      targetInterns = (assignments || [])
        .map((a: any) => a.interns)
        .filter((i: any) => i && i.id);
    }

    if (targetInterns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada intern target untuk task ini',
        generated: 0,
        instructions: []
      });
    }

    // 3. Group interns by major (unique majors) — generate 1x per major, reuse untuk intern dengan major sama
    const majorMap: Record<string, { major: string; internIds: string[] }> = {};
    targetInterns.forEach((i) => {
      const key = i.major || 'Umum';
      if (!majorMap[key]) majorMap[key] = { major: key, internIds: [] };
      majorMap[key].internIds.push(i.id);
    });

    const uniqueMajors = Object.values(majorMap);
    const results: { major: string; instruction: string; source: 'llm' | 'stub'; internCount: number }[] = [];
    let llmCount = 0;
    let stubCount = 0;

    // 4. Generate AI instruction per unique major (sequential untuk avoid rate limit)
    for (const entry of uniqueMajors) {
      const result = await generateTaskInstruction(base_description, entry.major);
      results.push({
        major: entry.major,
        instruction: result.text,
        source: result.source,
        internCount: entry.internIds.length
      });
      if (result.source === 'llm') llmCount++;
      else stubCount++;

      // 5. Simpan ke task_completions (chunk_index=0, completed_count=0) untuk setiap intern dengan major ini
      // Upsert: jika sudah ada row, update ai_instruction; jika belum, insert baru
      for (const internId of entry.internIds) {
        try {
          const { data: existing } = await supabase
            .from('task_completions')
            .select('id')
            .eq('intern_id', internId)
            .eq('task_id', task_id)
            .eq('chunk_index', 0)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('task_completions')
              .update({ ai_instruction: result.text })
              .eq('id', existing.id);
          } else {
            await supabase.from('task_completions').insert({
              intern_id: internId,
              task_id,
              chunk_index: 0,
              completed_count: 0,
              ai_instruction: result.text
            });
          }
        } catch (cacheErr) {
          console.warn('[generate-all] cache failed for intern', internId, cacheErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil generate ${results.length} instruksi AI untuk ${targetInterns.length} intern`,
      generated: results.length,
      totalInterns: targetInterns.length,
      llm_count: llmCount,
      stub_count: stubCount,
      instructions: results
    });
  } catch (e: any) {
    console.error('[generate-all] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
