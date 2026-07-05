// ============================================================
// /api/auth/logout — Clear all auth cookies (admin/intern/bkk/pembina)
// ============================================================

import { NextResponse } from 'next/server';
import { clearAdminCookie, clearInternCookie, clearBKKCookie, clearPembinaCookie } from '@/lib/auth';

export async function POST() {
  await clearAdminCookie();
  await clearInternCookie();
  await clearBKKCookie();
  await clearPembinaCookie();
  return NextResponse.json({ success: true });
}
