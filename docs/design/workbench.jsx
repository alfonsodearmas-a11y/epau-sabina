// Workbench surface — the hero. Three states: empty, running, results.
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const R = window.Recharts || {};
const {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine,
} = R;

const EXAMPLE_QUERIES = [
  'private sector credit by sector since 2015',
  'NRF inflows actual vs budget 2020 to 2026',
  'real GDP overall vs non-oil since 2017',
  'NPL ratio quarterly since 2017',
  'CPI inflation and G$ exchange rate since 2020',
];

// Map a natural-language query to a canned result.
function resolveQuery(q) {
  const t = q.toLowerCase();
  if (t.includes('credit') || t.includes('psc')) return 'psc';
  if (t.includes('nrf')) return 'nrf';
  if (t.includes('gdp') || t.includes('growth')) return 'gdp';
  if (t.includes('npl') || t.includes('non-performing')) return 'npl';
  if (t.includes('cpi') || t.includes('inflation') || t.includes('exchange')) return 'ambiguous';
  return 'psc';
}

// --- Chart wrapper with our styling ---
const axisProps = {
  tick: { fill: '#8A8778', fontSize: 11, fontFamily: 'Outfit' },
  axisLine: { stroke: 'rgba(255,255,255,0.08)' },
  tickLine: { stroke: 'rgba(255,255,255,0.06)' },
};

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-strong rounded-md px-3 py-2 text-[11px] shadow-xl">
      <div className="font-medium text-text-primary mb-1 font-mono">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-3 justify-between min-w-[180px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[1px]" style={{ background: p.color }} />
            <span className="text-text-secondary">{p.name}</span>
          </div>
          <span className="num text-text-primary font-medium">
            {p.value === null || p.value === undefined ? '—' : (typeof p.value === 'number' ? p.value.toLocaleString('en-US', { maximumFractionDigits: 1 }) : p.value)}
          </span>
        </div>
      ))}
      {unit ? <div className="mt-1 pt-1 border-t border-white/5 text-[10px] uppercase tracking-[0.12em] text-text-tertiary">{unit}</div> : null}
    </div>
  );
}

function PscAreaChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }} stackOffset="none">
        <defs>
          <linearGradient id="g_biz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#D4AF37" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="g_mort" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#7AA7D9" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7AA7D9" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="g_hh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#B099D4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#B099D4" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => fmt.nc(v)} />
        <Tooltip content={<CustomTooltip unit="G$ millions" />} cursor={{ stroke: 'rgba(212,175,55,0.25)', strokeWidth: 1 }} />
        <Area type="monotone" dataKey="business"   stackId="1" name="Business enterprises" stroke="#D4AF37" strokeWidth={1.6} fill="url(#g_biz)" />
        <Area type="monotone" dataKey="mortgages"  stackId="1" name="Real estate mortgages" stroke="#7AA7D9" strokeWidth={1.4} fill="url(#g_mort)" />
        <Area type="monotone" dataKey="households" stackId="1" name="Households"            stroke="#B099D4" strokeWidth={1.4} fill="url(#g_hh)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function NrfBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }} barCategoryGap={24}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => fmt.nc(v)} />
        <Tooltip content={<CustomTooltip unit="US$ millions" />} cursor={{ fill: 'rgba(212,175,55,0.06)' }} />
        <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11, color: '#C7C2B3' }} iconType="square" />
        <Bar dataKey="actual" name="Actual" fill="#D4AF37" radius={[2,2,0,0]} />
        <Bar dataKey="budget" name="Budget" fill="#7AA7D9" radius={[2,2,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function GdpLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => `${v}%`} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />
        <Tooltip content={<CustomTooltip unit="percent" />} cursor={{ stroke: 'rgba(212,175,55,0.25)' }} />
        <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11, color: '#C7C2B3' }} iconType="square" />
        <Line type="monotone" dataKey="overall" name="Overall real GDP" stroke="#D4AF37" strokeWidth={1.8} dot={{ r: 2.5, fill: '#D4AF37' }} />
        <Line type="monotone" dataKey="nonoil" name="Non-oil real GDP" stroke="#7AA7D9" strokeWidth={1.6} dot={{ r: 2.5, fill: '#7AA7D9' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function NplLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }}>
        <defs>
          <linearGradient id="g_npl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#D4AF37" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="q" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<CustomTooltip unit="percent" />} cursor={{ stroke: 'rgba(212,175,55,0.25)' }} />
        <Area type="monotone" dataKey="npl" name="NPL ratio" stroke="#D4AF37" strokeWidth={1.8} fill="url(#g_npl)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// --- Query bar ---
