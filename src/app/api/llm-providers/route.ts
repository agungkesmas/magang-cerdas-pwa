// ============================================================
// /api/llm-providers — List available LLM providers + status
// ============================================================

import { NextResponse } from 'next/server';
import { LLM_PROVIDERS, LLMProvider } from '@/types';
import { getAdminToken } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeProvider = (process.env.LLM_PROVIDER as LLMProvider) || 'groq';
    const providers = LLM_PROVIDERS.map((p) => ({
      ...p,
      apiKeyConfigured: !!(process.env[p.envKey] && process.env[p.envKey]!.length > 5),
      currentModel: process.env[`${p.id.toUpperCase()}_MODEL`] || p.defaultModel,
      isActive: p.id === activeProvider
    }));

    return NextResponse.json({ success: true, providers, activeProvider });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
