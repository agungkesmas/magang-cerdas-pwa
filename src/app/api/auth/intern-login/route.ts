// ============================================================
// /api/auth/intern-login — Intern username+password login
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyPassword, signInternToken, setInternCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: intern, error } = await supabase
      .from('interns')
      .select('*')
      .eq('username', username.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !intern) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const valid = await verifyPassword(password, intern.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const token = signInternToken({
      sub: intern.id,
      intern_id: intern.id,
      name: intern.name,
      username: intern.username,
      department: intern.department
    });
    await setInternCookie(token);

    return NextResponse.json({
      success: true,
      intern: {
        id: intern.id,
        name: intern.name,
        username: intern.username,
        major: intern.major,
        department: intern.department,
        total_exp: intern.total_exp,
        streak_count: intern.streak_count
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
