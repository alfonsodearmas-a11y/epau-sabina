// Main app shell: top nav, command palette, view routing.
const { useState, useEffect, useCallback, useRef } = React;

function App() {
  const [route, setRoute] = useState('workbench');
  const [wbState, setWbState] = useState('results');
  const [wbQuery, setWbQuery] = useState('private sector credit by sector since 2015');
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Keyboard: Cmd+K, Escape
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((x) => !x); }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const openInWorkbench = (indOrQuery) => {
    const query = typeof indOrQuery === 'string'
      ? indOrQuery
      : (indOrQuery.id === 'nrf_inflows_actual'
         ? 'NRF inflows actual vs budget 2020 to 2026'
         : indOrQuery.id.startsWith('psc_')
         ? 'private sector credit by sector since 2015'
         : indOrQuery.id === 'gdp_real_growth' || indOrQuery.id === 'gdp_nonoil_growth'
         ? 'real GDP overall vs non-oil since 2017'
         : indOrQuery.id === 'npl_ratio'
         ? 'NPL ratio quarterly since 2017'
         : indOrQuery.name.toLowerCase());
    setWbQuery(query);
    setWbState('results');
    setRoute('workbench');
    setPaletteOpen(false);
  };

  return (
    <div className="min-h-screen">
      <TopNav route={route} setRoute={setRoute} onOpenPalette={() => setPaletteOpen(true)} />
      <main>
        {route === 'catalog'     ? <Catalog onOpenInWorkbench={openInWorkbench} /> : null}
        {route === 'workbench'   ? <Workbench initialState={wbState} initialQuery={wbQuery} /> : null}
        {route === 'saved'       ? <SavedViews onOpen={openInWorkbench} /> : null}
        {route === 'comparisons' ? <Comparisons /> : null}
        {route === 'admin'       ? <Admin /> : null}
      </main>
      {paletteOpen ? <CommandPalette onClose={() => setPaletteOpen(false)} onPick={openInWorkbench} onNav={(r) => { setRoute(r); setPaletteOpen(false); }} /> : null}
      <BottomStatus route={route}/>
    </div>
  );
}

