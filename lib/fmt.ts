// Formatters ported from docs/design/ui.jsx.

export const fmt = {
  // 1,234,567 with separators; negatives in parentheses
  n: (v: number | null | undefined, digits = 0): string => {
    if (v === null || v === undefined || Number.isNaN(v)) return '';
    const neg = v < 0;
    const s = Math.abs(v).toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return neg ? `(${s})` : s;
  },
  // Compact for chart axes: 1.2k, 1.2M, etc. Financial parens for negatives.
  nc: (v: number | null | undefined, digits = 0): string => {
    if (v === null || v === undefined) return '';
    const neg = v < 0;
    const a = Math.abs(v);
    let s: string;
    if (a >= 1e9) s = (a / 1e9).toFixed(1).replace(/\.0$/, '') + 'bn';
    else if (a >= 1e6) s = (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'm';
    else if (a >= 1e3) s = (a / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    else s = a.toFixed(digits);
    return neg ? `(${s})` : s;
  },
  pct: (v: number | null | undefined, digits = 1): string => {
    if (v === null || v === undefined) return '';
    const neg = v < 0;
    const s = Math.abs(v).toFixed(digits);
    return neg ? `(${s})` : s;
  },
};
