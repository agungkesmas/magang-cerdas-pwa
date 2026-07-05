// ============================================================
// /api/intern/profile — Intern get + update own profile
// GET: return profile (no sensitive fields like password)
// PUT: update phone, whatsapp, email, photo_url only
//      (name, major, school, dept, username, password = READ-ONLY)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

// Email validation sederhana
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// WhatsApp / phone Indonesia validation (opsional, accepts +62/0/8)
function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-+]/g, '');
  return /^[0-9]{8,15}$/.test(cleaned);
}

export async function GET() {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('interns')
      .select('id, name, username, major, major_id, department, school_origin, start_date, end_date, total_exp, streak_count, phone, email, whatsapp, photo_url, is_active, logbook_enabled, created_at')
      .eq('id', intern.intern_id)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Profile tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ success: true, profile: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, photo_url, email, whatsapp } = await req.json();

    // HANYA phone, photo_url, email, whatsapp yang boleh diupdate (strict whitelist)
    const updates: Record<string, unknown> = {};
    if (phone !== undefined) {
      const p = phone?.trim() || null;
      if (p && !isValidPhone(p)) {
        return NextResponse.json({ error: 'Format nomor telepon tidak valid. Gunakan 8-15 digit angka.' }, { status: 400 });
      }
      updates.phone = p;
    }
    if (photo_url !== undefined) updates.photo_url = photo_url || null;
    if (email !== undefined) {
      const e = email?.trim() || null;
      if (e && !isValidEmail(e)) {
        return NextResponse.json({ error: 'Format email tidak valid. Contoh: nama@email.com' }, { status: 400 });
      }
      updates.email = e;
    }
    if (whatsapp !== undefined) {
      const w = whatsapp?.trim() || null;
      if (w && !isValidPhone(w)) {
        return NextResponse.json({ error: 'Format nomor WhatsApp tidak valid. Gunakan 8-15 digit angka.' }, { status: 400 });
      }
      updates.whatsapp = w;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field valid untuk diupdate. Hanya foto profil, email, WhatsApp, dan nomor telepon yang bisa diubah.' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('interns').update(updates).eq('id', intern.intern_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
