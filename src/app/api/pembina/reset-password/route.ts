// ============================================================
// /api/pembina/reset-password — Admin: reset password pembina
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, hashPassword } from '@/lib/auth';

function generatePassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let pwd = 'Pembina2026!';
  for (let i = 0; i < 4; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    const rawPassword = generatePassword();
    const passwordHash = await hashPassword(rawPassword);

    const supabase = createServerClient();
    const { error } = await supabase
      .from('pembina_magang')
      .update({ password_hash: passwordHash, raw_password: rawPassword })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, raw_password: rawPassword });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
