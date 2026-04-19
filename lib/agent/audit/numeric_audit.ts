// Post-hoc numeric audit. Extracts every numeric claim from the final visible
// text and checks it against the set of values the agent is allowed to cite
// — namely values returned by get_observations, get_comparison_table, or
// compute in this turn. A match must be within a tolerance band.
//
// Hand-computed derivations (averages, percentage-point differences,
// multi-year sums, multipliers) flag because the derivative itself was never
// the output of a tool call in this turn.

export type AuditTokenKind = 'percent' | 'currency' | 'percentage_points' | 'scaled' | 'raw';

export type AuditToken = {
  raw: string;
  value: number;
  kind: AuditTokenKind;
  index: number;
  context: string;
};

export type NumericAuditResult = {
  pass: boolean;
  unground: AuditToken[];
  grounded: AuditToken[];
};

const SCALE_FACTORS = [1, 1e-9, 1e-6, 1e-3, 1e-2, 1e2, 1e3, 1e6, 1e9];

export function runNumericAudit(text: string, allowedRawValues: number[]): NumericAuditResult {
  const tokens = extractTokens(text);
  const allowedSet = expandAllowedValues(allowedRawValues);
  const grounded: AuditToken[] = [];
  const unground: AuditToken[] = [];
  for (const tok of tokens) {
    if (matches(tok.value, allowedSet)) grounded.push(tok);
    else unground.push(tok);
  }
  return { pass: unground.length === 0, grounded, unground };
}

// --- Extraction -------------------------------------------------------------

// Match comma-grouped numbers (1,234 / 12,345.67) OR plain digit sequences
// (309 / 3099.8), with an optional decimal tail. Alternation is ordered so
// the comma form wins where applicable; the plain form is used otherwise.
const NUM = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';

// Ordered list: first match wins at a given index.
const PATTERNS: Array<{ kind: AuditTokenKind; re: RegExp }> = [
  { kind: 'currency',           re: new RegExp(`(?<prefix>G\\$|US\\$|\\$)\\s*(?<num>${NUM})\\s*(?<scale>billion|bn|million|mn|thousand|k)?`, 'gi') },
  { kind: 'percentage_points',  re: new RegExp(`(?<sign>[-+−–]\\s*)?(?<num>${NUM})\\s*(?:percentage\\s*points?|p\\.p\\.|pp(?!\\w)|ppt)`, 'gi') },
  { kind: 'percent',            re: new RegExp(`(?<sign>[-+−–]\\s*)?(?<num>${NUM})\\s*(?:%|percent(?!age))`, 'gi') },
  { kind: 'scaled',             re: new RegExp(`(?<num>${NUM})\\s*(?:billion|million|thousand|bn|mn)\\b`, 'gi') },
  { kind: 'raw',                re: new RegExp(`(?<![\\d.])(?<num>${NUM})(?![\\d.])`, 'g') },
];

const SCALE_OF: Record<string, number> = {
  billion: 1e9, bn: 1e9, million: 1e6, mn: 1e6, thousand: 1e3, k: 1e3,
};

