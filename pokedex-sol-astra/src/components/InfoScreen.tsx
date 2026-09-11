import type { FormEvent } from 'react'
import type { PokemonListItem, PokemonRecord } from '../api'
import { padId } from '../api'

interface Props {
  pokemon: PokemonRecord | null
  query: string
  onQueryChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  status: string
  indexOpen: boolean
  index: PokemonListItem[]
  currentId: number
  onSelect: (id: number) => void
}

export function InfoScreen(props: Props) {
  const { pokemon, query, onQueryChange, onSubmit, status, indexOpen, index, currentId, onSelect } = props
  return (
    <div className="info-screen">
      <form className="search-panel" onSubmit={onSubmit}>
        <label htmlFor="pokemon-search">FIND SPECIMEN</label>
        <div>
          <input
            id="pokemon-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="NAME / NO."
            autoComplete="off"
          />
          <button type="submit">SCAN</button>
        </div>
      </form>
      <div className="info-status" role="status">{status}</div>

      {indexOpen ? (
        <div className="index-list" aria-label="Kanto Pokémon index">
          {index.map((item) => (
            <button
              type="button"
              className={item.id === currentId ? 'selected' : ''}
              key={item.id}
              onClick={() => onSelect(item.id)}
            >
              <span>{padId(item.id)}</span> {item.name}
            </button>
          ))}
        </div>
      ) : pokemon ? (
        <div className="field-report">
          <header><span>FIELD REPORT</span><b>{pokemon.genus}</b></header>
          <p>{pokemon.description}</p>
          <dl>
            <div><dt>HABITAT</dt><dd>{pokemon.habitat}</dd></div>
            <div><dt>ABILITY</dt><dd>{pokemon.abilities.join(' / ')}</dd></div>
          </dl>
        </div>
      ) : (
        <div className="field-report empty"><span>AWAITING DATA LINK</span></div>
      )}
    </div>
  )
}
