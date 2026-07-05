// ============================================================
// /api/settings/get — Get app settings (office, geofence, LLM provider)
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getInternToken } from '@/lib/auth';

export async function GET() {
  try {
    // Both admin and intern can read settings
    const admin = await getAdminToken();
    const intern = await getInternToken();
    if (!admin && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('office_lat, office_lng, geofence_radius_meters, llm_provider, llm_model, office_name, office_address')
      .eq('id', 1)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mask LLM API key — never return full key
    let llmKeyConfigured = false;
    if (admin) {
      // Admin can see if key is set
      const activeProvider = data.llm_provider;
      const config = (await import('@/types')).LLM_PROVIDERS.find((p) => p.id === activeProvider);
      if (config) {
        const key = process.env[config.envKey];
        llmKeyConfigured = !!(key && key.length > 5);
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...data,
        llm_api_key_configured: llmKeyConfigured
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
