import { useState } from 'react';
import { cleanFlavor, displayName, formatId, type Entry, type IndexItem } from './api';
export type View = 'data' | 'stats' | 'index';
export function Screw({ className = '' }: { className?: string }) { return <span aria-hidden="true" className={`screw ${className}`} />; }
export function Stats({ entry }: { entry: Entry }) {
  const labels: Record<string, string> = { hp: 'HP', attack: 'ATK', defense: 'DEF', 'special-attack': 'Sp. ATK', 'special-defense': 'Sp. DEF', speed: 'SPD' };
  return <div className="stats">{entry.pokemon.stats.map(stat => <div className="stat" key={stat.stat.name}><span>{labels[stat.stat.name] ?? stat.stat.name}</span><span className="stat-track"><span style={{ width: `${Math.min(stat.base_stat / 255 * 100, 100)}%` }} /></span><strong>{stat.base_stat}</strong></div>)}</div>;
}
export function Sprite({ entry }: { entry: Entry }) {
  const [failed, setFailed] = useState(false);
  const source = entry.pokemon.sprites.front_default;
  return <div className="sprite-stage"><div className="sprite-grid" aria-hidden="true" />{source && !failed ? <img key={source} src={source} alt={displayName(entry.pokemon.name)} onError={() => setFailed(true)} /> : <span className="sprite-missing">SPRITE<br/>UNAVAILABLE</span>}<span className="sprite-baseline" aria-hidden="true" /></div>;
}
export function MainDisplay({ entry, busy }: { entry: Entry | null; busy: boolean }) {
  return <div className={`lcd main-lcd ${busy ? 'is-scanning' : ''}`} aria-busy={busy}>
    <div className="screen-heading"><strong>No. {entry ? formatId(entry.pokemon.id) : '001'}</strong><span>SPECIES DATA <span className="tiny-square" /></span></div>
    {entry ? <><div className="pokemon-title"><h1>{displayName(entry.pokemon.name)}</h1><span>{entry.species.genera.find(g => g.language.name === 'en')?.genus ?? 'Pokémon'}</span></div>
    <div className="specimen"><Sprite key={entry.pokemon.id} entry={entry}/><div className="specimen-info"><span className="field-label">TYPE</span><div className="types">{entry.pokemon.types.map(t => <span key={t.type.name}>{t.type.name}</span>)}</div><dl><div><dt>HEIGHT</dt><dd>{(entry.pokemon.height / 10).toFixed(1)} <small>m</small></dd></div><div><dt>WEIGHT</dt><dd>{(entry.pokemon.weight / 10).toFixed(1)} <small>kg</small></dd></div></dl></div></div>
    <div className="ability-line"><span>ABILITIES</span><strong>{entry.pokemon.abilities?.map(a => displayName(a.ability.name) + (a.is_hidden ? ' (hidden)' : '')).join(' / ') ?? 'Unknown'}</strong></div>
    <div className="screen-bottom"><span>◉ KANTO REGION</span><span>{formatId(entry.pokemon.id)} / 151</span></div></> : <div className="boot"><span className="boot-icon" aria-hidden="true">◎</span><strong>{busy ? 'INITIALIZING POKÉDEX' : 'AWAITING CONNECTION'}</strong><span>{busy ? 'Retrieving species data…' : 'Use RETRY to reconnect.'}</span></div>}
  </div>;
}
export function InfoDisplay({ entry, view, index, indexError, onSelect, onRetryIndex }: { entry: Entry | null; view: View; index: IndexItem[]; indexError: boolean; onSelect: (id: number) => void; onRetryIndex: () => void }) {
  return <div className="lcd info-lcd"><div className="screen-heading"><strong>{view === 'data' ? 'FIELD NOTES' : view === 'stats' ? 'BASE STATS' : 'KANTO INDEX'}</strong><span className="signal" aria-label="Kanto database">▂▄▆█</span></div>
    {view === 'index' ? <div className="index-list" aria-label="Kanto Pokémon index">{index.length ? index.map((item, i) => <button type="button" key={item.name} aria-current={entry?.pokemon.id === i + 1 ? 'true' : undefined} onClick={() => onSelect(i + 1)}><span>{formatId(i + 1)}</span>{displayName(item.name)}<span>{entry?.pokemon.id === i + 1 ? '◀' : ''}</span></button>) : <div className="index-empty">{indexError ? <><p>Index unavailable.</p><button onClick={onRetryIndex}>Retry index</button></> : 'Loading index…'}</div>}</div> : entry ? view === 'stats' ? <><Stats entry={entry}/><div className="stat-total">BASE TOTAL <strong>{entry.pokemon.stats.reduce((total, stat) => total + stat.base_stat, 0)}</strong></div></> : <><span className="note-label">POKÉDEX ENTRY / {formatId(entry.pokemon.id)}</span><p className="flavor">{cleanFlavor(entry.species.flavor_text_entries.find(f => f.language.name === 'en')?.flavor_text ?? 'No English field notes available.')}</p><div className="habitat"><span>HABITAT</span><strong>{displayName(entry.species.habitat?.name ?? 'Unknown')}</strong></div><div className="note-footer"><span>PROF. OAK'S DATABASE</span><span>● ● ○</span></div></> : <p className="waiting">Waiting for species data…</p>}
  </div>;
}
