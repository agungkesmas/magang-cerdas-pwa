// ============================================================
// /api/pembina/create — Admin: tambah pembina magang baru
// Generate pembina_id format PB-XXXX (auto-increment)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, hashPassword } from '@/lib/auth';
import { syncPembinaToSystemGroups } from '@/lib/system-groups';

const VALID_DEPARTMENTS = ['Pelayanan', 'Pemasaran', 'Keuangan', 'Lintas Bidang'];

// Generate random password
function generatePassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let pwd = 'Pembina2026!';
  for (let i = 0; i < 4; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// Generate next pembina_id (PB-0001, PB-0002, ...)
async function generatePembinaId(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('pembina_magang')
    .select('pembina_id')
    .order('pembina_id', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return 'PB-0001';
  const last = data[0].pembina_id;
  const match = last.match(/^PB-(\d+)$/);
  if (!match) return 'PB-0001';
  const next = parseInt(match[1], 10) + 1;
  return `PB-${String(next).padStart(4, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, email, department, phone } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
    if (!department || !VALID_DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: 'Departemen tidak valid' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Cek email unik
    const { data: existing } = await supabase
      .from('pembina_magang')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });
    }

    const pembinaId = await generatePembinaId(supabase);
    const rawPassword = generatePassword();
    const passwordHash = await hashPassword(rawPassword);

    const { data, error } = await supabase
      .from('pembina_magang')
      .insert({
        pembina_id: pembinaId,
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        raw_password: rawPassword,
        name: name.trim(),
        phone: phone?.trim() || null,
        department,
        is_active: true
      })
      .select('id, pembina_id, email, name, department, raw_password')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ============================================================
    // AUTO-LINK: Tambahkan pembina baru ke grup departemen yang aktif
    // Cari grup dengan department = pembina.department & group_type = 'department' & is_active = true
    // Skip kalau department = 'Lintas Bidang' (tidak ada grup spesifik)
    // ============================================================
    let linkedGroups: string[] = [];
    if (department !== 'Lintas Bidang') {
      const { data: deptGroups } = await supabase
        .from('groups')
        .select('id, name')
        .eq('department', department)
        .eq('group_type', 'department')
        .eq('is_active', true);

      if (deptGroups && deptGroups.length > 0) {
        const memberInserts = deptGroups.map((g: any) => ({
          group_id: g.id,
          user_type: 'pembina' as const,
          user_id: (data as any).id,
          role: 'member' as const, // pembina tambahan = member, bukan group_admin
          added_by_type: 'admin' as const,
          added_by_id: admin.sub
        }));
        const { error: memberErr } = await supabase.from('group_members').insert(memberInserts);
        if (!memberErr) {
          linkedGroups = deptGroups.map((g: any) => g.name);
        }
      }
    }

    // Auto-sync to system department groups
    await syncPembinaToSystemGroups(supabase, data.id, department, true);

    return NextResponse.json({
      success: true,
      pembina: data,
      linked_groups: linkedGroups // info: grup mana saja yang auto-link
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
