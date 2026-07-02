// ============================================================
// /api/generate-task — Generate AI-adaptive task instruction
// Uses multi-provider LLM router with stub fallback
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminToken, getInternToken } from '@/lib/auth';
import { generateTaskInstruction } from '@/lib/llm';
import { createServerClient } from '@/lib/supabase';
import { LLMProvider } from '@/types';

export async function POST(req: NextRequest) {
  try {
    // Auth: admin or intern can call
    const admin = await getAdminToken();
    const intern = await getInternToken();
    if (!admin && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { base_task, major, task_id, intern_id } = await req.json();
    if (!base_task || !major) {
      return NextResponse.json({ error: 'base_task dan major wajib diisi' }, { status: 400 });
    }

    // Optional: provider override from request body
    const provider = req.headers.get('x-llm-provider') as LLMProvider | null;

    const result = await generateTaskInstruction(base_task, major, provider ? { provider } : undefined);

    // Cache the AI instruction in Task_Completions if task_id + intern_id provided
    if (task_id && intern_id) {
      try {
        const supabase = createServerClient();
        // Upsert: find existing completion record, update ai_instruction
        const { data: existing } = await supabase
          .from('task_completions')
          .select('id')
          .eq('intern_id', intern_id)
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
