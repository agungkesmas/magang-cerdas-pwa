// ============================================================
// /api/admin/certificate-settings — Admin CRUD untuk certificate config
// GET: ambil config saat ini
// PUT: update config (logo_url, border_color, accent_color)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('certificate_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      settings: data || {
        id: 1,
        logo_url: null,
        border_color: '#0F4C81',
        accent_color: '#D4AF37'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { logo_url, border_color, accent_color } = body;

    // Validasi warna (hex format #RRGGBB)
    if (border_color !== undefined && !HEX_COLOR_REGEX.test(border_color)) {
      return NextResponse.json({ error: 'border_color harus format #RRGGBB (mis: #0F4C81)' }, { status: 400 });
    }
    if (accent_color !== undefined && !HEX_COLOR_REGEX.test(accent_color)) {
      return NextResponse.json({ error: 'accent_color harus format #RRGGBB (mis: #D4AF37)' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Build update object (hanya field yang dikirim)
    const updates: any = { updated_at: new Date().toISOString(), updated_by: admin.sub };
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (border_color !== undefined) updates.border_color = border_color;
    if (accent_color !== undefined) updates.accent_color = accent_color;

    // Upsert (kalau belum ada row, insert; kalau sudah ada, update)
    const { data, error } = await supabase
      .from('certificate_settings')
      .upsert({
        id: 1,
        ...updates
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[admin/certificate-settings] upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (e: any) {
    console.error('[admin/certificate-settings] fatal:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
