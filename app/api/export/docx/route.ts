// Build a simple Word document with title, data table, and commentary.
// Uses the `docx` library (already in package.json).
import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, HeadingLevel, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';

export const runtime = 'nodejs';

interface ExportBody {
  title: string;
  subtitle?: string;
  caveat?: string | null;
  commentary?: string | null;
  series: Array<{
    name: string;
    unit: string;
    source: string;
    rows: Array<{ period: string; value: number | null; scenario?: string }>;
  }>;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ExportBody | null;
  if (!body || !body.title || !Array.isArray(body.series)) {
    return NextResponse.json({ error: 'title and series required' }, { status: 400 });
  }

  const periods = Array.from(new Set(body.series.flatMap((s) => s.rows.map((r) => r.period))));
  const headerRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Period', bold: true })] })] }),
      ...body.series.map((s) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: `${s.name} (${s.unit})`, bold: true })] })],
      })),
    ],
  });
  const dataRows = periods.map((p) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph(p)] }),
      ...body.series.map((s) => {
        const hit = s.rows.find((r) => r.period === p);
        const cell = hit && hit.value !== null ? hit.value.toLocaleString('en-US') : '-';
        return new TableCell({ children: [new Paragraph(cell)] });
      }),
    ],
  }));
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: body.title, heading: HeadingLevel.HEADING_1 }),
        ...(body.subtitle ? [new Paragraph({ text: body.subtitle })] : []),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }),
        ...(body.caveat ? [new Paragraph({ text: `Caveat: ${body.caveat}`, spacing: { before: 200 } })] : []),
        ...(body.commentary ? [
          new Paragraph({ text: 'Commentary', heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
          new Paragraph(body.commentary),
        ] : []),
        new Paragraph({ text: 'Sources', heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
        ...body.series.map((s) => new Paragraph(`${s.name}: ${s.source}`)),
      ],
    }],
  });
  const buf = await Packer.toBuffer(doc);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${body.title.replace(/[^a-z0-9_.-]/gi, '_')}.docx"`,
    },
  });
}
