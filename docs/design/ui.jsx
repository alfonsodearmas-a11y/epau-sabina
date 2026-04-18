// Small reusable bits. Kept inline-style-free; Tailwind only.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// --- Icons (inline SVG, hand-tuned minimal strokes) ---
const Icon = {
  Search: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="9" r="6"/><path d="m14 14 4 4"/></svg>
  ),
  Sliders: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" {...p}><path d="M3 6h9M15 6h2M3 14h3M9 14h8"/><circle cx="13.5" cy="6" r="1.6" fill="currentColor"/><circle cx="7.5" cy="14" r="1.6" fill="currentColor"/></svg>
  ),
  Command: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 4a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v10a2 2 0 1 0 2-2H5a2 2 0 1 0 2 2z"/></svg>
  ),
  Play: (p) => (
    <svg viewBox="0 0 20 20" fill="currentColor" {...p}><path d="M6 4.5v11a.75.75 0 0 0 1.16.63l9-5.5a.75.75 0 0 0 0-1.26l-9-5.5A.75.75 0 0 0 6 4.5Z"/></svg>
  ),
  Chart: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17V3M3 17h14M6 13V9M10 13V6M14 13v-2"/></svg>
  ),
  Table: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="14" height="12" rx="1"/><path d="M3 8h14M3 12h14M10 4v12"/></svg>
  ),
  Archive: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="4" width="16" height="4" rx="1"/><path d="M3 8v8h14V8M8 12h4"/></svg>
  ),
  Columns: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="14" height="14" rx="1"/><path d="M10 3v14M3 7h14M3 13h14"/></svg>
  ),
  Terminal: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="4" width="16" height="12" rx="1"/><path d="m5 9 3 2-3 2M11 13h4"/></svg>
  ),
  Warn: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 3 2 17h16L10 3z"/><path d="M10 8v4M10 14.5v.5"/></svg>
  ),
  Close: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 5l10 10M15 5 5 15"/></svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m4 10 4 4 8-8"/></svg>
  ),
  Copy: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="6" y="6" width="10" height="10" rx="1.5"/><path d="M4 14V5a1 1 0 0 1 1-1h9"/></svg>
  ),
  Download: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 3v10M5 9l5 5 5-5M4 17h12"/></svg>
  ),
  Pin: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 7 8l-3 .5 7.5 7.5.5-3 5-5zM4 16l3-3"/></svg>
  ),
  Chev: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 8 4 4 4-4"/></svg>
  ),
  Refresh: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 10a6 6 0 0 1 10-4.5L16 7M16 4v3h-3M16 10a6 6 0 0 1-10 4.5L4 13M4 16v-3h3"/></svg>
  ),
  Sparkle: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 3v4M10 13v4M3 10h4M13 10h4M5 5l2 2M13 13l2 2M15 5l-2 2M7 13l-2 2"/></svg>
  ),
  Filter: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 5h14l-5 7v4l-4-1v-3z"/></svg>
  ),
  Dot: (p) => <svg viewBox="0 0 8 8" {...p}><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>,
  Keyboard: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="5" width="16" height="10" rx="1.5"/><path d="M5 8h.01M8 8h.01M11 8h.01M14 8h.01M5 11h.01M8 11h.01M11 11h.01M14 11h.01M7 14h6"/></svg>
  ),
  File: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3h7l4 4v10H5z"/><path d="M12 3v4h4"/></svg>
  ),
  Globe: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3a11 11 0 0 1 0 14M10 3a11 11 0 0 0 0 14"/></svg>
  ),
};

// --- Formatters ---
const fmt = {
  // 1,234,567 with separators; negatives in parentheses
  n: (v, digits = 0) => {
    if (v === null || v === undefined || Number.isNaN(v)) return '';
    const neg = v < 0;
    const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return neg ? `(${s})` : s;
  },
  nc: (v, digits = 0) => {
    // compact for chart axes: 1.2k, 1.2M, etc. Financial parens for negatives.
    if (v === null || v === undefined) return '';
    const neg = v < 0;
    const a = Math.abs(v);
    let s;
    if (a >= 1e9) s = (a/1e9).toFixed(1).replace(/\.0$/, '') + 'bn';
    else if (a >= 1e6) s = (a/1e6).toFixed(1).replace(/\.0$/, '') + 'm';
    else if (a >= 1e3) s = (a/1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    else s = a.toFixed(digits);
    return neg ? `(${s})` : s;
  },
  pct: (v, digits = 1) => {
    if (v === null || v === undefined) return '';
    const neg = v < 0;
    const s = Math.abs(v).toFixed(digits);
    return neg ? `(${s})` : s;
  },
};

// --- Small primitives ---
const Pill = ({ tone = 'neutral', children, className = '' }) => {
  const tones = {
    neutral: 'bg-white/5 text-text-secondary border-white/10',
    gold: 'bg-gold-300/10 text-gold-200 border-gold-300/30',
    cool: 'bg-[#7AA7D9]/10 text-[#A9C5E3] border-[#7AA7D9]/25',
    warn: 'bg-[#E0A050]/10 text-[#E0A050] border-[#E0A050]/25',
    danger: 'bg-[#E06C6C]/10 text-[#E06C6C] border-[#E06C6C]/25',
    macro: 'bg-[#7AA7D9]/10 text-[#A9C5E3] border-[#7AA7D9]/25',
    monetary: 'bg-gold-300/10 text-gold-200 border-gold-300/30',
    fiscal: 'bg-[#C8A87F]/10 text-[#C8A87F] border-[#C8A87F]/25',
    external: 'bg-[#7FC29B]/10 text-[#7FC29B] border-[#7FC29B]/25',
    debt: 'bg-[#C89878]/10 text-[#C89878] border-[#C89878]/25',
    social: 'bg-[#B099D4]/10 text-[#B099D4] border-[#B099D4]/25',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 h-5 rounded-sm text-[10.5px] font-medium uppercase tracking-[0.08em] border ${tones[tone] || tones.neutral} ${className}`}>
      {children}
    </span>
  );
};

const CategoryPill = ({ category }) => {
  const tone = { Macro: 'macro', Monetary: 'monetary', Fiscal: 'fiscal', External: 'external', Debt: 'debt', Social: 'social' }[category] || 'neutral';
  return <Pill tone={tone}>{category}</Pill>;
};

const FreqPill = ({ frequency }) => (
  <span className="num inline-flex items-center justify-center px-1.5 h-5 rounded-sm text-[10px] font-medium tracking-[0.08em] uppercase bg-white/[0.03] text-text-tertiary border border-white/5">
    {frequency === 'Monthly' ? 'M' : frequency === 'Quarterly' ? 'Q' : frequency === 'Annual' ? 'A' : frequency[0]}
    <span className="ml-1 normal-case tracking-normal opacity-70">{frequency.toLowerCase()}</span>
  </span>
);

const KeyCap = ({ children, className = '' }) => (
  <kbd className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-[3px] text-[10px] font-medium bg-white/[0.06] border border-white/10 text-text-secondary ${className}`}>{children}</kbd>
);

const Divider = ({ className = '' }) => (
  <div className={`h-px bg-white/[0.06] ${className}`} />
);

const SectionLabel = ({ children, right, className = '' }) => (
  <div className={`flex items-center justify-between px-4 py-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-text-tertiary ${className}`}>
    <span>{children}</span>
    {right}
  </div>
);

Object.assign(window, {
  Icon, fmt, Pill, CategoryPill, FreqPill, KeyCap, Divider, SectionLabel,
});
