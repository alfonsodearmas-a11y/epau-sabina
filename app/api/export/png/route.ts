// Server-side PNG export — thin stub that echoes the caller's SVG string
// as a data URL. In a v1 where Sabina works locally, pressing "Chart as PNG"
// can capture the client-side SVG and post it here to re-stream it as a
// downloadable PNG using the browser Canvas API. For now we just return
// the SVG as-is; the client can blob-download from the response.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const svg: string | undefined = body?.svg;
  const filename: string = (body?.filename as string) || 'chart.svg';
  if (!svg || typeof svg !== 'string') return NextResponse.json({ error: 'svg required' }, { status: 400 });
  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="${filename.replace(/[^a-z0-9_.-]/gi, '_')}"`,
    },
  });
}
