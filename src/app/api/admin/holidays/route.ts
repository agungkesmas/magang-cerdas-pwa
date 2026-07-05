// ============================================================
// /api/admin/holidays — CRUD untuk libur khusus BPJS (tabel app_holidays)
// Akses: Admin only
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';
import { setCustomHolidays } from '@/lib/holidays';

// === GET: list semua custom holidays ===
export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('app_holidays')
      .select('*')
      .order('date', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, holidays: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// === POST: tambah custom holiday ===
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { date, name, type } = await req.json();
    if (!date || !name) {
      return NextResponse.json({ error: 'Tanggal dan nama wajib diisi' }, { status: 400 });
    }

    // Validasi format tanggal (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Cek duplikasi
    const { data: existing } = await supabase
      .from('app_holidays')
      .select('id')
      .eq('date', date)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Tanggal sudah ada di daftar libur' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('app_holidays')
      .insert({
        date,
        name: name.trim(),
        type: type || 'custom'
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Refresh cache
    await refreshCache(supabase);

    return NextResponse.json({ success: true, holiday: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// === DELETE: hapus custom holiday ===
export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    const supabase = createServerClient();
    const { error } = await supabase
      .from('app_holidays')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Refresh cache
    await refreshCache(supabase);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// === Helper: refresh cache custom holidays ===
async function refreshCache(supabase: any) {
  try {
    const { data } = await supabase
      .from('app_holidays')
      .select('date, name, type')
      .order('date', { ascending: true });
    const customHolidays = (data || []).map((h: any) => ({
      date: h.date,
      name: h.name,
      type: h.type || 'custom'
    }));
    setCustomHolidays(customHolidays);
  } catch (e) {
    // Silent fail — cache lama tetap dipakai
  }
}