function TopNav({ route, setRoute, onOpenPalette }) {
  const items = [
    { id: 'workbench',   label: 'Workbench', icon: 'Sparkle' },
    { id: 'catalog',     label: 'Catalog',   icon: 'Search' },
    { id: 'saved',       label: 'Saved Views', icon: 'Pin' },
    { id: 'comparisons', label: 'Comparisons', icon: 'Columns' },
    { id: 'admin',       label: 'Admin', icon: 'Terminal' },
  ];
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-950/75 border-b border-white/5">
      <div className="max-w-[1500px] mx-auto px-8 h-[52px] flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 rounded-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gold-300 to-gold-500" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-ink-950 text-[16px] leading-none">E</span>
            </div>
            <div className="absolute inset-0 border border-gold-200/50" />
          </div>
          <div className="leading-none">
            <div className="text-[13px] font-medium text-text-primary tracking-wide">EPAU</div>
            <div className="text-[9.5px] uppercase tracking-[0.18em] text-text-tertiary">Analyst Workbench</div>
          </div>
        </div>

        <nav className="flex items-center gap-0.5 ml-4">
          {items.map((it) => {
            const I = Icon[it.icon];
            const on = route === it.id;
            return (
              <button key={it.id} onClick={() => setRoute(it.id)}
                className={`h-8 px-3 rounded-md flex items-center gap-1.5 text-[12.5px] transition-colors ${on ? 'bg-gold-300/10 text-gold-200 border border-gold-300/25' : 'text-text-secondary hover:text-text-primary border border-transparent'}`}>
                <I className="w-3.5 h-3.5" />
                {it.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={onOpenPalette} className="h-8 px-2.5 rounded-md bg-white/[0.03] border border-white/8 hover:border-white/15 text-text-tertiary hover:text-text-secondary flex items-center gap-2 text-[11.5px] min-w-[260px]">
            <Icon.Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Search indicators, views, comparisons</span>
            <span className="flex items-center gap-0.5">
              <KeyCap>⌘</KeyCap><KeyCap>K</KeyCap>
            </span>
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            <span className="num">v2026.03.17</span>
            <span className="w-1 h-1 rounded-full bg-[#7FC29B]"/>
            <span>Sabina, EPAU</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function CommandPalette({ onClose, onPick, onNav }) {
  const [q, setQ] = useState('');
  const all = window.EPAU_DATA.INDICATORS;
  const views = window.EPAU_DATA.SAVED_VIEWS;
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const inds = all.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  const savedMatches = views.filter((v) => !q || v.name.toLowerCase().includes(q.toLowerCase()) || v.query.toLowerCase().includes(q.toLowerCase())).slice(0, 3);

  const navItems = [
    { id: 'workbench', label: 'Go to Workbench', icon: 'Sparkle' },
    { id: 'catalog', label: 'Go to Catalog', icon: 'Search' },
    { id: 'saved', label: 'Go to Saved Views', icon: 'Pin' },
    { id: 'comparisons', label: 'Go to Comparisons', icon: 'Columns' },
    { id: 'admin', label: 'Go to Admin', icon: 'Terminal' },
  ].filter((n) => !q || n.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[640px] glass-strong rounded-xl gold-ring overflow-hidden fade-up">
        <div className="flex items-center gap-2 px-4 h-12 border-b border-white/8">
          <Icon.Search className="w-4 h-4 text-gold-300" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search indicators, views, or navigate…"
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary" />
          <KeyCap>Esc</KeyCap>
        </div>
        <div className="max-h-[50vh] overflow-y-auto scroll-thin py-1">
          {inds.length ? (
            <>
              <SectionLabel className="!px-4 !py-1.5 !text-[10px]">Indicators</SectionLabel>
              {inds.map((i) => (
                <button key={i.id} onClick={() => onPick(i)} className="w-full flex items-center gap-3 px-4 h-9 hover:bg-white/[0.04] text-left">
                  <Icon.Chart className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-[12.5px] text-text-primary flex-1">{i.name}</span>
                  <CategoryPill category={i.category} />
                  <span className="text-[10.5px] text-text-tertiary num min-w-[48px] text-right">{i.latest}</span>
                </button>
              ))}
            </>
          ) : null}
          {savedMatches.length ? (
            <>
              <Divider className="my-1" />
              <SectionLabel className="!px-4 !py-1.5 !text-[10px]">Saved views</SectionLabel>
              {savedMatches.map((v) => (
                <button key={v.id} onClick={() => onPick(v.query)} className="w-full flex items-center gap-3 px-4 h-9 hover:bg-white/[0.04] text-left">
                  <Icon.Pin className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-[12.5px] text-text-primary flex-1 truncate">{v.name}</span>
                  <span className="text-[10.5px] text-text-tertiary num">{v.last_run}</span>
                </button>
              ))}
            </>
          ) : null}
          {navItems.length ? (
            <>
              <Divider className="my-1"/>
              <SectionLabel className="!px-4 !py-1.5 !text-[10px]">Navigate</SectionLabel>
              {navItems.map((n) => {
                const I = Icon[n.icon];
                return (
                  <button key={n.id} onClick={() => onNav(n.id)} className="w-full flex items-center gap-3 px-4 h-9 hover:bg-white/[0.04] text-left">
                    <I className="w-3.5 h-3.5 text-text-tertiary" />
                    <span className="text-[12.5px] text-text-secondary flex-1">{n.label}</span>
                    <Icon.Chev className="w-3.5 h-3.5 -rotate-90 text-text-quat"/>
                  </button>
                );
              })}
            </>
          ) : null}
        </div>
        <div className="flex items-center justify-between px-4 h-9 border-t border-white/8 bg-white/[0.02] text-[10.5px] text-text-tertiary">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><KeyCap>↵</KeyCap> open</span>
            <span className="flex items-center gap-1"><KeyCap>↑</KeyCap><KeyCap>↓</KeyCap> navigate</span>
          </div>
          <div className="flex items-center gap-1"><Icon.Keyboard className="w-3.5 h-3.5"/> Cmd palette</div>
        </div>
      </div>
    </div>
  );
}

function BottomStatus({ route }) {
  const labels = {
    workbench: 'Workbench',
    catalog: 'Indicator Catalog',
    saved: 'Saved Views',
    comparisons: 'Comparisons',
    admin: 'Ingestion Admin',
  };
  return (
    <div className="fixed bottom-0 left-0 right-0 h-6 bg-ink-950/85 backdrop-blur border-t border-white/5 z-20">
      <div className="max-w-[1500px] mx-auto h-full px-8 flex items-center justify-between text-[10.5px] text-text-tertiary font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#7FC29B]"/> connected</span>
          <span>{labels[route]}</span>
          <span>workbook rev 2026.03.17</span>
        </div>
        <div className="flex items-center gap-4">
          <span>1,384 indicators · 94,726 observations</span>
          <span>GYT 14:22</span>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
