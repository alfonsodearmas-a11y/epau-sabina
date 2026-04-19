// Middleware: HTTP Basic Auth gate in production, local-dev bypass via
// EPAU_ALLOW_LOCAL. Credentials are hardcoded for the v1 experimental deploy;
// swap for SSO (Vercel Access, Cloudflare Access, Supabase session) before
// wider rollout.
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|denied|api/health).*)'],
};

const BASIC_USER = 'sabina_epau';
const BASIC_PASS = '199001';
const SESSION_EMAIL = 'sabina@mpua.gov.gy';

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="EPAU Analyst Workbench"' },
  });
}

export function middleware(req: NextRequest) {
  if (process.env.EPAU_ALLOW_LOCAL === 'true') return NextResponse.next();

  const auth = req.headers.get('authorization') ?? '';
  if (!auth.toLowerCase().startsWith('basic ')) return unauthorized();

  let decoded = '';
  try {
    decoded = atob(auth.slice(6).trim());
  } catch {
    return unauthorized();
  }
  const sep = decoded.indexOf(':');
  if (sep < 0) return unauthorized();
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  if (user !== BASIC_USER || pass !== BASIC_PASS) return unauthorized();

  const res = NextResponse.next();
  res.headers.set('x-epau-user-resolved', SESSION_EMAIL);
  return res;
}
