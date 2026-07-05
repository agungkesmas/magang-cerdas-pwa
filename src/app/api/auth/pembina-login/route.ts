// ============================================================
// /api/auth/pembina-login — Login untuk pembina magang
// Support login dengan EMAIL atau ID Pembina (PB-XXXX)
// WITH rate-limit (5 attempts per 15min, lock 30min after)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyPassword, signPembinaToken, setPembinaCookie } from '@/lib/auth';
import { checkRateLimit, recordFailure, clearRateLimit, getClientIP } from '@/lib/rate-limit';

const ROUTE_ID = 'pembina-login';

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
      return NextResponse.json({ error: 'Email/ID Pembina dan password wajib diisi' }, { status: 400 });
    }

    const loginInput = String(email).trim();
    const supabase = createServerClient();

    // Deteksi: input mengandung '@' → email, kalau tidak → anggap ID Pembina (PB-XXXX)
    let query = supabase
      .from('pembina_magang')
      .select('id, pembina_id, email, name, department, password_hash, is_active, raw_password');

    if (loginInput.includes('@')) {
      // Login via email
      query = query.eq('email', loginInput.toLowerCase());
    } else {
      // Login via pembina_id (PB-XXXX) — case insensitive
      const upperInput = loginInput.toUpperCase();
      const lowerInput = loginInput.toLowerCase();
      query = query.or(`pembina_id.eq.${upperInput},pembina_id.eq.${lowerInput},pembina_id.eq.${loginInput}`);
    }

    const { data: pembina, error } = await query.maybeSingle();

    const INVALID = 'Email/ID Pembina atau password salah';

    if (error || !pembina) {
      recordFailure(ROUTE_ID, ip);
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    if (!pembina.is_active) {
      // Don't leak account existence — still count as failure
      recordFailure(ROUTE_ID, ip);
      return NextResponse.json({ error: 'Email/ID Pembina atau password salah' }, { status: 401 });
    }

    // Verify password
    const ok = await verifyPassword(password, pembina.password_hash);
    if (!ok) {
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

    // Update last_login_at
    await supabase.from('pembina_magang').update({ last_login_at: new Date().toISOString() }).eq('id', pembina.id);

    // Sign token
    const token = signPembinaToken({
      sub: pembina.id,
      pembina_id: pembina.id,
      pembina_code: pembina.pembina_id,
      email: pembina.email,
      name: pembina.name,
      department: pembina.department
    });
    await setPembinaCookie(token);

    return NextResponse.json({
      success: true,
      pembina: {
        id: pembina.id,
        pembina_id: pembina.pembina_id,
        email: pembina.email,
        name: pembina.name,
        department: pembina.department
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
