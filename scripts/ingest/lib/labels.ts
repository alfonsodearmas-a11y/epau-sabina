// Shared label-column heuristics. False positives drop real indicators — worse
// than leaving a handful of section strings in — so keep this list conservative.
// The catalog audit (`npm run audit`) is the safety net for anything that slips through.

const ROMAN = /^[IVXLCDM]+$/i;

const JUNK_EXACT = new Set<string>([
  // Subtotals & rollups
  'total', 'totals', 'subtotal', 'sub-total', 'sub total',
  'grand total', 'grand-total',
  // Memo/section markers
  'of which', 'of which:', 'memo', 'memo:', 'memo items', 'memo items:',
  'memorandum', 'memorandum items', 'memorandum items:',
  'note', 'notes', 'note:', 'notes:',
  // Header boilerplate
  'item', 'items', 'summary',
  // Unit declarations masquerading as labels
  "$us'000s", "us$'000s", "g$'000s", 'g$ millions', 'us$ millions',
  'g$ billions', 'us$ billions', 'percent', '%',
]);

const JUNK_PREFIX: RegExp[] = [
  /^source[s]?\s*:/i,              // "Source: Bureau of Statistics"
  /^charts? and analysis/i,        // "Charts and Analysis"
  /^updated\s+\d/i,                // "Updated 30.01.2026"
  /^\d{1,2}\.\d{1,2}\.\d{2,4}$/,   // bare date like "01.11.2024"
  /^click here/i,                  // nav cells
  /^medium[- ]term/i,              // section headers
];

// Looks like a section outline marker: single uppercase letter, a lone digit,
// a roman numeral, or a trailing-colon header (e.g. "MEMORANDUM ITEMS:").
export function isStructuralMarker(value: unknown): boolean {
  if (value === null || value === undefined) return true; // blank counts as a non-label
  if (typeof value === 'number') {
    // Bare integers in the label column are outline numbering (1, 2, 3...).
    return Number.isInteger(value) && value >= 0 && value < 100;
  }
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return true;
  if (s.length === 1) return true;                          // "A", "B", "1"
  if (/^\d+\.?$/.test(s)) return true;                      // "1." / "12"
  if (/^\d+\.\d+\.?$/.test(s)) return true;                 // "1.1" / "2.3."
  if (ROMAN.test(s)) return true;                           // "I", "IV", "XII"
  if (/:$/.test(s) && s.length < 40) return true;           // "MEMORANDUM ITEMS:" / "Source:"
  if (JUNK_EXACT.has(s.toLowerCase())) return true;
  for (const rx of JUNK_PREFIX) if (rx.test(s)) return true;
  return false;
}

// Same classifier but returns false for bare integers — useful when the label
// column *legitimately* contains a numeric code (rare; current workbook has
// none but future sheets might).
export function isJunkLabel(value: unknown): boolean {
  if (typeof value !== 'string') return value === null || value === undefined || value === '';
  return isStructuralMarker(value);
}

// Normalize a label before slugifying: strip leading footnote markers, trim
// trailing punctuation, collapse whitespace. Call this on the raw cell value
// before handing it to slugify() so indicator IDs stay stable.
export function normalizeLabel(s: string): string {
  return s
    .replace(/^\s*[\d]+\/\s+/, '')        // "1/ Includes..." -> "Includes..."
    .replace(/\s*\*+\s*$/, '')             // trailing asterisks
    .replace(/\s+/g, ' ')
    .trim();
}
