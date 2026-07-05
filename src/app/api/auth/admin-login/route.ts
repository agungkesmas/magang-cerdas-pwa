// ============================================================
// /api/auth/admin-login — Admin email+password login
// WITH rate-limit (5 attempts per 15min, lock 30min after)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyPassword, signAdminToken, setAdminCookie } from '@/lib/auth';
import { checkRateLimit, recordFailure, clearRateLimit, getClientIP } from '@/lib/rate-limit';

const ROUTE_ID = 'admin-login';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);

    // Rate-limit check (before credential validation)
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
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Find admin by email
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Generic error to prevent user enumeration
    const INVALID = 'Email atau password salah';

    if (error || !admin) {
      recordFailure(ROUTE_ID, ip);
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    // Verify password
    const valid = await verifyPassword(password, admin.password_hash);
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

    // Issue JWT + set cookie
    const token = signAdminToken({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    });
    await setAdminCookie(token);

    return NextResponse.json({
      success: true,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
