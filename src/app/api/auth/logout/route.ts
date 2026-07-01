// ============================================================
// /api/auth/logout — Clear admin/intern cookies
// ============================================================

import { NextResponse } from 'next/server';
import { clearAdminCookie, clearInternCookie } from '@/lib/auth';

export async function POST() {
  await clearAdminCookie();
  await clearInternCookie();
  return NextResponse.json({ success: true });
}
