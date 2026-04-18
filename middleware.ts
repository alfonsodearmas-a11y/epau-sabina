// Middleware: enforce the email allowlist before any page or API route runs.
// In v1 we trust a simple `x-epau-user` header (set by a reverse proxy, a
// browser extension, or the local dev server for Sabina's machine). Requests
// without a recognised email are redirected to /denied.
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|denied|api/_health).*)'],
};

export function middleware(req: NextRequest) {
  // Local dev carve-out: if EPAU_ALLOW_LOCAL is set, let unauthenticated calls through.
  if (process.env.EPAU_ALLOW_LOCAL === 'true') return NextResponse.next();

  const headerEmail = req.headers.get('x-epau-user');
  const cookieEmail = req.cookies.get('epau_user')?.value;
  const email = (headerEmail ?? cookieEmail ?? '').toLowerCase();
  if (!email) {
    const url = req.nextUrl.clone();
    url.pathname = '/denied';
    return NextResponse.redirect(url);
  }
  const allowlist = (process.env.EPAU_EMAIL_ALLOWLIST ?? '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const superadmin = (process.env.EPAU_SUPERADMIN_EMAIL ?? '').trim().toLowerCase();
  if (superadmin) allowlist.push(superadmin);
  if (!allowlist.includes(email)) {
    const url = req.nextUrl.clone();
    url.pathname = '/denied';
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set('x-epau-user-resolved', email);
  return res;
}
