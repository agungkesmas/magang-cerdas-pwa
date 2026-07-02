// ============================================================
// MIDDLEWARE — Auth redirect for protected routes + login page guard
// (Edge runtime compatible — only checks cookie existence,
//  full JWT verification happens in API routes/server components)
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ============================================================
  // GUARD: If user already logged in, redirect FROM login page
  // to their dashboard (prevents sidebar from showing on login page)
  // ============================================================
  if (path === '/admin/login') {
    const adminToken = req.cookies.get('magang_admin_token')?.value;
    if (adminToken) {
      return NextResponse.redirect(new URL('/admin/interns', req.url));
    }
    return NextResponse.next(); // Allow access to login page (no shell)
  }
  if (path === '/intern/login') {
    const internToken = req.cookies.get('magang_intern_token')?.value;
    if (internToken) {
      return NextResponse.redirect(new URL('/intern/home', req.url));
    }
    return NextResponse.next();
  }
  if (path === '/bkk/login') {
    const bkkToken = req.cookies.get('magang_bkk_token')?.value;
    if (bkkToken) {
      return NextResponse.redirect(new URL('/bkk/home', req.url));
    }
    return NextResponse.next();
  }
  if (path === '/pembina/login') {
    const pembinaToken = req.cookies.get('magang_pembina_token')?.value;
    if (pembinaToken) {
      return NextResponse.redirect(new URL('/pembina/home', req.url));
    }
    return NextResponse.next();
  }

  // ============================================================
  // PROTECT: Routes that require authentication
  // ============================================================
  if (path.startsWith('/admin')) {
    const token = req.cookies.get('magang_admin_token')?.value;
    if (!token) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (path.startsWith('/intern')) {
    const token = req.cookies.get('magang_intern_token')?.value;
    if (!token) {
      const loginUrl = new URL('/intern/login', req.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (path.startsWith('/bkk')) {
    const token = req.cookies.get('magang_bkk_token')?.value;
    if (!token) {
      const loginUrl = new URL('/bkk/login', req.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (path.startsWith('/pembina')) {
    const token = req.cookies.get('magang_pembina_token')?.value;
    if (!token) {
      const loginUrl = new URL('/pembina/login', req.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/intern/:path*', '/bkk/:path*', '/pembina/:path*']
};
