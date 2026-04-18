// Lightweight allowlist-based auth. v1 is single-ministry, 5-10 users, internal-only.
// The identity source is the header `x-epau-user` set by a tiny middleware (see
// middleware.ts). The superadmin email is immutable.

export function getAllowlist(): Set<string> {
  const raw = process.env.EPAU_EMAIL_ALLOWLIST ?? '';
  const emails = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const superadmin = (process.env.EPAU_SUPERADMIN_EMAIL ?? '').trim().toLowerCase();
  if (superadmin) emails.push(superadmin);
  return new Set(emails);
}

export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowlist().has(email.toLowerCase());
}

export function isSuperadmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const superadmin = (process.env.EPAU_SUPERADMIN_EMAIL ?? '').trim().toLowerCase();
  return email.toLowerCase() === superadmin;
}
