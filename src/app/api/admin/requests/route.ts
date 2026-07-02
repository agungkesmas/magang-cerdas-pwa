// ============================================================
// /api/admin/requests — Admin: list all internship requests
// GET  → list all requests (filterable by status, school_name)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // submitted|under_review|accepted|rejected|completed|cancelled
    const school = searchParams.get('school');

    const supabase = createServerClient();
    let query = supabase
      .from('internship_requests')
      .select(`
        *,
        bkk_teachers!inner(name, email, phone)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (school) query = query.ilike('school_name', `%${school}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, requests: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
