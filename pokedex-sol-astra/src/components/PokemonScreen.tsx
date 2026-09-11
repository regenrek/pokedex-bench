import type { PokemonRecord } from '../api'
import { padId } from '../api'

interface Props {
  pokemon: PokemonRecord | null
  loading: boolean
  view: 'data' | 'stats'
}

export function PokemonScreen({ pokemon, loading, view }: Props) {
  if (!pokemon) {
    return (
      <div className="screen-placeholder" role="status">
        <span className="scanline-loader" />
        <strong>BOOTING FIELD INDEX</strong>
        <small>Connecting to PokéAPI…</small>
      </div>
    )
  }

  return (
    <div className={`pokemon-screen ${loading ? 'is-updating' : ''}`} aria-live="polite">
      <header className="screen-heading">
        <span>No. {padId(pokemon.id)}</span>
        <strong>{view === 'data' ? 'SPECIES DATA' : 'BASE STATS'}</strong>
      </header>

      <div className="screen-core">
        <div className="sprite-stage">
          {pokemon.sprite ? <img src={pokemon.sprite} alt={`${pokemon.name} front sprite`} /> : <span>NO IMAGE</span>}
          <b>{pokemon.name}</b>
        </div>
        {view === 'stats' ? (
          <div className="stat-list detailed-stats">
            {pokemon.stats.map((stat) => (
              <div className="stat-row" key={stat.key}>
                <span>{stat.label}</span>
                <div className="stat-track"><i style={{ width: `${Math.min(100, (stat.value / 160) * 100)}%` }} /></div>
                <em>{stat.value}</em>
              </div>
            ))}
          </div>
        ) : (
          <div className="stat-list">
            {pokemon.stats.slice(0, 5).map((stat) => (
              <div className="stat-row" key={stat.key}>
                <span>{stat.label}</span>
                <div className="stat-track"><i style={{ width: `${Math.min(100, (stat.value / 160) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="screen-facts">
        <div><span>TYPE</span><b>{pokemon.types.join(' / ')}</b></div>
        <div><span>HEIGHT</span><b>{pokemon.heightM.toFixed(1)} m</b></div>
        <div><span>WEIGHT</span><b>{pokemon.weightKg.toFixed(1)} kg</b></div>
      </footer>
    </div>
  )
}
