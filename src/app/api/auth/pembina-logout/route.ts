// ============================================================
// /api/auth/pembina-logout — Logout pembina magang
// ============================================================

import { NextResponse } from 'next/server';
import { clearPembinaCookie } from '@/lib/auth';

export async function POST() {
  try {
    await clearPembinaCookie();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
