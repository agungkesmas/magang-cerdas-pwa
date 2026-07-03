// ============================================================
// MIDDLEWARE — Auth redirect + Security Headers
// (Edge runtime compatible — only checks cookie existence,
//  full JWT verification happens in API routes/server components)
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================
// SECURITY HEADERS — applied to every response
// ============================================================
const SECURITY_HEADERS: Record<string, string> = {
  // Anti-clickjacking — nobody can iframe our app
  'X-Frame-Options': 'DENY',
  // Prevent MIME-type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Referrer only sent for same-origin; strip query on cross-origin
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Lock down powerful APIs (we still allow camera + geolocation for check-in)
  'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()',
  // HSTS — force HTTPS for 1 year (only sent over HTTPS anyway)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

// More restrictive CSP — limits where scripts/styles can come from
// Allows: self, inline styles (Tailwind needs this), Vercel analytics
// If you add external scripts (e.g. Google Fonts), update this list.
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel.app",
  "media-src 'self' blob:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'"
].join('; ');

// Routes that should NEVER be indexed by search engines
const NOINDEX_PREFIXES = ['/admin', '/pembina', '/bkk', '/intern', '/staff-access', '/api'];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const res = NextResponse.next();

  // ============================================================
  // APPLY SECURITY HEADERS to every response
  // ============================================================
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  res.headers.set('Content-Security-Policy', CSP_HEADER);

  // X-Robots-Tag: noindex for protected routes (admin/pembina/bkk/intern/api)
  if (NOINDEX_PREFIXES.some((p) => path.startsWith(p))) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  }

  // ============================================================
  // GUARD: If user already logged in, redirect FROM login page
  // to their dashboard (prevents sidebar from showing on login page)
  // ============================================================
  if (path === '/admin/login') {
    const adminToken = req.cookies.get('magang_admin_token')?.value;
    if (adminToken) {
      return NextResponse.redirect(new URL('/admin/interns', req.url));
    }
    return res; // Allow access to login page (no shell)
  }
  if (path === '/intern/login') {
    const internToken = req.cookies.get('magang_intern_token')?.value;
    if (internToken) {
      return NextResponse.redirect(new URL('/intern/home', req.url));
    }
    return res;
  }
  if (path === '/bkk/login') {
    const bkkToken = req.cookies.get('magang_bkk_token')?.value;
    if (bkkToken) {
      return NextResponse.redirect(new URL('/bkk/home', req.url));
    }
    return res;
  }
  if (path === '/pembina/login') {
    const pembinaToken = req.cookies.get('magang_pembina_token')?.value;
    if (pembinaToken) {
      return NextResponse.redirect(new URL('/pembina/home', req.url));
    }
    return res;
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

  return res;
}

export const config = {
  // Run on all paths so security headers are applied everywhere,
  // but skip _next/static, _next/image, and other internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|swe-worker|manifest.json).*)'
  ]
};
