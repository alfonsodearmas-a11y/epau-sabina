// Catalog, Saved Views, Comparisons, Admin surfaces.
const { useState, useEffect, useMemo } = React;

// ------------------ CATALOG ------------------

function Catalog({ onOpenInWorkbench }) {
  const all = window.EPAU_DATA.INDICATORS;
  const [q, setQ] = useState('');
  const [cats, setCats] = useState(new Set());
  const [freqs, setFreqs] = useState(new Set());
  const [sources, setSources] = useState(new Set());
  const [caveatOnly, setCaveatOnly] = useState(false);
  const [selected, setSelected] = useState(null);

  const categoryList = ['Macro', 'Fiscal', 'Monetary', 'External', 'Debt', 'Social'];
  const frequencyList = ['Annual', 'Quarterly', 'Monthly'];
  const sourceList = [...new Set(all.map((i) => i.source.split(',')[0]))];

  const filtered = all.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cats.size && !cats.has(i.category)) return false;
    if (freqs.size && !freqs.has(i.frequency)) return false;
    if (sources.size && !sources.has(i.source.split(',')[0])) return false;
    if (caveatOnly && !i.caveat) return false;
    return true;
  });

  const toggleSet = (s, v) => {
    const next = new Set(s);
    if (next.has(v)) next.delete(v); else next.add(v);
    return next;
  };

  return (
    <div className="px-8 pt-6 pb-16 max-w-[1500px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Indicator Catalog</div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">Every series the workbook has ingested.</h1>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-tertiary pt-2 num">
          <span>Showing <span className="text-text-primary">{filtered.length}</span> of <span className="text-text-primary">{all.length}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-4">
        {/* Filter sidebar */}
        <div className="glass rounded-lg self-start sticky top-20 overflow-hidden">
          <SectionLabel>Filters</SectionLabel>
          <FilterGroup label="Category">
            {categoryList.map((c) => (
              <FilterCheck key={c} on={cats.has(c)} onToggle={() => setCats(toggleSet(cats, c))} label={c} right={<CategoryPill category={c} />} />
            ))}
          </FilterGroup>
          <Divider />
          <FilterGroup label="Frequency">
            {frequencyList.map((f) => (
              <FilterCheck key={f} on={freqs.has(f)} onToggle={() => setFreqs(toggleSet(freqs, f))} label={f} />
            ))}
          </FilterGroup>
          <Divider />
          <FilterGroup label="Source">
            {sourceList.map((s) => (
              <FilterCheck key={s} on={sources.has(s)} onToggle={() => setSources(toggleSet(sources, s))} label={s} />
            ))}
          </FilterGroup>
          <Divider />
          <div className="px-4 py-3">
            <button onClick={() => setCaveatOnly(!caveatOnly)} className={`w-full h-8 rounded-md flex items-center justify-between px-3 text-[12px] border transition-colors ${caveatOnly ? 'bg-[#E0A050]/10 border-[#E0A050]/30 text-[#E0A050]' : 'bg-white/[0.02] border-white/8 text-text-secondary hover:border-white/15'}`}>
              <span className="flex items-center gap-2"><Icon.Warn className="w-3.5 h-3.5" /> Has caveat</span>
              <span className={`w-6 h-3.5 rounded-full relative ${caveatOnly ? 'bg-[#E0A050]/40' : 'bg-white/10'}`}>
                <span className={`absolute top-0 w-3.5 h-3.5 rounded-full bg-white/80 transition-all ${caveatOnly ? 'left-[10px]' : 'left-0'}`} />
              </span>
            </button>
          </div>
        </div>

        {/* List */}
        <div>
          <div className="glass rounded-t-lg p-1.5 flex items-center gap-2">
            <Icon.Search className="w-4 h-4 text-text-tertiary ml-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter indicators by name"
              className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary py-1.5 px-1" />
            <KeyCap>/</KeyCap>
          </div>
          <div className="bg-white/[0.01] border border-white/6 border-t-0 rounded-b-lg overflow-hidden">
            {/* header */}
            <div className="grid grid-cols-[1fr_110px_110px_120px_170px_28px] gap-3 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-text-tertiary bg-white/[0.02]">
              <div>Indicator</div>
              <div>Category</div>
              <div>Frequency</div>
              <div>Latest</div>
              <div>Source</div>
              <div></div>
            </div>
            <div className="max-h-[640px] overflow-y-auto scroll-thin">
              {filtered.map((ind, i) => (
                <button key={ind.id} onClick={() => setSelected(ind)}
                  className="w-full grid grid-cols-[1fr_110px_110px_120px_170px_28px] gap-3 px-4 py-2 border-t border-white/5 hover:bg-white/[0.025] transition-colors text-left items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    {ind.caveat ? <Icon.Warn className="w-3.5 h-3.5 text-[#E0A050] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0"/>}
                    <span className="text-[12.5px] text-text-primary truncate">{ind.name}</span>
                  </div>
                  <div><CategoryPill category={ind.category} /></div>
                  <div><FreqPill frequency={ind.frequency} /></div>
                  <div className="text-[11.5px] num text-text-secondary">{ind.latest}</div>
                  <div className="text-[11px] text-text-tertiary truncate">{ind.source.split(',')[0]}</div>
                  <Icon.Chev className="w-4 h-4 text-text-quat -rotate-90" />
                </button>
              ))}
              {filtered.length === 0 ? <div className="px-4 py-6 text-[12px] text-text-tertiary">No indicators match those filters.</div> : null}
            </div>
          </div>
        </div>
      </div>

      {selected ? <IndicatorDetail ind={selected} onClose={() => setSelected(null)} onOpenInWorkbench={onOpenInWorkbench} /> : null}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div className="px-1 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary px-3 pb-1.5">{label}</div>
      <div>{children}</div>
    </div>
  );
}
function FilterCheck({ on, onToggle, label, right }) {
  return (
    <button onClick={onToggle} className="w-full h-7 px-3 flex items-center gap-2 hover:bg-white/[0.03] text-left">
      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${on ? 'border-gold-300 bg-gold-300' : 'border-white/20'}`}>
        {on ? <Icon.Check className="w-3 h-3 text-ink-950"/> : null}
      </span>
      <span className="text-[12px] text-text-secondary flex-1">{label}</span>
      {right}
    </button>
  );
}

function IndicatorDetail({ ind, onClose, onOpenInWorkbench }) {
  // Tiny time series preview
  const preview = useMemo(() => {
    const out = [];
    let base = 100;
    for (let y = 2015; y <= 2026; y++) {
      base *= 1 + (0.04 + Math.sin(y * 1.3) * 0.05);
      out.push({ year: String(y), v: Math.round(base) });
    }
    return out;
  }, [ind.id]);
  const R = window.Recharts;
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="absolute top-0 right-0 bottom-0 w-[520px] slide-in" onClick={(e) => e.stopPropagation()}>
        <div className="h-full glass-strong border-l border-white/10 flex flex-col">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CategoryPill category={ind.category} />
                <FreqPill frequency={ind.frequency} />
                {ind.caveat ? <Pill tone="warn"><Icon.Warn className="w-3 h-3" /> caveat</Pill> : null}
              </div>
              <h2 className="font-serif text-[24px] leading-[1.15] text-text-primary mt-2">{ind.name}</h2>
              <div className="text-[11.5px] text-text-tertiary mt-1">{ind.source}</div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/10 text-text-tertiary hover:text-text-primary flex items-center justify-center">
              <Icon.Close className="w-3.5 h-3.5" />
            </button>
          </div>
          <Divider />
          <div className="flex-1 overflow-y-auto scroll-thin">
            <div className="px-5 py-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">Preview</div>
              <div className="h-36">
                <R.ResponsiveContainer width="100%" height="100%">
                  <R.AreaChart data={preview} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g_prev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <R.XAxis dataKey="year" tick={{ fill: '#8A8778', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} />
                    <R.YAxis tick={{ fill: '#8A8778', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} tickFormatter={(v) => fmt.nc(v)} width={40}/>
                    <R.Area type="monotone" dataKey="v" stroke="#D4AF37" strokeWidth={1.4} fill="url(#g_prev)" />
                  </R.AreaChart>
                </R.ResponsiveContainer>
              </div>
            </div>
            <Divider />
            <div className="px-5 py-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">Metadata</div>
              <dl className="grid grid-cols-[110px_1fr] gap-y-2 gap-x-4 text-[12px]">
                <dt className="text-text-tertiary">Unit</dt><dd className="text-text-primary">{ind.unit}</dd>
                <dt className="text-text-tertiary">Frequency</dt><dd className="text-text-primary">{ind.frequency}</dd>
                <dt className="text-text-tertiary">Source</dt><dd className="text-text-primary">{ind.source}</dd>
                <dt className="text-text-tertiary">Sheet</dt><dd className="text-text-primary font-mono text-[11.5px]">{ind.sheet}</dd>
                <dt className="text-text-tertiary">Latest obs</dt><dd className="text-text-primary num">{ind.latest}</dd>
                <dt className="text-text-tertiary">Ingested</dt><dd className="text-text-primary num">Mar 17, 2026 at 09:14 GYT</dd>
              </dl>
            </div>
            {ind.caveat ? (
              <>
                <Divider />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon.Warn className="w-3.5 h-3.5 text-[#E0A050]" />
                    <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#E0A050] font-medium">Caveat</span>
                  </div>
                  <p className="text-[12.5px] text-text-secondary leading-snug">{ind.caveat}</p>
                </div>
              </>
            ) : null}
          </div>
          <div className="px-5 py-4 border-t border-white/8 flex items-center justify-between">
            <div className="text-[11px] text-text-tertiary">Press <KeyCap>Esc</KeyCap> to close</div>
            <button onClick={() => onOpenInWorkbench(ind)}
              className="h-9 px-4 rounded-md bg-gold-300 hover:bg-gold-200 text-ink-950 text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors">
              Open in Workbench
              <Icon.Chev className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------ SAVED VIEWS ------------------

function SavedViews({ onOpen }) {
  const views = window.EPAU_DATA.SAVED_VIEWS;
  return (
    <div className="px-8 pt-6 pb-16 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Saved Views</div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">Queries you re-run.</h1>
        </div>
        <button className="h-9 px-4 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 text-[12.5px] flex items-center gap-1.5 transition-colors">
          <Icon.Refresh className="w-3.5 h-3.5" /> Re-run all
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {views.map((v) => <SavedCard key={v.id} view={v} onOpen={() => onOpen(v.query)} />)}
      </div>
    </div>
  );
}

function SavedCard({ view, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="glass rounded-lg p-4 flex flex-col gap-3 hover:border-gold-300/30 transition-colors relative group cursor-pointer"
      onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-[18px] leading-[1.2] text-text-primary flex-1">{view.name}</h3>
        <button onClick={(e) => { e.stopPropagation(); }} className="w-7 h-7 rounded-md border border-white/8 bg-white/[0.02] text-text-tertiary hover:text-text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Icon.Chev className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="text-[11px] text-text-tertiary font-mono leading-snug">{view.query}</div>
      <ThumbChart kind={view.chart} />
      <div className="flex items-center flex-wrap gap-1.5">
        {view.indicators.map((i) => (
          <span key={i} className="text-[10.5px] px-1.5 h-5 rounded-sm bg-white/[0.04] border border-white/8 text-text-secondary flex items-center">{i}</span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-auto">
        <div className="text-[10.5px] text-text-tertiary uppercase tracking-[0.12em] num">Last run {view.last_run}</div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10.5px]">
          <button onClick={(e) => e.stopPropagation()} className="text-text-tertiary hover:text-text-primary px-1.5">Rename</button>
          <span className="text-text-quat">·</span>
          <button onClick={(e) => e.stopPropagation()} className="text-text-tertiary hover:text-[#E06C6C] px-1.5">Delete</button>
        </div>
      </div>
    </div>
  );
}

function ThumbChart({ kind }) {
  const points = {
    area: 'M0,40 L0,22 Q20,20 40,18 T80,14 T120,10 T160,8 T200,6 L200,40 Z',
    line: 'M0,32 Q20,26 40,30 T80,16 T120,20 T160,8 T200,12',
    'line-fall': 'M0,8 Q20,10 40,12 T80,16 T120,20 T160,24 T200,22',
    'bar-paired': null,
    dual: 'M0,20 Q20,18 40,16 T80,12 T120,10 T160,8 T200,6',
  }[kind];
  return (
    <div className="h-20 rounded-md bg-white/[0.02] border border-white/5 relative overflow-hidden">
      <svg viewBox="0 0 200 40" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`thumb_${kind}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.04"/>
          </linearGradient>
        </defs>
        {kind === 'bar-paired' ? (
          <g>
            {[0,1,2,3,4,5,6].map((i) => (
              <g key={i}>
                <rect x={i*28+8}  y={20 + (i%2===0?0:2)} width="8" height={20 - (i%2===0?0:2)} fill="#D4AF37"/>
                <rect x={i*28+18} y={16 + (i%3===0?2:0)} width="8" height={24 - (i%3===0?2:0)} fill="#7AA7D9"/>
              </g>
            ))}
          </g>
        ) : kind === 'dual' ? (
          <g>
            <path d="M0,28 Q20,26 40,24 T80,20 T120,18 T160,14 T200,10" stroke="#7AA7D9" strokeWidth="1.5" fill="none"/>
            <path d="M0,20 Q20,18 40,16 T80,12 T120,10 T160,8 T200,6" stroke="#D4AF37" strokeWidth="1.5" fill="none"/>
          </g>
        ) : kind === 'area' ? (
          <path d={points} stroke="#D4AF37" strokeWidth="1.5" fill={`url(#thumb_${kind})`} />
        ) : (
          <path d={points} stroke="#D4AF37" strokeWidth="1.5" fill="none"/>
        )}
      </svg>
    </div>
  );
}

