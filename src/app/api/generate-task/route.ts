// ============================================================
// /api/generate-task — Generate AI-adaptive task instruction
// Cache: 1 AI instruction per (task_id, intern_id) — store di task_completions chunk_index=0
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminToken, getInternToken } from '@/lib/auth';
import { generateTaskInstruction } from '@/lib/llm';
import { createServerClient } from '@/lib/supabase';
import { LLMProvider } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const intern = await getInternToken();
    if (!admin && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { base_task, major, task_id, intern_id } = await req.json();
    if (!base_task || !major) {
      return NextResponse.json({ error: 'base_task dan major wajib diisi' }, { status: 400 });
    }

    // Optional: provider override from request header
    const provider = req.headers.get('x-llm-provider') as LLMProvider | null;

    const result = await generateTaskInstruction(base_task, major, provider ? { provider } : undefined);

    // Cache: jika task_id + intern_id diberikan, simpan ke task_completions chunk_index=0
    // (khusus mode individual & assigned — untuk team, AI instruction disimpan per intern saat complete)
    if (task_id && intern_id) {
      try {
        const supabase = createServerClient();
        const { data: existing } = await supabase
          .from('task_completions')
          .select('id, ai_instruction')
          .eq('intern_id', intern_id)
          .eq('task_id', task_id)
          .eq('chunk_index', 0)
          .maybeSingle();

        if (existing) {
          // Update hanya jika ai_instruction masih kosong (jangan overwrite yang sudah ada)
          if (!existing.ai_instruction) {
            await supabase
              .from('task_completions')
              .update({ ai_instruction: result.text })
              .eq('id', existing.id);
          }
        } else {
          // Buat row baru chunk_index=0 dengan ai_instruction (completed_count=0, belum complete)
          await supabase.from('task_completions').insert({
            intern_id,
            task_id,
            chunk_index: 0,
            completed_count: 0,
            ai_instruction: result.text
          });
        }
      } catch (cacheErr) {
        console.warn('[generate-task] cache failed:', cacheErr);
      }
    }

    return NextResponse.json({
      success: true,
      instruction: result.text,
      source: result.source,
      provider: result.provider || null,
      model: result.model || null,
      latencyMs: result.latencyMs
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
