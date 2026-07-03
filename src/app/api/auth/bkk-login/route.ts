// ============================================================
// /api/auth/bkk-login — BKK Teacher login via email ATAU BKK-XXXX
// Returns: token + teacher info + schools array
// WITH rate-limit (5 attempts per 15min, lock 30min after)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyPassword, signBKKToken, setBKKCookie } from '@/lib/auth';
import { checkRateLimit, recordFailure, clearRateLimit, getClientIP } from '@/lib/rate-limit';

const ROUTE_ID = 'bkk-login';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);

    // Rate-limit check
    const rl = checkRateLimit(ROUTE_ID, ip);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan login gagal. Coba lagi dalam ${rl.retryAfterSeconds || 1800} detik.`,
          retryAfter: rl.retryAfterSeconds
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfterSeconds || 1800),
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email/ID BKK dan password wajib diisi' }, { status: 400 });
    }

    const loginInput = String(email).trim();
    const supabase = createServerClient();

    // Deteksi: input mengandung '@' → email, kalau tidak → anggap ID BKK (BKK-XXXX)
    let query = supabase
      .from('bkk_teachers')
      .select('*')
      .eq('is_active', true);

    if (loginInput.includes('@')) {
      // Login via email
      query = query.eq('email', loginInput.toLowerCase());
    } else {
      // Login via bkk_id (BKK-XXXX) — case insensitive
      const upperInput = loginInput.toUpperCase();
      const lowerInput = loginInput.toLowerCase();
      query = query.or(`bkk_id.eq.${upperInput},bkk_id.eq.${lowerInput},bkk_id.eq.${loginInput}`);
    }

    const { data: teacher, error } = await query.maybeSingle();

    const INVALID = 'Email/ID BKK atau password salah';

    if (error || !teacher) {
      recordFailure(ROUTE_ID, ip);
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    const valid = await verifyPassword(password, teacher.password_hash);
    if (!valid) {
      recordFailure(ROUTE_ID, ip);
      const remaining = checkRateLimit(ROUTE_ID, ip).remainingAttempts;
      const hint = remaining <= 2 ? ` (Sisa percobaan: ${remaining})` : '';
      return NextResponse.json(
        { error: `${INVALID}${hint}` },
        { status: 401, headers: { 'X-RateLimit-Remaining': String(remaining) } }
      );
    }

    // Success — clear rate-limit
    clearRateLimit(ROUTE_ID, ip);

    // Get linked schools
    const { data: junctions } = await supabase
      .from('bkk_teacher_schools')
      .select('schools(id, name)')
      .eq('bkk_teacher_id', teacher.id);
    const schools = (junctions || []).map((j: any) => j.schools?.name).filter(Boolean) as string[];

    // Update last_login_at
    await supabase
      .from('bkk_teachers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', teacher.id);

    const token = signBKKToken({
      sub: teacher.id,
      teacher_id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      schools
    });
    await setBKKCookie(token);

    return NextResponse.json({
      success: true,
      teacher: {
        id: teacher.id,
        bkk_id: teacher.bkk_id,
        email: teacher.email,
        name: teacher.name,
        schools
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
