// ============================================================
// /api/interns/batch-create — Batch create interns from array
// Input: { interns: [{ name, major, department, school_origin, start_date, end_date }] }
// Output: { results: [{ name, username, raw_password, error? }] }
//
// Auto-create school: jika school_origin belum ada di tabel schools,
// sistem auto-create entri baru (name only, address/contact kosong).
// Normalisasi nama: trim + collapse multiple spaces (case-sensitive match
// untuk hindari duplikat karena typo kapitalisasi).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, generateInternCredentials, hashPassword } from '@/lib/auth';
import { Department } from '@/types';

const VALID_DEPARTMENTS: Department[] = ['Pelayanan', 'Pemasaran', 'Keuangan'];

// Normalize school name: trim + collapse multiple spaces
function normalizeSchoolName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

// Cache sekolah yang sudah di-fetch/created dalam request ini
// supaya tidak query DB berulang untuk nama sekolah sama
const schoolCache = new Map<string, boolean>();

async function ensureSchoolExists(supabase: ReturnType<typeof createServerClient>, rawName: string): Promise<void> {
  const name = normalizeSchoolName(rawName);
  if (!name) return;

  // Cek cache dulu
  if (schoolCache.has(name)) return;

  // Cek database (case-insensitive untuk hindari duplikat karena typo kapitalisasi)
  const { data: existing } = await supabase
    .from('schools')
    .select('id, name')
    .ilike('name', name)
    .maybeSingle();

  if (!existing) {
    // Auto-create school baru (name only, contact kosong — admin bisa edit nanti)
    const { error } = await supabase.from('schools').insert({
      name,
      address: null,
      contact_person: null,
      contact_phone: null,
      logbook_enabled: true
    });
    if (error) {
      console.error('[batch-create] Failed to auto-create school:', name, error.message);
    } else {
      console.log('[batch-create] Auto-created school:', name);
    }
  }

  // Mark as cached (regardless of insert success — supaya tidak retry berulang)
  schoolCache.set(name, true);
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { interns } = await req.json();
    if (!Array.isArray(interns) || interns.length === 0) {
      return NextResponse.json({ error: 'Data peserta wajib diisi (array)' }, { status: 400 });
    }
    if (interns.length > 100) {
      return NextResponse.json({ error: 'Maksimal 100 peserta per batch' }, { status: 400 });
    }

    const supabase = createServerClient();
    const results: any[] = [];
    const autoCreatedSchools: string[] = [];

    for (let i = 0; i < interns.length; i++) {
      const item = interns[i];
      try {
        // Validate
        if (!item.name?.trim()) {
          results.push({ index: i + 1, name: item.name || '(kosong)', error: 'Nama wajib diisi' });
          continue;
        }
        if (!item.department || !VALID_DEPARTMENTS.includes(item.department)) {
          results.push({ index: i + 1, name: item.name, error: `Departemen tidak valid: ${item.department}` });
          continue;
        }

        // Auto-create school jika belum ada
        const schoolNameRaw = item.school_origin?.trim() || '';
        if (schoolNameRaw) {
          const normalized = normalizeSchoolName(schoolNameRaw);
          // Cek cache — kalau belum ada, cek DB dan create kalau perlu
          if (!schoolCache.has(normalized)) {
            const { data: existing } = await supabase
              .from('schools')
              .select('id, name')
              .ilike('name', normalized)
              .maybeSingle();
            if (!existing) {
              const { error: schoolErr } = await supabase.from('schools').insert({
                name: normalized,
                address: null,
                contact_person: null,
                contact_phone: null,
                logbook_enabled: true
              });
              if (!schoolErr) {
                autoCreatedSchools.push(normalized);
                console.log('[batch-create] Auto-created school:', normalized);
              }
            }
            schoolCache.set(normalized, true);
          }
        }

        // Generate credentials
        const { username, password } = generateInternCredentials(item.name);
        const passwordHash = await hashPassword(password);

        // Insert intern
        const { data, error } = await supabase.from('interns').insert({
          name: item.name.trim(),
          school_origin: schoolNameRaw ? normalizeSchoolName(schoolNameRaw) : null,
          major: item.major?.trim() || 'Umum',
          department: item.department,
          start_date: item.start_date || new Date().toISOString().split('T')[0],
          end_date: item.end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          email: item.email?.trim() || null,
          whatsapp: item.whatsapp?.trim() || null,
          username,
          password_hash: passwordHash,
          raw_password: password,
          total_exp: 0,
          streak_count: 0,
          is_active: true,
          logbook_enabled: true,
          survival_kit_progress: {},
          certificate_unlocked: false
        }).select().single();

        if (error) {
          results.push({ index: i + 1, name: item.name, error: error.message });
        } else {
          results.push({
            index: i + 1,
            name: data.name,
            username: data.username,
            raw_password: data.raw_password,
            major: data.major,
            department: data.department,
            school_origin: data.school_origin,
            email: data.email,
            whatsapp: data.whatsapp,
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
      message: `${successCount} peserta berhasil dibuat, ${errorCount} gagal${autoCreatedSchools.length > 0 ? `. ${autoCreatedSchools.length} sekolah baru otomatis dibuat: ${autoCreatedSchools.join(', ')}` : ''}`,
      results,
      success_count: successCount,
      error_count: errorCount,
      auto_created_schools: autoCreatedSchools
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
