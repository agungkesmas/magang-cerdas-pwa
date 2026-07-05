// ============================================================
// /api/admin/profile — Admin get profile + change password
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, hashPassword, verifyPassword } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
      success: true,
      profile: { email: admin.email, name: admin.name, role: admin.role }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { current_password, new_password } = await req.json();
    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Password lama dan baru wajib diisi' }, { status: 400 });
    }
    if (new_password.length < 8) {
      return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get current hash
    const { data: adminRow } = await supabase
      .from('admins')
      .select('id, password_hash')
      .eq('id', admin.sub)
      .single();
    if (!adminRow) return NextResponse.json({ error: 'Admin tidak ditemukan' }, { status: 404 });

    // Verify current password
    const valid = await verifyPassword(current_password, adminRow.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Password lama salah' }, { status: 401 });
    }

    // Update password
    const newHash = await hashPassword(new_password);
    const { error } = await supabase
      .from('admins')
      .update({ password_hash: newHash })
      .eq('id', admin.sub);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