// ------------------ COMPARISONS ------------------

function Comparisons() {
  const tables = window.EPAU_DATA.COMPARISON_TABLES;
  const [selected, setSelected] = useState(tables[0].id);
  const [q, setQ] = useState('');
  const current = tables.find((t) => t.id === selected);
  const list = tables.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="px-8 pt-6 pb-16 max-w-[1500px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Comparisons</div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">Side-by-side reference tables.</h1>
        </div>
      </div>
      <div className="grid grid-cols-[280px_1fr] gap-4">
        <div className="glass rounded-lg overflow-hidden self-start">
          <div className="p-1.5 flex items-center gap-2 border-b border-white/5">
            <Icon.Search className="w-4 h-4 text-text-tertiary ml-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tables"
              className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-tertiary py-1.5 px-1"/>
          </div>
          {list.map((t) => (
            <button key={t.id} onClick={() => setSelected(t.id)}
              className={`w-full text-left px-4 py-3 border-t border-white/5 first:border-t-0 flex flex-col gap-0.5 transition-colors ${selected === t.id ? 'bg-gold-300/5 border-l-2 border-l-gold-300' : 'hover:bg-white/[0.02]'}`}>
              <div className="flex items-center gap-1.5">
                <Icon.Columns className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-[12.5px] text-text-primary">{t.name}</span>
              </div>
              <span className="text-[10.5px] text-text-tertiary pl-5 num">{t.rows.length} rows · {t.groups.reduce((n, g) => n + g.span, 0)} cols</span>
            </button>
          ))}
        </div>

        <div className="glass rounded-lg p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-serif text-[22px] text-text-primary leading-tight">{current.name}</h2>
              <div className="text-[11.5px] text-text-tertiary mt-1">{current.description}</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary text-[12px] flex items-center gap-1.5">
                <Icon.Download className="w-3.5 h-3.5" /> PNG
              </button>
              <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary text-[12px] flex items-center gap-1.5">
                <Icon.File className="w-3.5 h-3.5" /> Word
              </button>
            </div>
          </div>

          <ComparisonTable table={current} />
        </div>
      </div>
    </div>
  );
}

