// ============================================================
// /api/certificate/settings — Public read certificate config
// Dipakai di halaman /verify/[id] (publik, tanpa login) &
// /intern/certificate (peserta)
//
// Return: { logo_url, border_color, accent_color }
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('certificate_settings')
      .select('logo_url, border_color, accent_color')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('[certificate/settings] error:', error);
      // Fallback ke default
      return NextResponse.json({
        success: true,
        settings: {
          logo_url: null,
          border_color: '#0F4C81',
          accent_color: '#D4AF37'
        }
      });
    }

    // Kalau belum ada row, pakai default
    const settings = data || {
      logo_url: null,
      border_color: '#0F4C81',
      accent_color: '#D4AF37'
    };

    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    console.error('[certificate/settings] fatal:', e);
    return NextResponse.json({
      success: true,
      settings: {
        logo_url: null,
        border_color: '#0F4C81',
        accent_color: '#D4AF37'
      }
    });
  }
}
