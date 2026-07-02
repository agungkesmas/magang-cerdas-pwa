// ============================================================
// MIDDLEWARE — Auth redirect for protected routes
// (Edge runtime compatible — only checks cookie existence,
//  full JWT verification happens in API routes/server components)
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Protect /admin/* EXCEPT /admin/login
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    const token = req.cookies.get('magang_admin_token')?.value;
    if (!token) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /intern/* EXCEPT /intern/login
  if (path.startsWith('/intern') && !path.startsWith('/intern/login')) {
    const token = req.cookies.get('magang_intern_token')?.value;
    if (!token) {
      const loginUrl = new URL('/intern/login', req.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /bkk/* EXCEPT /bkk/login
  if (path.startsWith('/bkk') && !path.startsWith('/bkk/login')) {
    const token = req.cookies.get('magang_bkk_token')?.value;
    if (!token) {
      const loginUrl = new URL('/bkk/login', req.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/intern/:path*', '/bkk/:path*']
};