function QueryBar({ value, onChange, onRun, manualMode, onToggleManual, disabled }) {
  const [ph, setPh] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPh((p) => (p + 1) % EXAMPLE_QUERIES.length), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="glass-strong rounded-lg p-1.5 flex items-center gap-1.5 gold-ring">
      <div className="pl-3 pr-1 text-gold-300">
        <Icon.Sparkle className="w-4 h-4" />
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onRun(); }}
        placeholder={`Try: ${EXAMPLE_QUERIES[ph]}`}
        className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary py-2.5 px-1 font-normal"
        disabled={disabled}
      />
      <button
        onClick={onToggleManual}
        className={`h-9 px-3 rounded-md text-[12px] flex items-center gap-1.5 border transition-colors ${manualMode ? 'bg-white/[0.06] border-white/15 text-text-primary' : 'bg-transparent border-white/10 text-text-tertiary hover:text-text-secondary hover:border-white/20'}`}
        title="Toggle manual picker"
      >
        <Icon.Sliders className="w-3.5 h-3.5" />
        Manual
      </button>
      <div className="w-px h-6 bg-white/10 mx-1" />
      <button
        onClick={onRun}
        disabled={disabled}
        className="h-9 px-4 rounded-md bg-gold-300 hover:bg-gold-200 text-ink-950 text-[12.5px] font-semibold tracking-wide flex items-center gap-1.5 transition-colors disabled:opacity-50"
      >
        Run
        <KeyCap className="!bg-black/20 !border-black/20 !text-ink-950">↵</KeyCap>
      </button>
    </div>
  );
}

