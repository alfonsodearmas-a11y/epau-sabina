// Excel epoch: 1900-01-01 serial 1, with the 1900 leap-year bug (serial 60 = 1900-02-29, which
// didn't exist). SheetJS ships a correct converter; here we re-implement so we don't depend
// on deep xlsx internals.

export interface PeriodInfo {
  periodDate: string; // ISO yyyy-mm-dd (first day of the period for monthly/annual, last day for quarterly — see spec)
  periodLabel: string; // display label
  frequency: 'annual' | 'quarterly' | 'monthly';
  isEstimate?: boolean;
}

export function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  // Excel's 1900 leap-year bug: serials < 60 are one day off. We use 1899-12-30 as epoch
  // so serial=1 -> 1900-01-01 and serial=60 -> 1900-02-28 (skipping the fictitious Feb 29).
  const msPerDay = 86400 * 1000;
  const epoch = Date.UTC(1899, 11, 30);
  const whole = Math.floor(serial);
  const date = new Date(epoch + whole * msPerDay);
  if (isNaN(date.getTime())) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function yearToAnnual(year: number): PeriodInfo {
  return {
    periodDate: `${year}-01-01`,
    periodLabel: String(year),
    frequency: 'annual',
  };
}

export function isoToQuarter(iso: string): PeriodInfo | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const q = Math.min(4, Math.max(1, Math.ceil(mo / 3)));
  // Quarter-end convention
  const endMonth = q * 3;
  const endDay = endMonth === 3 ? 31 : endMonth === 6 ? 30 : endMonth === 9 ? 30 : 31;
  return {
    periodDate: `${y}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    periodLabel: `Q${q} ${y}`,
    frequency: 'quarterly',
  };
}

export function isoToMonth(iso: string): PeriodInfo | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    periodDate: `${y}-${String(mo).padStart(2, '0')}-01`,
    periodLabel: `${names[mo - 1]} ${y}`,
    frequency: 'monthly',
  };
}

// Coerce a raw header cell value into a PeriodInfo if it looks like a year, quarter, or date.
export function coerceHeaderToPeriod(v: unknown, freq: 'annual' | 'quarterly' | 'monthly'): PeriodInfo | null {
  if (v === null || v === undefined || v === '') return null;
  // Numeric year (1900-2099)
  if (typeof v === 'number') {
    if (v >= 1900 && v <= 2099 && Number.isInteger(v)) return yearToAnnual(v);
    // Excel date serial: 25569 ≈ 1970-01-01, 60000 ≈ 2064-04-29
    if (v >= 20000 && v < 80000) {
      const iso = excelSerialToISO(v);
      if (!iso) return null;
      if (freq === 'monthly') return isoToMonth(iso);
      if (freq === 'quarterly') return isoToQuarter(iso);
      // Fallback: annual (shouldn't happen)
      const y = Number(iso.slice(0, 4));
      return yearToAnnual(y);
    }
    return null;
  }
  const s = String(v).trim();
  if (!s) return null;
  // "2024", "2024 est", "2024*"
  const plainYear = /^(\d{4})\s*\*?\s*(est|estimate|e|prov|projected|proj)?\.?$/i.exec(s);
  if (plainYear) {
    const y = Number(plainYear[1]);
    if (y >= 1900 && y <= 2099) {
      const p = yearToAnnual(y);
      if (plainYear[2]) p.isEstimate = true;
      return p;
    }
  }
  // "2015 - 2019" — skip (range bucket)
  if (/^\d{4}\s*[-–—]\s*\d{4}$/.test(s)) return null;
  // "2024Q3" / "Q3 2024"
  const qmatch = /^(?:Q([1-4])\s+(\d{4})|(\d{4})\s*Q([1-4]))$/i.exec(s);
  if (qmatch) {
    const y = Number(qmatch[2] ?? qmatch[3]);
    const q = Number(qmatch[1] ?? qmatch[4]);
    const iso = `${y}-${String(q * 3).padStart(2, '0')}-${q === 1 ? '31' : q === 2 ? '30' : q === 3 ? '30' : '31'}`;
    return { periodDate: iso, periodLabel: `Q${q} ${y}`, frequency: 'quarterly' };
  }
  // "Jan 2024" / "January 2024" / "Jan-2024"
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const longMonth = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const mmatch = /^([A-Za-z]+)[\s\-/]+(\d{4})$/.exec(s);
  if (mmatch) {
    const mn = mmatch[1]!.toLowerCase().slice(0, 3);
    const idx = monthNames.indexOf(mn);
    if (idx >= 0) {
      const y = Number(mmatch[2]);
      return { periodDate: `${y}-${String(idx + 1).padStart(2, '0')}-01`, periodLabel: `${mmatch[1]!.slice(0, 3)} ${y}`, frequency: 'monthly' };
    }
  }
  const mmatch2 = /^([A-Za-z]+)\s+(\d{4})$/.exec(s);
  if (mmatch2) {
    const idx = longMonth.indexOf(mmatch2[1]!.toLowerCase());
    if (idx >= 0) {
      const y = Number(mmatch2[2]);
      const short = mmatch2[1]!.slice(0, 3);
      return { periodDate: `${y}-${String(idx + 1).padStart(2, '0')}-01`, periodLabel: `${short} ${y}`, frequency: 'monthly' };
    }
  }
  // "End-YYYY" — MoF's own end-of-year labels (observed on Employment sheet).
  const endYear = /^end[\s\-/](\d{4})$/i.exec(s);
  if (endYear) {
    const y = Number(endYear[1]);
    if (y >= 1900 && y <= 2099) {
      return { periodDate: `${y}-01-01`, periodLabel: `End-${y}`, frequency: 'annual' };
    }
  }
  // "End-Jun 2014" or "End-Jun" with neighbouring year cell — callers resolve composite headers.
  return null;
}

// Slug a free-text string to a stable indicator id fragment.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_')
    .slice(0, 80);
}
