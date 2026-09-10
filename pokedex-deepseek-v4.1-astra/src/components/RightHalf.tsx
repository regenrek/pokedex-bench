import type { IndexEntry, PokedexView, PokemonDetail } from '../api/types'
import type { LoadStatus } from '../hooks/usePokedex'
import { InfoScreen } from './InfoScreen'
import { ConfirmDial, Keypad } from './Keypad'
import { Screw, SpeakerGrille } from './Hardware'
import { SearchBar } from './SearchBar'

export interface RightHalfProps {
  view: PokedexView
  onView: (view: PokedexView) => void
  detail: PokemonDetail | null
  detailStatus: LoadStatus
  detailError: string | null
  entries: IndexEntry[]
  listStatus: LoadStatus
  listError: string | null
  selectedId: number
  onSelect: (id: number) => void
  onRetryList: () => void
  onRetryDetail: () => void
  onStep: (delta: number) => void
  canPrev: boolean
  canNext: boolean

  query: string
  onQuery: (value: string) => void
  onSubmitSearch: () => void
  onClearSearch: () => void
  searchError: string | null
  searchInputRef: React.RefObject<HTMLInputElement | null>

  confirmCaption: string
  confirmLabel: string
  onConfirm: () => void
  cacheLabel: string
  entryCount: number
}

/** Right shell: identity plaque, information LCD, search slot, keypad, cartridge bay. */
export function RightHalf({
  view,
  onView,
  detail,
  detailStatus,
  detailError,
  entries,
  listStatus,
  listError,
  selectedId,
  onSelect,
  onRetryList,
  onRetryDetail,
  onStep,
  canPrev,
  canNext,
  query,
  onQuery,
  onSubmitSearch,
  onClearSearch,
  searchError,
  searchInputRef,
  confirmCaption,
  confirmLabel,
  onConfirm,
  cacheLabel,
  entryCount,
}: RightHalfProps) {
  return (
    <section className="half half--right" aria-label="Pokédex right half">
      <div className="half__gloss" aria-hidden="true" />
      <div className="half__mold" aria-hidden="true" />
      <Screw className="screw--tl" />
      <Screw className="screw--tr" />
      <Screw className="screw--bl" />
      <Screw className="screw--br" />

      <header className="deck deck--plaque">
        <div className="plaque">
          <p className="plaque__line">KANTO REGIONAL INDEX</p>
          <p className="plaque__line plaque__line--dim">GEN I · MODEL KX-151</p>
        </div>
        <div className="speaker">
          <SpeakerGrille />
          <p className="speaker__caption">
            CACHE
            <span className="speaker__value">{cacheLabel}</span>
          </p>
        </div>
      </header>

      <div className="bezel bezel--info">
        <Screw className="screw--bezel-tl" />
        <Screw className="screw--bezel-tr" />
        <Screw className="screw--bezel-bl" />
        <Screw className="screw--bezel-br" />
        <InfoScreen
          view={view}
          onView={onView}
          detail={detail}
          detailStatus={detailStatus}
          detailError={detailError}
          entries={entries}
          listStatus={listStatus}
          listError={listError}
          selectedId={selectedId}
          onSelect={onSelect}
          onRetryList={onRetryList}
          searchError={searchError}
          onRetryDetail={onRetryDetail}
        />
      </div>

      <SearchBar
        ref={searchInputRef}
        query={query}
        onChange={onQuery}
        onSubmit={onSubmitSearch}
        onClear={onClearSearch}
        hasError={searchError !== null}
        listReady={listStatus === 'ready' && entryCount > 0}
      />

      <div className="deck deck--keypad">
        <Keypad
          view={view}
          onView={onView}
          onStep={onStep}
          onJump={onSelect}
          onFocusSearch={() => searchInputRef.current?.focus()}
          canPrev={canPrev}
          canNext={canNext}
        />
        <ConfirmDial caption={confirmCaption} label={confirmLabel} onPress={onConfirm} />
      </div>

      <div className="deck deck--bay">
        <button
          type="button"
          className="cartridge"
          aria-label="Reset the Pokédex to entry 1, Bulbasaur"
          onClick={() => {
            onView('data')
            onSelect(1)
          }}
        >
          <span className="cartridge__slot" aria-hidden="true" />
          <span className="cartridge__label">DATA CARTRIDGE</span>
          <span className="cartridge__push">
            PUSH <span aria-hidden="true">▸</span> RESET
          </span>
        </button>
      </div>
    </section>
  )
}
