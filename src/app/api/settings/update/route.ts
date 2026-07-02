// ============================================================
// /api/settings/update — Update app settings (admin only)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';
import { LLMProvider, LLM_PROVIDERS } from '@/types';

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const allowedFields = [
      'office_lat',
      'office_lng',
      'geofence_radius_meters',
      'llm_provider',
      'llm_model',
      'office_name',
      'office_address'
    ];

    const updates: Record<string, unknown> = {};
    for (const f of allowedFields) {
      if (body[f] !== undefined) updates[f] = body[f];
    }

    // Validate LLM provider
    if (updates.llm_provider) {
      const provider = updates.llm_provider as LLMProvider;
      const config = LLM_PROVIDERS.find((p) => p.id === provider);
      if (!config) {
        return NextResponse.json({ error: `Unknown LLM provider: ${provider}` }, { status: 400 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const supabase = createServerClient();
    const { error } = await supabase.from('app_settings').update(updates).eq('id', 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, updated: updates });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
