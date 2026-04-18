// Health check — bypasses middleware (see matcher in middleware.ts).
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
