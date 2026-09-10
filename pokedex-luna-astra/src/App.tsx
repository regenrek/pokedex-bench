import { useCallback, useEffect, useRef, useState } from 'react';
import { displayName, formatId, loadEntry, loadIndex, normalizeQuery, type Entry, type IndexItem } from './api';
import { InfoDisplay, MainDisplay, Screw, type View } from './components';

export default function App() {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('data');
  const [index, setIndex] = useState<IndexItem[]>([]);
  const [indexError, setIndexError] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const currentId = useRef(1);
  const lastQuery = useRef('1');
  const searchRef = useRef<HTMLInputElement>(null);
  const select = useCallback(async (value: string) => {
    let normalized: string;
    try { normalized = normalizeQuery(value); } catch (failure) { setError((failure as Error).message); return; }
    requestRef.current?.abort();
    const controller = new AbortController(); requestRef.current = controller;
    lastQuery.current = normalized;
    if (/^\d+$/.test(normalized)) currentId.current = Number(normalized);
    setBusy(true); setError('');
    const timeout = window.setTimeout(() => controller.abort('timeout'), 15000);
    try {
      const result = await loadEntry(normalized, controller.signal);
      if (controller.signal.aborted) return;
      setEntry(result.entry); currentId.current = result.entry.pokemon.id; setCached(result.cached);
    } catch (failure) {
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') return;
      setError(controller.signal.reason === 'timeout' ? 'Connection timed out. Please try again.' : failure instanceof TypeError ? 'Connection lost. Check your connection and retry.' : (failure as Error).message);
    } finally { window.clearTimeout(timeout); if (requestRef.current === controller) setBusy(false); }
  }, []);
  const refreshIndex = useCallback(() => { setIndexError(false); void loadIndex().then(setIndex).catch(() => setIndexError(true)); }, []);
  useEffect(() => { void select('1'); refreshIndex(); return () => requestRef.current?.abort(); }, [select, refreshIndex]);
  const navigate = useCallback((direction: number) => { const id = Math.max(1, Math.min(151, currentId.current + direction)); if (id !== currentId.current) void select(String(id)); }, [select]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.closest('input, textarea, select, [contenteditable="true"]') || event.altKey || event.ctrlKey || event.metaKey)) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); navigate(event.key === 'ArrowLeft' ? -1 : 1); }
      if (event.key === '/') { event.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
  function submit() { void select(query); }
  function cancel() { setQuery(''); setError(''); setView('data'); }
  const id = entry?.pokemon.id ?? 1;
  const status = busy ? 'SCANNING…' : error ? 'CHECK CONNECTION / INPUT' : cached ? 'LOCAL MEMORY · READY' : 'DATABASE LINKED · READY';
  return <main className="workbench">
    <header className="page-header"><a className="wordmark" href="./" aria-label="Pokédex home"><span className="pokeball" aria-hidden="true"/>POKÉDEX<span className="edition">FIELD EDITION</span></a><span className="region-label">KANTO REGION <span> / </span> GEN. 01</span></header>
    <div className="device" aria-label="Kanto Pokédex device">
      <section className="left-shell" aria-label="Pokémon scanner">
        <div className="sensor-deck"><div className={`lens ${busy ? 'scanning' : ''}`} aria-label={busy ? 'Scanner active' : 'Scanner ready'}><span/></div><div className="lamp-group"><div><i className="lamp red"/><span>POWER</span></div><div><i className={`lamp yellow ${busy ? 'active' : ''}`}/><span>SCAN</span></div><div><i className={`lamp green ${!busy && !error ? 'active' : ''}`}/><span>LINK</span></div></div><div className="model-label">POKÉDEX<small>MODEL K-01</small></div></div>
        <div className="main-bezel"><Screw className="top-left"/><Screw className="top-right"/><Screw className="bottom-left"/><Screw className="bottom-right"/><div className="display-well"><MainDisplay entry={entry} busy={busy}/></div><div className="bezel-footer"><span className="bezel-led"/><span>POKÉMON / PORTABLE ENCYCLOPEDIA</span><span className="bezel-slits">≡</span></div></div>
        <div className="left-controls"><div className="dpad" aria-label="Directional controls"><button className="dpad-up" aria-label="Show base stats" onClick={() => setView('stats')}>▲</button><button className="dpad-left" aria-label="Previous Pokémon" disabled={id === 1 && !busy} onClick={() => navigate(-1)}>◀</button><span className="dpad-center"/><button className="dpad-right" aria-label="Next Pokémon" disabled={id === 151 && !busy} onClick={() => navigate(1)}>▶</button><button className="dpad-down" aria-label="Show species data" onClick={() => setView('data')}>▼</button></div><div className="speaker" aria-hidden="true"><i/><i/><i/></div><div className="action-controls"><div className="labeled-control"><span>A</span><button aria-label="Next entry (A)" disabled={id === 151 && !busy} className="pill black" onClick={() => navigate(1)}/></div><div className="labeled-control"><span>B</span><button aria-label="Previous entry (B)" disabled={id === 1 && !busy} className="pill black" onClick={() => navigate(-1)}/></div><div className="labeled-control"><button className="pill yellow-button" aria-label="Toggle data and stats" onClick={() => setView(v => v === 'data' ? 'stats' : 'data')}/><span>DATA</span></div><div className="labeled-control"><button className="pill yellow-button" aria-label="Cancel search and return to data" onClick={cancel}/><span>CANCEL</span></div></div></div>
        <div className="casing-footer"><Screw/><span>EXPLORE <b>•</b> RECORD <b>•</b> DISCOVER</span></div>
      </section>
      <div className="hinge" aria-hidden="true"><span/><span/><span/><span/><span/></div>
      <section className="right-shell" aria-label="Pokédex information and search"><Screw className="case-screw"/><div className="right-inner"><div className="motto"><span>A WORLD OF POKÉMON.<br/>RIGHT IN YOUR HANDS.</span><i/></div><div className="right-screen-row"><div className="info-surround"><InfoDisplay entry={entry} view={view} index={index} indexError={indexError} onRetryIndex={refreshIndex} onSelect={id => { void select(String(id)); setView('data'); }}/></div><div className="side-details" aria-hidden="true"><div className="vent-grid">{Array.from({length: 20}, (_, i) => <i key={i}/>)}</div><span>SMALL<br/>CREATURES.<br/>BIG<br/>DISCOVERIES.</span></div></div>
        <div className="control-row"><div className="keypad" aria-label="Display and navigation controls"><button className={view === 'data' ? 'selected' : ''} aria-pressed={view === 'data'} onClick={() => setView('data')}>DATA</button><button className={view === 'stats' ? 'selected' : ''} aria-pressed={view === 'stats'} onClick={() => setView('stats')}>STATS</button><button className={view === 'index' ? 'selected' : ''} aria-pressed={view === 'index'} onClick={() => setView('index')}>INDEX</button><button aria-label="Go to first Pokémon" disabled={id === 1 && !busy} onClick={() => void select('1')}>001</button><button aria-label="Focus Pokémon search" onClick={() => searchRef.current?.focus()}>FIND</button><button aria-label="Go to last Pokémon" disabled={id === 151 && !busy} onClick={() => void select('151')}>151</button><button aria-label="Previous species" disabled={id === 1 && !busy} onClick={() => navigate(-1)}>◀ PREV</button><button aria-label="Reload current Pokémon" onClick={() => void select(String(id))}>↻</button><button aria-label="Next species" disabled={id === 151 && !busy} onClick={() => navigate(1)}>NEXT ▶</button></div><div className="confirm-control"><button className="round-button" aria-label="Confirm Pokémon search" onClick={() => query.trim() ? submit() : searchRef.current?.focus()}/><span>CONFIRM</span></div></div>
        <form className="search-panel" onSubmit={event => { event.preventDefault(); submit(); }}><label htmlFor="pokemon-search">SEARCH DATABASE <span>NAME / NUMBER</span></label><div className="search-field"><span aria-hidden="true">⌕</span><input id="pokemon-search" ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. Pikachu or 025" autoComplete="off" spellCheck={false} aria-describedby={error ? 'search-error' : undefined}/><button type="submit" aria-label="Search Pokémon">↵</button></div></form>
        <div className={`device-status ${error ? 'error-status' : ''}`} aria-live="polite" aria-atomic="true">{error ? <><span id="search-error">{error}</span><button onClick={() => void select(lastQuery.current)}>RETRY</button></> : <><span><i/>{status}</span><span>{formatId(id)} / 151</span></>}</div>
        <div className="cartridge"><Screw/><span>KANTO DATA CARTRIDGE <b>▲</b></span><span className="cartridge-mark">I</span></div></div>
      </section>
    </div>
    <footer className="page-footer"><span><span className="keyboard-key">←</span> <span className="keyboard-key">→</span> browse <span className="footer-divider">/</span> <span className="keyboard-key">/</span> search</span><span>151 discoveries. One region.<span className="powered">Data by <a href="https://pokeapi.co" target="_blank" rel="noreferrer">PokéAPI</a></span></span></footer>
    <div className="sr-only" aria-live="polite">{!busy && entry ? `Selected ${formatId(id)} ${displayName(entry.pokemon.name)}` : ''}</div>
  </main>;
}
