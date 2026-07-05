// ============================================================
// /api/bkk-teachers/reset-password — Admin resets BKK password
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, hashPassword } from '@/lib/auth';

function generateBKKPassword(): string {
  const symbols = '!@#$%&*';
  const alphanum = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const year = new Date().getFullYear();
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  let tail = '';
  for (let i = 0; i < 4; i++) {
    tail += alphanum[Math.floor(Math.random() * alphanum.length)];
  }
  return `Bkk${year}${symbol}${tail}`;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    const password = generateBKKPassword();
    const hash = await hashPassword(password);

    const supabase = createServerClient();
    const { error } = await supabase
      .from('bkk_teachers')
      .update({ password_hash: hash, raw_password: password })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, raw_password: password });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
