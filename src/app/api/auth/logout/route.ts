// ============================================================
// /api/auth/logout — Clear admin/intern cookies
// ============================================================

import { NextResponse } from 'next/server';
import { clearAdminCookie, clearInternCookie, clearBKKCookie } from '@/lib/auth';

export async function POST() {
  await clearAdminCookie();
  await clearInternCookie();
  await clearBKKCookie();
  return NextResponse.json({ success: true });
}
