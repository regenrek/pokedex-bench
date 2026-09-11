import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getKantoIndex, getPokemon, resolvePokemonQuery, type PokemonListItem, type PokemonRecord } from './api'
import { InfoScreen } from './components/InfoScreen'
import { PokemonScreen } from './components/PokemonScreen'
import { usePokedexTools } from './usePokedexTools'

const clampId = (id: number) => Math.max(1, Math.min(151, id))

export function App() {
  const [currentId, setCurrentId] = useState(1)
  const [pokemon, setPokemon] = useState<PokemonRecord | null>(null)
  const [index, setIndex] = useState<PokemonListItem[]>([])
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'data' | 'stats'>('data')
  const [indexOpen, setIndexOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchMessage, setSearchMessage] = useState('SYSTEM READY')
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    getKantoIndex().then(setIndex).catch(() => setSearchMessage('INDEX LINK OFFLINE'))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setSearchMessage(pokemon ? 'SCANNING…' : 'INITIALIZING…')
    getPokemon(currentId)
      .then((record) => {
        if (!active) return
        setPokemon(record)
        setSearchMessage(`LOCKED: #${String(record.id).padStart(3, '0')} ${record.name.toUpperCase()}`)
      })
      .catch((caught: unknown) => {
        if (!active) return
        const message = caught instanceof Error ? caught.message : 'Unknown data link error'
        setError(message)
        setSearchMessage('DATA LINK ERROR — RETRY')
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
    // pokemon is deliberately omitted so the previous record remains visible while navigating.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, retryToken])

  const navigate = useCallback((delta: number) => {
    setCurrentId((id) => clampId(id + delta))
    setIndexOpen(false)
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT') return
      if (event.key === 'ArrowLeft') navigate(-1)
      if (event.key === 'ArrowRight') navigate(1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [navigate])

  const selectPokemon = useCallback((id: number) => {
    setCurrentId(clampId(id))
    setIndexOpen(false)
    setQuery('')
  }, [])

  usePokedexTools(pokemon, index, selectPokemon)

  const submitSearch = async (event: FormEvent) => {
    event.preventDefault()
    let loadedIndex = index
    if (!loadedIndex.length) {
      try {
        loadedIndex = await getKantoIndex()
        setIndex(loadedIndex)
      } catch {
        setSearchMessage('SEARCH UNAVAILABLE — CHECK LINK')
        return
      }
    }
    const result = resolvePokemonQuery(query, loadedIndex)
    if (result === null) {
      setSearchMessage('NO MATCH — USE NAME OR 001–151')
      return
    }
    selectPokemon(result)
  }

  const retry = () => {
    setError('')
    setRetryToken((token) => token + 1)
  }

  const addDigit = (digit: number) => {
    setQuery((value) => `${value}${digit}`.slice(-3))
    document.getElementById('pokemon-search')?.focus()
  }

  return (
    <main className="app-shell">
      <h1 className="sr-only">Kanto Field Index Pokédex</h1>
      <section className="pokedex" aria-label="Interactive Kanto Pokédex">
        <div className="device-half left-half">
          <header className="device-crown">
            <div className="lens" aria-label="Power lens active"><i /></div>
            <div className="indicator-cluster" aria-hidden="true">
              <span className="lamp red on" /><span>POWER</span>
              <span className={`lamp amber ${loading ? 'on blink' : ''}`} /><span>SCAN</span>
              <span className={`lamp green ${pokemon && !error ? 'on' : ''}`} /><span>LINK</span>
            </div>
            <div className="device-brand"><strong>KANTO INDEX</strong><span>MODEL KX-151</span></div>
          </header>

          <div className="main-bezel">
            <i className="screw screw-tl" /><i className="screw screw-tr" /><i className="screw screw-bl" /><i className="screw screw-br" />
            <div className="lcd main-lcd">
              <PokemonScreen pokemon={pokemon} loading={loading} view={view} />
            </div>
          </div>

          <div className="lower-controls">
            <div className="dpad" aria-label="Pokémon navigation controls">
              <button type="button" className="dpad-up" aria-label="Jump back ten Pokémon" onClick={() => navigate(-10)}>▲</button>
              <button type="button" className="dpad-left" aria-label="Previous Pokémon" disabled={currentId === 1} onClick={() => navigate(-1)}>◀</button>
              <span className="dpad-center" />
              <button type="button" className="dpad-right" aria-label="Next Pokémon" disabled={currentId === 151} onClick={() => navigate(1)}>▶</button>
              <button type="button" className="dpad-down" aria-label="Jump forward ten Pokémon" onClick={() => navigate(10)}>▼</button>
            </div>
            <button
              type="button"
              className={`index-button ${indexOpen ? 'active' : ''}`}
              aria-label="Open Pokémon index"
              onClick={() => setIndexOpen((open) => !open)}
            ><span>151</span></button>
            <div className="ab-controls">
              <div><span>A</span><button type="button" onClick={() => navigate(-1)} disabled={currentId === 1} aria-label="Previous Pokémon" /></div>
              <div><span>B</span><button type="button" onClick={() => navigate(1)} disabled={currentId === 151} aria-label="Next Pokémon" /></div>
            </div>
            <div className="speaker" aria-hidden="true"><i /><i /><i /></div>
            <div className="mode-controls">
              <button type="button" className={view === 'data' ? 'active' : ''} onClick={() => setView('data')}>DATA</button>
              <button type="button" className={view === 'stats' ? 'active' : ''} onClick={() => setView('stats')}>STATS</button>
            </div>
          </div>
          <div className="left-footer">EXPLORE <i /> RECORD <i /> DISCOVER</div>
        </div>

        <div className="hinge" aria-hidden="true"><i /><i /><i /><i /></div>

        <div className="device-half right-half">
          <div className="right-crown"><span>A WIDER WORLD<br />A BRIGHTER TOMORROW</span></div>
          <div className="info-bezel">
            <div className="lcd info-lcd">
              <InfoScreen
                pokemon={pokemon}
                query={query}
                onQueryChange={setQuery}
                onSubmit={submitSearch}
                status={error ? `${searchMessage}: ${error}` : searchMessage}
                indexOpen={indexOpen}
                index={index}
                currentId={currentId}
                onSelect={selectPokemon}
              />
            </div>
          </div>

          <div className="right-controls">
            <div className="keypad" aria-label="Numeric search keypad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button type="button" key={digit} onClick={() => addDigit(digit)} aria-label={`Enter ${digit}`}>{digit}</button>
              ))}
            </div>
            <button type="button" className="confirm-button" onClick={(event) => submitSearch(event as unknown as FormEvent)} aria-label="Confirm search">
              <span />
            </button>
            <span className="confirm-label">CONFIRM</span>
          </div>

          <div className="vent-and-copy" aria-hidden="true">
            <div className="vent-grid">{Array.from({ length: 20 }).map((_, i) => <i key={i} />)}</div>
            <span>SMALL<br />CREATURES<br />BIG<br />POSSIBILITIES</span>
          </div>

          <footer className="cartridge-bay">
            <i className="screw screw-tl" /><i className="screw screw-tr" />
            <span>DATA CARTRIDGE ▲</span><b>PUSH ▶</b>
          </footer>
          {error && <button type="button" className="retry-button" onClick={retry}>RETRY DATA LINK</button>}
        </div>
      </section>
      <p className="keyboard-hint">USE ← → KEYS TO BROWSE · DATA SOURCE: POKÉAPI</p>
    </main>
  )
}
