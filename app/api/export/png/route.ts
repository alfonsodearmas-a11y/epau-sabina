// Server-side SVG → PNG export. The client posts the <svg> string (typically
// grabbed from Recharts' root `.recharts-surface` element plus a dark-theme
// wrapper) and we rasterize to PNG using @resvg/resvg-js.
import { NextResponse } from 'next/server';
import { Resvg } from '@resvg/resvg-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  svg?: string;
  filename?: string;
  width?: number;
  background?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.svg) return NextResponse.json({ error: 'svg required' }, { status: 400 });

  // Wrap in an outer SVG so background + explicit size render correctly.
  const width = body.width ?? 1200;
  const background = body.background ?? '#0A0E1A';
  const inner = body.svg;
  const wrapped = /^<\?xml/.test(inner)
    ? inner
    : `<?xml version="1.0" encoding="UTF-8"?>\n${inner}`;
  const withBg = wrapped.replace(/<svg\b/, `<svg style="background:${background}"`);

  try {
    const r = new Resvg(withBg, {
      background,
      fitTo: { mode: 'width', value: width },
      font: { loadSystemFonts: true },
    });
    const png = r.render().asPng();
    const filename = (body.filename ?? 'chart.png').replace(/[^a-z0-9_.-]/gi, '_');
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'render_failed', detail: (e as Error).message }, { status: 500 });
  }
}