function extractTokens(text: string): AuditToken[] {
  const claimed = new Set<number>();
  const out: AuditToken[] = [];

  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      if (overlapsClaimed(start, (m[0] ?? '').length, claimed)) continue;

      const numRaw = (m.groups?.num ?? '').replace(/,/g, '');
      if (!numRaw) continue;
      let value = Number(numRaw);
      if (!Number.isFinite(value)) continue;

      const sign = m.groups?.sign?.trim();
      if (sign === '-' || sign === '−' || sign === '–') value = -value;

      if (kind === 'currency') {
        const scale = (m.groups?.scale ?? '').toLowerCase();
        if (scale && SCALE_OF[scale]) value *= SCALE_OF[scale]!;
      } else if (kind === 'scaled') {
        const rest = (m[0] ?? '').toLowerCase();
        for (const [k, v] of Object.entries(SCALE_OF)) {
          if (rest.includes(k)) { value *= v; break; }
        }
      }

      if (isExcluded(kind, value, numRaw, text, start)) continue;

      const contextStart = Math.max(0, start - 20);
      const contextEnd = Math.min(text.length, start + (m[0]?.length ?? 0) + 20);
      out.push({
        raw: m[0] ?? '',
        value,
        kind,
        index: start,
        context: text.slice(contextStart, contextEnd).replace(/\s+/g, ' ').trim(),
      });
      for (let i = start; i < start + (m[0]?.length ?? 0); i++) claimed.add(i);
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

function overlapsClaimed(start: number, len: number, claimed: Set<number>): boolean {
  for (let i = start; i < start + len; i++) if (claimed.has(i)) return true;
  return false;
}

function isExcluded(kind: AuditTokenKind, value: number, raw: string, text: string, start: number): boolean {
  const isInteger = !raw.includes('.');
  const end = start + raw.length;

  // Plain integer years 1900–2099 (only when the pattern is 'raw' — a
  // currency/percent figure of 2015 is still data and should be audited).
  if (kind === 'raw' && isInteger && value >= 1900 && value <= 2099) return true;

  // Single-digit enumeration integers ("three shifts", "1.", "2.").
  if (kind === 'raw' && isInteger && Math.abs(value) < 10) return true;

  // Measurement-period labels: "12-month rate", "10-year bond", "24-hour",
  // and UX targets: "200-word target".
  // If the integer is immediately followed by "-month" / "-year" / "-day" /
  // "-week" / "-hour" / "-quarter" / "-word", treat as a label, not a data
  // claim.
  if (kind === 'raw' && isInteger) {
    const tail = text.slice(end, end + 10).toLowerCase();
    if (/^-(month|year|day|week|hour|quarter|word)s?\b/.test(tail)) return true;
  }

  // Per-capita denominator labels: "per 10,000 population", "per 100 people".
  // The digit is a rate denominator, not a data claim.
  if (kind === 'raw' && isInteger) {
    const tail = text.slice(end, end + 24).toLowerCase();
    const head = text.slice(Math.max(0, start - 6), start).toLowerCase();
    if (/^\s+(population|people|inhabitants|households|live\s+births)\b/.test(tail) && /per\s*$/.test(head)) return true;
  }

  // Inside a list marker like "**1.** Services" — preceded by "**" then the
  // raw integer. Rarely worth auditing.
  if (kind === 'raw' && isInteger && /^\*+$/.test(text.slice(Math.max(0, start - 2), start))) return true;

  return false;
}

// --- Allowed values ---------------------------------------------------------

export function collectAllowedValues(toolCalls: Array<{ tool: string; output: unknown }>): number[] {
  const values: number[] = [];
  for (const { tool, output } of toolCalls) {
    walkNumbers(output, values, tool);
  }
  return dedupe(values);
}

function walkNumbers(node: unknown, out: number[], toolName: string, depth = 0): void {
  if (depth > 8) return;
  if (node === null || node === undefined) return;
  if (typeof node === 'number' && Number.isFinite(node)) {
    out.push(node);
    return;
  }
  if (typeof node === 'string') {
    // Some outputs (raw SQL) carry numeric strings. Skip; too noisy.
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) walkNumbers(item, out, toolName, depth + 1);
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      // Skip obvious id/metadata-shaped numeric fields.
      if (/^(id|indicator_id|tool_call_id|render_id|session_id|turn_index|step_index|limit|max|min)$/i.test(k)) continue;
      // Skip date/period fields (periodDate, periodLabel handled as strings anyway).
      if (/date$/i.test(k)) continue;
      walkNumbers(v, out, toolName, depth + 1);
    }
  }
}

function dedupe(values: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const v of values) {
    const key = Math.round(v * 1e6) / 1e6;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function expandAllowedValues(raws: number[]): number[] {
  const out = new Set<number>();
  for (const v of raws) {
    for (const f of SCALE_FACTORS) out.add(v * f);
  }
  return Array.from(out);
}

function matches(candidate: number, allowed: number[]): boolean {
  const candAbs = Math.abs(candidate);
  for (const v of allowed) {
    if (!Number.isFinite(v)) continue;
    const av = Math.abs(v);
    // Tolerance bands: ±0.05 absolute for |v|<10 (ordinary rounding of small
    // percents), otherwise ±2% relative with a 0.5 absolute floor. 2% covers
    // user-facing rounding like US$2.57 billion → "US$2.6 billion".
    const tol = av < 10 ? 0.05 : Math.max(0.5, av * 0.02);
    if (Math.abs(candidate - v) <= tol) return true;
    if (Math.abs(candAbs - av) <= tol) return true;
  }
  return false;
}

// --- Retry note ------------------------------------------------------------

export function formatAuditFeedback(unground: AuditToken[]): string {
  const lines = unground.slice(0, 10).map((t) => `  - "${t.raw}" (in "${t.context}")`);
  const more = unground.length > 10 ? `\n  …and ${unground.length - 10} more.` : '';
  return [
    'Your previous response contained numeric claims that are not grounded in this turn\'s tool output:',
    ...lines,
    more,
    'These numbers must be produced by a compute, get_observations, or get_comparison_table call in this turn. ' +
      'If a figure is a derivation (difference, average, share, ratio, multi-year sum, multiplier), call the compute tool and cite its output. ' +
      'If a figure cannot be grounded, remove it from the response.',
    'Retry this turn.',
  ].filter(Boolean).join('\n');
}