function ComparisonTable({ table }) {
  const totalCols = table.groups.reduce((n, g) => n + g.span, 0);
  // Palette for group header accents
  const groupColors = ['#C8A87F', '#7AA7D9', '#B099D4'];
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full text-[12.5px] num border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="text-left text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium px-4 py-2 border-b border-white/10 align-bottom">Indicator</th>
            {table.groups.map((g, i) => (
              <th key={i} colSpan={g.span} className="text-center text-[11px] uppercase tracking-[0.14em] font-medium px-2 py-2 border-b border-white/10"
                style={{ color: groupColors[i % groupColors.length] }}>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border" style={{ borderColor: `${groupColors[i % groupColors.length]}40`, background: `${groupColors[i % groupColors.length]}0d` }}>
                  {g.label}
                </span>
              </th>
            ))}
            <th className="w-0 border-b border-white/10"></th>
          </tr>
          <tr>
            <th className="px-4 py-1.5 border-b border-white/5"></th>
            {table.groups.flatMap((g) => g.sub).map((s, i) => (
              <th key={i} className="text-right text-[10.5px] font-normal text-text-tertiary px-3 py-1.5 border-b border-white/5">{s}</th>
            ))}
            <th className="border-b border-white/5"></th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 text-[12.5px] text-text-primary border-b border-white/5">
                <span>{row.label.split(',')[0]}</span>
                <span className="text-text-tertiary text-[11px] ml-1.5">{row.label.includes(',') ? row.label.slice(row.label.indexOf(',')+1) : ''}</span>
              </td>
              {row.cells.map((c, ci) => (
                <td key={ci} className={`text-right px-3 py-2.5 border-b border-white/5 ${c === null || c === undefined ? 'text-text-quat' : (c < 0 ? 'text-[#E06C6C]' : 'text-text-primary')}`}>
                  {c === null || c === undefined ? '—' : (typeof c === 'number' ? fmt.n(c, Math.abs(c) < 100 ? 1 : 0) : c)}
                </td>
              ))}
              <td className="border-b border-white/5"></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-[10.5px] uppercase tracking-[0.12em] text-text-tertiary">
        Values in parentheses are negative. Bureau of Statistics and Ministry of Finance compilations.
      </div>
    </div>
  );
}