function ManualPicker({ selected, onToggle }) {
  const all = window.EPAU_DATA.INDICATORS;
  return (
    <div className="glass rounded-lg mt-2 p-3 fade-up">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.14em] text-text-tertiary">Manual: pick indicators</div>
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          <div className="flex items-center gap-1.5">
            <span>Date range</span>
            <span className="num text-text-secondary bg-white/5 border border-white/10 rounded px-2 py-0.5">Jan 2015</span>
            <span>to</span>
            <span className="num text-text-secondary bg-white/5 border border-white/10 rounded px-2 py-0.5">Feb 2026</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span>Chart</span>
            <span className="text-text-secondary bg-white/5 border border-white/10 rounded px-2 py-0.5">Stacked area</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto scroll-thin pr-1">
        {all.map((ind) => {
          const on = selected.includes(ind.id);
          return (
            <button
              key={ind.id}
              onClick={() => onToggle(ind.id)}
              className={`text-left px-2.5 py-1.5 rounded-md border transition-colors flex items-center gap-2 ${on ? 'bg-gold-300/10 border-gold-300/40 text-text-primary' : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-text-secondary'}`}
            >
              <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${on ? 'border-gold-300 bg-gold-300' : 'border-white/20'}`}>
                {on ? <Icon.Check className="w-3 h-3 text-ink-950" /> : null}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11.5px] leading-tight truncate">{ind.name}</span>
                <span className="block text-[10px] text-text-tertiary">{ind.source.split(',')[0]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Disambiguation({ onPick }) {
  const options = [
    { id: 'cpi',   title: 'CPI inflation, 12-month', detail: 'Macro · monthly · latest Feb 2026' },
    { id: 'fx',    title: 'Exchange rate, G$ per US$ period average', detail: 'External · monthly · latest Feb 2026' },
    { id: 'both',  title: 'Both, on a dual-axis chart', detail: 'Combine CPI and FX pass-through' },
  ];
  return (
    <div className="glass rounded-lg mt-2 p-3 fade-up">
      <div className="flex items-start gap-2 mb-2">
        <div className="text-gold-300 mt-0.5"><Icon.Sparkle className="w-3.5 h-3.5" /></div>
        <div>
          <div className="text-[13px] text-text-primary">Three possible matches. Which did you mean?</div>
          <div className="text-[11px] text-text-tertiary">Pick one to run, or refine the query.</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className="text-left p-3 rounded-md bg-white/[0.02] border border-white/8 hover:border-gold-300/40 hover:bg-gold-300/5 transition-colors"
          >
            <div className="text-[12.5px] text-text-primary font-medium leading-tight">{o.title}</div>
            <div className="text-[10.5px] text-text-tertiary mt-1">{o.detail}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Skeleton / running state ---
function RunningState() {
  const steps = [
    { label: 'Parsing query intent', done: true },
    { label: 'Matching indicators against catalog', done: true },
    { label: 'Fetching observations (1,247 rows)', done: false, active: true },
    { label: 'Rendering chart', done: false },
  ];
  return (
    <div className="grid grid-cols-[1fr_320px] gap-3 mt-3 fade-up">
      <div className="glass rounded-lg p-4 h-[420px] flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-pulse" />
          <span className="text-[11.5px] uppercase tracking-[0.14em] text-gold-300 font-medium">Running</span>
          <span className="text-[11px] text-text-tertiary ml-auto num">1.2s</span>
        </div>
        <div className="space-y-2 mb-5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[12px]">
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${s.done ? 'bg-gold-300/20 border-gold-300/50' : s.active ? 'border-gold-300' : 'border-white/15'}`}>
                {s.done ? <Icon.Check className="w-2.5 h-2.5 text-gold-300" /> : s.active ? <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-pulse" /> : null}
              </span>
              <span className={s.done ? 'text-text-secondary' : s.active ? 'text-text-primary' : 'text-text-tertiary'}>{s.label}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 relative">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <svg viewBox="0 0 400 200" className="absolute inset-0 w-full h-full">
            {[0,1,2,3,4].map(i => <line key={i} x1="0" y1={40*i+10} x2="400" y2={40*i+10} stroke="rgba(255,255,255,0.04)" />)}
            <path d="M 10 160 Q 60 150, 90 140 T 170 110 T 250 80 T 330 60 T 390 40"
              stroke="rgba(212,175,55,0.45)" strokeWidth="1.8" fill="none" strokeDasharray="4 4" className="skeleton-bar"/>
          </svg>
        </div>
      </div>
      <div className="space-y-3">
        {[56,80,120].map((h,i) => (
          <div key={i} className="glass rounded-lg p-3">
            <div className="skeleton-bar h-2 w-20 bg-white/10 rounded mb-2" style={{ animationDelay: `${i*0.15}s` }}/>
            <div className="skeleton-bar h-1.5 bg-white/5 rounded mb-1.5" style={{ animationDelay: `${i*0.15+0.1}s` }}/>
            <div className="skeleton-bar h-1.5 w-3/4 bg-white/5 rounded mb-1.5" style={{ animationDelay: `${i*0.15+0.2}s` }}/>
            <div className="skeleton-bar h-1.5 w-5/6 bg-white/5 rounded" style={{ animationDelay: `${i*0.15+0.3}s`, height: h > 100 ? '40px' : undefined }}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Results: the main payload ---
function ResultsPanel({ view, setView, commentary, setCommentary }) {
  const [chartType, setChartType] = useState(view.chart);
  const [showTable, setShowTable] = useState(false);
  const { PSC_SERIES, NRF_SERIES, GDP_SERIES, NPL_SERIES } = window.EPAU_DATA;

  const spec = {
    psc: {
      title: 'Private sector credit by sector',
      subtitle: 'Annual stock, G$ millions, 2015 to 2026',
      indicators: [
        { id: 'psc_business',   name: 'Business enterprises',    unit: 'G$ millions', source: 'BoG Statistical Bulletin Tbl 3.4', color: '#D4AF37' },
        { id: 'psc_mortgages',  name: 'Real estate mortgages',   unit: 'G$ millions', source: 'BoG Statistical Bulletin Tbl 3.4', color: '#7AA7D9' },
        { id: 'psc_households', name: 'Households',              unit: 'G$ millions', source: 'BoG Statistical Bulletin Tbl 3.4', color: '#B099D4' },
      ],
      caveats: [
        { level: 'info', text: 'Figures are end-of-period stock; flows are derivable as first differences.' },
        { level: 'warn', text: 'Credit classification revised in the 2022 Statistical Bulletin; "other services" was reallocated across business and households. Pre-2022 values are BoG-backcast.' },
      ],
      headline: { label: 'Total, 2026 (Feb)', value: '500,800', unit: 'G$ millions', delta: '+12.4%', deltaLabel: 'vs. same month 2025' },
      data: PSC_SERIES,
      render: (d) => <PscAreaChart data={d} />,
      table: ['year','business','mortgages','households'],
      tableLabels: { year: 'Year', business: 'Business', mortgages: 'Mortgages', households: 'Households' },
      commentary: "Private sector credit climbed to G$500.8 billion in February 2026, extending a broad-based expansion that has run alongside the oil-era investment cycle. Business enterprise lending remains the largest single category, but the share of real estate mortgages has risen from roughly 22 percent of the portfolio in 2015 to 34 percent today, reflecting sustained mortgage underwriting by commercial banks against the backdrop of firm residential demand in Regions 3 and 4. Household credit has grown in tandem with formal-sector employment, though from a low base. The composition shift warrants continued macroprudential attention, particularly as the mortgage book has now doubled in nominal terms over four years; stress-testing results due from the Bank of Guyana in Q2 will inform whether the sector-specific capital add-ons require recalibration.",
    },
    nrf: {
      title: 'NRF inflows, actual versus budget',
      subtitle: 'US$ millions, 2020 to 2026',
      indicators: [
        { id: 'nrf_inflows_actual', name: 'Actual',  unit: 'US$ millions', source: 'MoF NRF Quarterly Reports',   color: '#D4AF37' },
        { id: 'nrf_inflows_budget', name: 'Budget',  unit: 'US$ millions', source: 'National Budget Appendix III', color: '#7AA7D9' },
      ],
      caveats: [
        { level: 'warn', text: 'Royalties recorded on cash basis; 2025 figures remain provisional pending audit completion.' },
        { level: 'info', text: '2026 actual not yet observed; budget value shown for comparison.' },
      ],
      headline: { label: '2025 shortfall', value: '(450)', unit: 'US$ millions', delta: '-15.5%', deltaLabel: 'vs. budget' },
      data: NRF_SERIES,
      render: (d) => <NrfBarChart data={d} />,
      table: ['year','actual','budget'],
      tableLabels: { year: 'Year', actual: 'Actual', budget: 'Budget' },
      commentary: "NRF inflows in 2025 totalled US$2,450 million, undershooting the US$2,900 million budget by about US$450 million. The shortfall reflects softer realised Brent prices in the second half and a scheduled Liza Phase 1 maintenance turnaround that trimmed lifted volumes. On a multi-year view, the Fund has received US$8,510 million since 2020, tracking 94 percent of cumulative budget. The 2026 budget of US$2,800 million assumes an average realised price of US$75 per barrel and continued ramp of the Payara and Yellowtail developments; risks are weighted to the downside on price and to the upside on volumes. EPAU recommends retaining the current withdrawal rule pending the Q2 reassessment.",
    },
    gdp: {
      title: 'Real GDP growth: overall versus non-oil',
      subtitle: 'Percent, year-on-year, 2017 to 2025',
      indicators: [
        { id: 'gdp_real_growth',   name: 'Overall real GDP', unit: 'percent', source: 'BoS National Accounts', color: '#D4AF37' },
        { id: 'gdp_nonoil_growth', name: 'Non-oil real GDP', unit: 'percent', source: 'BoS National Accounts', color: '#7AA7D9' },
      ],
      caveats: [
        { level: 'warn', text: '2025 is a first estimate and is subject to revision with the Q4 national accounts release scheduled for April.' },
        { level: 'info', text: 'Non-oil series excludes direct contribution of crude production; indirect effects through services and construction remain.' },
      ],
      headline: { label: 'Non-oil GDP, 2025', value: '6.3', unit: 'percent', delta: '-2.2pp', deltaLabel: 'vs. 2024' },
      data: GDP_SERIES,
      render: (d) => <GdpLineChart data={d} />,
      table: ['year','overall','nonoil'],
      tableLabels: { year: 'Year', overall: 'Overall', nonoil: 'Non-oil' },
      commentary: "Real GDP expanded 14.4 percent in 2025, a notable moderation from 43.6 percent in 2024 as the base effect from Payara first oil rolled off. Non-oil growth registered 6.3 percent, down from 8.5 percent the prior year but still well above the pre-oil trend of roughly 3 percent. Construction and wholesale and retail trade continued to lead the non-oil expansion, supported by public capital execution at 91 percent of budget. Services, particularly transport and communication, decelerated mildly in the second half. The divergence between headline and non-oil growth will narrow further as additional production phases reach nameplate and base effects compress, making the non-oil series the more policy-relevant gauge from 2026 onward.",
    },
    npl: {
      title: 'Non-performing loans ratio',
      subtitle: 'Percent of total loans, quarterly, 2017 to 2025',
      indicators: [
        { id: 'npl_ratio', name: 'NPL ratio', unit: 'percent', source: 'BoG Financial Stability Report', color: '#D4AF37' },
      ],
      caveats: [
        { level: 'info', text: 'Classification follows IFRS 9 Stage 3; restructured loans are included after the observation period.' },
      ],
      headline: { label: 'Q4 2025', value: '4.6', unit: 'percent', delta: '-8.0pp', deltaLabel: 'vs. 2018 peak' },
      data: NPL_SERIES,
      render: (d) => <NplLineChart data={d} />,
      table: ['q','npl'],
      tableLabels: { q: 'Quarter', npl: 'NPL ratio' },
      commentary: "The non-performing loans ratio stood at 4.6 percent in the fourth quarter of 2025, essentially flat against the prior quarter and well below the 12.9 percent peak recorded in the first quarter of 2018. The decade-long decline reflects both numerator and denominator effects: resolution of legacy exposures in the gold and rice sectors, tighter underwriting standards following the 2019 prudential reforms, and rapid growth in the performing loan book. The modest uptick over the past four quarters warrants monitoring; it is concentrated in small and medium enterprise exposures, particularly in construction subcontracting. Absent a broader deterioration, current coverage ratios of approximately 78 percent suggest the banking system retains ample buffers.",
    },
  }[view.kind];

  return (
    <div className="mt-3 fade-up">
      {/* Header row: title + chart type switcher */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="font-serif text-[26px] leading-[1.15] text-text-primary">{spec.title}</h2>
          <div className="text-[12.5px] text-text-tertiary mt-0.5">{spec.subtitle}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-white/[0.03] border border-white/8">
            {[
              { id: 'area', label: 'Area', icon: 'Chart' },
              { id: 'line', label: 'Line', icon: 'Chart' },
              { id: 'bar',  label: 'Bar',  icon: 'Chart' },
              { id: 'table',label: 'Table',icon: 'Table' },
            ].map((t) => {
              const ActiveIcon = Icon[t.icon];
              const on = chartType === t.id;
              return (
                <button key={t.id} onClick={() => setChartType(t.id)}
                  className={`px-2.5 h-7 rounded flex items-center gap-1.5 text-[11.5px] transition-colors ${on ? 'bg-white/[0.08] text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}>
                  <ActiveIcon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <button className="h-7 w-7 rounded-md bg-white/[0.03] border border-white/8 text-text-tertiary hover:text-text-primary flex items-center justify-center" title="Pin to saved views">
            <Icon.Pin className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-3">
        {/* Chart region */}
        <div className="glass rounded-lg p-4 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">{spec.headline.label}</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-serif text-[32px] leading-none text-gold-300 num">{spec.headline.value}</span>
                <span className="text-[11.5px] text-text-tertiary">{spec.headline.unit}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">{spec.headline.deltaLabel}</div>
              <div className={`text-[18px] num mt-0.5 ${spec.headline.delta.startsWith('-') || spec.headline.delta.startsWith('(') ? 'text-[#E06C6C]' : 'text-[#7FC29B]'}`}>{spec.headline.delta}</div>
            </div>
          </div>
          <div className="h-[320px]">
            {chartType === 'table' ? (
              <ResultsTable spec={spec} />
            ) : spec.render(spec.data)}
          </div>
          {/* Inline legend / source */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/6">
            <div className="flex items-center gap-3 flex-wrap">
              {spec.indicators.map((ind) => (
                <div key={ind.id} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ind.color }} />
                  <span className="text-text-secondary">{ind.name}</span>
                  <span className="text-text-quat">·</span>
                  <span className="text-text-tertiary">{ind.unit}</span>
                </div>
              ))}
            </div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-text-tertiary">
              As of Mar 17, 2026
            </div>
          </div>
        </div>

        {/* Right stack */}
        <div className="space-y-3">
          <SidePanel title="Selected indicators" count={spec.indicators.length}>
            {spec.indicators.map((ind) => (
              <div key={ind.id} className="px-4 py-2.5 border-t border-white/5 first:border-t-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: ind.color }} />
                  <span className="text-[12.5px] text-text-primary font-medium truncate">{ind.name}</span>
                </div>
                <div className="text-[10.5px] text-text-tertiary mt-0.5 pl-3.5">
                  {ind.unit} · {ind.source}
                </div>
              </div>
            ))}
          </SidePanel>

          <CaveatsPanel caveats={spec.caveats} />

          <DataTableToggle spec={spec} open={showTable} onToggle={() => setShowTable(!showTable)} />
        </div>
      </div>

      {/* Commentary */}
      <CommentaryPanel spec={spec} commentary={commentary} setCommentary={setCommentary} />

      {/* Export row */}
      <div className="mt-3 flex items-center justify-between glass rounded-lg px-4 py-3">
        <div className="text-[11.5px] text-text-tertiary flex items-center gap-2">
          <Icon.Check className="w-3.5 h-3.5 text-[#7FC29B]" />
          Query resolved against 3 indicators, 42 observations. Last re-ingest 09:14 GYT today.
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary text-[12px] flex items-center gap-1.5 transition-colors">
            <Icon.Download className="w-3.5 h-3.5" /> Chart as PNG
          </button>
          <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary text-[12px] flex items-center gap-1.5 transition-colors">
            <Icon.File className="w-3.5 h-3.5" /> Export as Word
          </button>
          <button className="h-8 px-3 rounded-md bg-gold-300/10 border border-gold-300/30 text-gold-200 hover:bg-gold-300/20 text-[12px] flex items-center gap-1.5 transition-colors">
            <Icon.Pin className="w-3.5 h-3.5" /> Save this view
          </button>
        </div>
      </div>
    </div>
  );
}

function SidePanel({ title, count, children }) {
  return (
    <div className="glass rounded-lg overflow-hidden">
      <SectionLabel right={<span className="num text-text-quat">{count}</span>}>{title}</SectionLabel>
      {children}
    </div>
  );
}

function CaveatsPanel({ caveats }) {
  return (
    <div className="glass rounded-lg overflow-hidden border-l-2 border-l-[#E0A050]/40">
      <div className="px-4 pt-2 pb-1.5 flex items-center gap-2">
        <Icon.Warn className="w-3.5 h-3.5 text-[#E0A050]" />
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#E0A050] font-medium">Caveats</span>
        <span className="num text-text-quat text-[10.5px] ml-auto">{caveats.length}</span>
      </div>
      {caveats.map((c, i) => (
        <div key={i} className="px-4 py-2 border-t border-white/5 flex gap-2">
          <span className={`w-1 mt-1 shrink-0 self-stretch rounded-sm ${c.level === 'warn' ? 'bg-[#E0A050]/60' : 'bg-white/15'}`} />
          <span className="text-[11.5px] text-text-secondary leading-snug">{c.text}</span>
        </div>
      ))}
    </div>
  );
}

function DataTableToggle({ spec, open, onToggle }) {
  return (
    <div className="glass rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <Icon.Table className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-[12px] text-text-secondary">Data table</span>
          <span className="num text-text-quat text-[10.5px]">{spec.data.length} rows</span>
        </div>
        <Icon.Chev className={`w-4 h-4 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="border-t border-white/5 max-h-56 overflow-y-auto scroll-thin">
          <table className="w-full text-[11px] num">
            <thead className="bg-white/[0.02] text-text-tertiary">
              <tr>
                {spec.table.map((k) => <th key={k} className="text-right font-medium px-3 py-1.5 first:text-left uppercase tracking-[0.1em] text-[10px]">{spec.tableLabels[k]}</th>)}
              </tr>
            </thead>
            <tbody>
              {spec.data.map((row, i) => (
                <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
                  {spec.table.map((k) => (
                    <td key={k} className={`px-3 py-1.5 text-right first:text-left ${k === spec.table[0] ? 'text-text-secondary' : 'text-text-primary'}`}>
                      {row[k] === null || row[k] === undefined ? <span className="text-text-quat">—</span> : (typeof row[k] === 'number' ? fmt.n(row[k], k === 'npl' || k.includes('nonoil') || k.includes('overall') ? 1 : 0) : row[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function ResultsTable({ spec }) {
  return (
    <div className="h-full overflow-auto scroll-thin">
      <table className="w-full text-[12px] num">
        <thead className="bg-white/[0.02] text-text-tertiary sticky top-0">
          <tr>
            {spec.table.map((k) => <th key={k} className="text-right font-medium px-4 py-2 first:text-left uppercase tracking-[0.1em] text-[10.5px]">{spec.tableLabels[k]}</th>)}
          </tr>
        </thead>
        <tbody>
          {spec.data.map((row, i) => (
            <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
              {spec.table.map((k) => (
                <td key={k} className={`px-4 py-2 text-right first:text-left ${k === spec.table[0] ? 'text-text-secondary' : 'text-text-primary'}`}>
                  {row[k] === null || row[k] === undefined ? <span className="text-text-quat">—</span> : (typeof row[k] === 'number' ? fmt.n(row[k], (k === 'npl' || k === 'nonoil' || k === 'overall') ? 1 : 0) : row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommentaryPanel({ spec, commentary, setCommentary }) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    setGenerating(true);
    setCommentary(null);
    setTimeout(() => {
      setCommentary(spec.commentary);
      setGenerating(false);
    }, 1200);
  };

  const copy = () => {
    if (commentary) {
      navigator.clipboard?.writeText(commentary).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <div className="mt-3">
      {!commentary && !generating ? (
        <div className="glass rounded-lg p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon.Sparkle className="w-3.5 h-3.5 text-gold-300" />
              <span className="text-[11px] uppercase tracking-[0.14em] text-gold-300 font-medium">Commentary</span>
            </div>
            <div className="text-[13px] text-text-secondary">Draft a 150-word paragraph in EPAU house style, grounded in these observations.</div>
          </div>
          <button onClick={generate} className="h-9 px-4 rounded-md bg-gold-300/10 border border-gold-300/30 text-gold-200 hover:bg-gold-300/20 text-[12.5px] font-medium flex items-center gap-1.5 transition-colors">
            <Icon.Sparkle className="w-3.5 h-3.5" />
            Draft commentary
          </button>
        </div>
      ) : generating ? (
        <div className="glass-strong rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Icon.Sparkle className="w-3.5 h-3.5 text-gold-300 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-gold-300 font-medium">Drafting commentary</span>
          </div>
          <div className="space-y-2">
            {[100, 95, 92, 80].map((w, i) => (
              <div key={i} className="skeleton-bar h-2.5 bg-white/6 rounded" style={{ width: `${w}%`, animationDelay: `${i*0.15}s` }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-strong rounded-lg p-5 gold-ring">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon.Sparkle className="w-3.5 h-3.5 text-gold-300" />
              <span className="text-[11px] uppercase tracking-[0.14em] text-gold-300 font-medium">Commentary</span>
              <span className="text-text-quat">·</span>
              <span className="text-[11px] text-text-tertiary num">{commentary.split(/\s+/).length} words · EPAU house style</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={generate} className="h-7 px-2.5 rounded bg-white/[0.04] border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 text-[11.5px] flex items-center gap-1.5 transition-colors">
                <Icon.Refresh className="w-3 h-3" /> Regenerate
              </button>
              <button onClick={copy} className="h-7 px-2.5 rounded bg-white/[0.04] border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 text-[11.5px] flex items-center gap-1.5 transition-colors">
                {copied ? <><Icon.Check className="w-3 h-3 text-[#7FC29B]" /> Copied</> : <><Icon.Copy className="w-3 h-3" /> Copy to clipboard</>}
              </button>
            </div>
          </div>
          <p className="text-[14px] leading-[1.65] text-text-primary max-w-[86ch]" style={{ textWrap: 'pretty' }}>{commentary}</p>
        </div>
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="mt-6 fade-up">
      <div className="text-center mb-5">
        <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Start with a question</div>
        <div className="font-serif text-[22px] text-text-secondary mt-1">What do you want to brief on?</div>
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-[780px] mx-auto">
        {EXAMPLE_QUERIES.map((q) => (
          <button key={q} className="text-left glass rounded-md px-4 py-3 hover:border-gold-300/40 group transition-colors">
            <div className="text-[12.5px] text-text-secondary group-hover:text-text-primary leading-snug">{q}</div>
            <div className="text-[10.5px] text-text-quat mt-1 uppercase tracking-[0.12em] flex items-center gap-2">
              <KeyCap>↵</KeyCap> Run
            </div>
          </button>
        ))}
      </div>
      <div className="mt-6 text-center text-[11.5px] text-text-tertiary">
        or press <KeyCap>⌘</KeyCap> <KeyCap>K</KeyCap> to search indicators by name.
      </div>
    </div>
  );
}

function Workbench({ initialState = 'empty', initialQuery = '' }) {
  const [state, setState] = useState(initialState); // 'empty' | 'running' | 'results' | 'ambiguous'
  const [query, setQuery] = useState(initialQuery);
  const [manualMode, setManualMode] = useState(false);
  const [selected, setSelected] = useState(['psc_business', 'psc_mortgages', 'psc_households']);
  const [view, setView] = useState({ kind: 'psc', chart: 'area' });
  const [commentary, setCommentary] = useState(null);

  // Jump on prop change (used when navigating from saved views)
  useEffect(() => {
    setState(initialState);
    setQuery(initialQuery);
    if (initialState === 'results') {
      const kind = resolveQuery(initialQuery);
      if (kind !== 'ambiguous') setView({ kind, chart: kind === 'nrf' ? 'bar' : kind === 'gdp' ? 'line' : 'area' });
      setCommentary(null);
    }
  }, [initialState, initialQuery]);

  const run = () => {
    if (!query.trim()) return;
    const kind = resolveQuery(query);
    if (kind === 'ambiguous') {
      setState('ambiguous');
      return;
    }
    setState('running');
    setCommentary(null);
    setTimeout(() => {
      setView({ kind, chart: kind === 'nrf' ? 'bar' : kind === 'gdp' ? 'line' : 'area' });
      setState('results');
    }, 1400);
  };

  const pickDisambiguation = (id) => {
    setState('running');
    setCommentary(null);
    setTimeout(() => {
      setView({ kind: id === 'both' ? 'gdp' : id === 'fx' ? 'gdp' : 'npl', chart: 'line' });
      setState('results');
    }, 1000);
  };

  return (
    <div className="px-8 pt-6 pb-16 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Query Workbench</div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">Ask the workbook a question.</h1>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-tertiary pt-2">
          <Icon.Dot className="w-2 h-2 text-[#7FC29B]" />
          <span>Catalog up to date · <span className="num">1,384 indicators · 94,726 observations</span></span>
        </div>
      </div>

      <QueryBar value={query} onChange={setQuery} onRun={run} manualMode={manualMode} onToggleManual={() => setManualMode((x) => !x)} disabled={state === 'running'} />
      {manualMode ? <ManualPicker selected={selected} onToggle={(id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])} /> : null}

      {/* State-specific body */}
      {state === 'empty' ? <EmptyHint /> : null}
      {state === 'ambiguous' ? <Disambiguation onPick={pickDisambiguation} /> : null}
      {state === 'running' ? <RunningState /> : null}
      {state === 'results' ? <ResultsPanel view={view} setView={setView} commentary={commentary} setCommentary={setCommentary} /> : null}

      {/* Footer: state switcher for demo purposes */}
      <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-quat">Prototype state demo</div>
        <div className="flex items-center gap-1.5">
          {[
            { id: 'empty', label: 'Empty' },
            { id: 'running', label: 'Running' },
            { id: 'ambiguous', label: 'Disambiguation' },
            { id: 'results', label: 'Results' },
          ].map((s) => (
            <button key={s.id} onClick={() => { setState(s.id); if (s.id === 'results') { setCommentary(null); setView({ kind: 'psc', chart: 'area' }); setQuery('private sector credit by sector since 2015'); } }}
              className={`h-7 px-3 rounded text-[11px] border transition-colors ${state === s.id ? 'bg-gold-300/10 border-gold-300/30 text-gold-200' : 'bg-white/[0.02] border-white/8 text-text-tertiary hover:text-text-secondary hover:border-white/15'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Workbench });
