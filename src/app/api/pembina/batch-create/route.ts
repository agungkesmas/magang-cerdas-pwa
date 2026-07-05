// ============================================================
// /api/pembina/batch-create — Batch create pembina from array
// Input: { pembina: [{ name, email, department, phone }] }
// Output: { results: [{ name, pembina_id, raw_password, error? }] }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, hashPassword } from '@/lib/auth';

const VALID_DEPARTMENTS = ['Pelayanan', 'Pemasaran', 'Keuangan', 'Lintas Bidang'];

function generatePassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let pwd = 'Pembina2026!';
  for (let i = 0; i < 4; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

async function generatePembinaId(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('pembina_magang')
    .select('pembina_id')
    .order('pembina_id', { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return 'PB-0001';
  const match = data[0].pembina_id?.match(/^PB-(\d+)$/);
  if (!match) return 'PB-0001';
  return `PB-${String(parseInt(match[1], 10) + 1).padStart(4, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pembina } = await req.json();
    if (!Array.isArray(pembina) || pembina.length === 0) {
      return NextResponse.json({ error: 'Data pembina wajib diisi (array)' }, { status: 400 });
    }
    if (pembina.length > 100) {
      return NextResponse.json({ error: 'Maksimal 100 pembina per batch' }, { status: 400 });
    }

    const supabase = createServerClient();
    const results: any[] = [];

    for (let i = 0; i < pembina.length; i++) {
      const item = pembina[i];
      try {
        if (!item.name?.trim()) {
          results.push({ index: i + 1, name: item.name || '(kosong)', error: 'Nama wajib diisi' });
          continue;
        }
        if (!item.email?.trim()) {
          results.push({ index: i + 1, name: item.name, error: 'Email wajib diisi' });
          continue;
        }
        if (!item.department || !VALID_DEPARTMENTS.includes(item.department)) {
          results.push({ index: i + 1, name: item.name, error: `Departemen tidak valid: ${item.department}` });
          continue;
        }

        // Cek email unik
        const { data: existing } = await supabase
          .from('pembina_magang')
          .select('id')
          .eq('email', item.email.toLowerCase().trim())
          .maybeSingle();
        if (existing) {
          results.push({ index: i + 1, name: item.name, error: 'Email sudah terdaftar' });
          continue;
        }

        const pembinaId = await generatePembinaId(supabase);
        const rawPassword = generatePassword();
        const passwordHash = await hashPassword(rawPassword);

        const { data, error } = await supabase
          .from('pembina_magang')
          .insert({
            pembina_id: pembinaId,
            email: item.email.toLowerCase().trim(),
            password_hash: passwordHash,
            raw_password: rawPassword,
            name: item.name.trim(),
            phone: item.phone?.trim() || null,
            department: item.department,
            is_active: true
          })
          .select('id, pembina_id, email, name, department, raw_password')
          .single();

        if (error) {
          results.push({ index: i + 1, name: item.name, error: error.message });
        } else {
          // Auto-link ke grup departemen (kecuali Lintas Bidang)
          if (item.department !== 'Lintas Bidang') {
            const { data: deptGroups } = await supabase
              .from('groups')
              .select('id')
              .eq('department', item.department)
              .eq('group_type', 'department')
              .eq('is_active', true);
            if (deptGroups && deptGroups.length > 0) {
              const memberInserts = deptGroups.map((g: any) => ({
                group_id: g.id,
                user_type: 'pembina',
                user_id: (data as any).id,
                role: 'member',
                added_by_type: 'admin',
                added_by_id: admin.sub
              }));
              await supabase.from('group_members').insert(memberInserts);
            }
          }
          results.push({
            index: i + 1,
            name: data.name,
            pembina_id: data.pembina_id,
            email: data.email,
            raw_password: data.raw_password,
            department: data.department,
            success: true
          });
        }
      } catch (e: any) {
        results.push({ index: i + 1, name: item.name || '(error)', error: e.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `${successCount} pembina berhasil dibuat, ${errorCount} gagal`,
      results,
      success_count: successCount,
      error_count: errorCount
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