// ------------------ ADMIN ------------------

function Admin() {
  const run = window.EPAU_DATA.INGESTION_RUN;
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="px-8 pt-6 pb-16 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Admin · Ingestion</div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">Last workbook re-ingest.</h1>
        </div>
        <button className="h-9 px-4 rounded-md bg-gold-300 text-ink-950 text-[12.5px] font-semibold flex items-center gap-1.5">
          <Icon.Refresh className="w-3.5 h-3.5" /> Re-ingest now
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-4">
        <StatCard label="Run started" value={run.timestamp} span={2}/>
        <StatCard label="Sheets parsed" value={run.sheets_parsed.toString()} />
        <StatCard label="Indicators upserted" value={run.indicators_upserted.toLocaleString()} />
        <StatCard label="Observations upserted" value={run.observations_upserted.toLocaleString()} />
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-3">
        <div className="glass rounded-lg overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <Icon.Terminal className="w-4 h-4 text-gold-300"/>
              <span className="text-[12.5px] text-text-primary font-medium">Quarantined cells</span>
              <Pill tone="warn">{run.issues_count} issues</Pill>
            </div>
            <button onClick={() => setExpanded(!expanded)} className="text-[11.5px] text-text-tertiary hover:text-text-primary flex items-center gap-1">
              {expanded ? 'Collapse' : 'Expand'} <Icon.Chev className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}/>
            </button>
          </div>
          {expanded ? (
            <div className="font-mono text-[11.5px]">
              <div className="grid grid-cols-[100px_72px_1fr_88px] gap-3 px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-text-tertiary bg-white/[0.02] border-b border-white/5">
                <div>Sheet</div><div>Cell</div><div>Reason</div><div>Severity</div>
              </div>
              {run.quarantine.map((q, i) => (
                <div key={i} className="grid grid-cols-[100px_72px_1fr_88px] gap-3 px-4 py-2 border-b border-white/4 hover:bg-white/[0.02]">
                  <div className="text-gold-200">{q.sheet}</div>
                  <div className="text-text-secondary num">{q.cell}</div>
                  <div className="text-text-primary font-sans text-[12px]">{q.reason}</div>
                  <div>
                    <SeverityPill s={q.severity}/>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="glass rounded-lg p-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">Source workbook</div>
            <div className="flex items-center gap-2">
              <Icon.File className="w-4 h-4 text-text-tertiary" />
              <span className="text-[12.5px] text-text-primary font-mono truncate">{run.workbook}</span>
            </div>
            <div className="text-[11px] text-text-tertiary mt-1 num">{run.workbook_size} · 61 sheets · {run.duration} to parse</div>
          </div>
          <div className="glass rounded-lg p-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-3">Severity breakdown</div>
            <div className="space-y-2">
              {[
                { s: 'high', n: 4, c: '#E06C6C' },
                { s: 'medium', n: 5, c: '#E0A050' },
                { s: 'low', n: 5, c: '#7AA7D9' },
              ].map((x) => (
                <div key={x.s} className="flex items-center gap-2">
                  <span className="text-[11px] capitalize text-text-secondary w-16">{x.s}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(x.n/14)*100}%`, background: x.c }}/>
                  </div>
                  <span className="num text-[11px] text-text-primary w-5 text-right">{x.n}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-lg p-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">Previous runs</div>
            <div className="space-y-1.5 text-[11px] num">
              {['Mar 10, 2026','Mar 03, 2026','Feb 24, 2026','Feb 17, 2026'].map((d, i) => (
                <div key={d} className="flex items-center justify-between text-text-secondary">
                  <span>{d}</span>
                  <span className="text-text-tertiary">{[12,8,11,9][i]} issues</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, span = 1 }) {
  return (
    <div className={`glass rounded-lg p-4 ${span === 2 ? 'col-span-2' : ''}`}>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">{label}</div>
      <div className="font-serif text-[22px] text-text-primary mt-1 leading-tight num">{value}</div>
    </div>
  );
}

function SeverityPill({ s }) {
  const tone = { high: 'danger', medium: 'warn', low: 'cool' }[s];
  return <Pill tone={tone}>{s}</Pill>;
}

Object.assign(window, { Catalog, SavedViews, Comparisons, Admin });
