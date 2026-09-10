import type { PokedexView, PokemonDetail } from '../api/types'
import type { LoadStatus } from '../hooks/usePokedex'
import type { StatusDescriptor } from '../lib/status'
import { Dpad } from './Dpad'
import { Lamp, Lens, Screw, Vents } from './Hardware'
import { MainScreen } from './MainScreen'

export interface LeftHalfProps {
  detail: PokemonDetail | null
  detailStatus: LoadStatus
  detailError: string | null
  selectedId: number
  status: StatusDescriptor
  view: PokedexView
  onRetry: () => void
  onStep: (delta: number) => void
  onView: (view: PokedexView) => void
  canPrev: boolean
  canNext: boolean
}

/** Left shell: lens deck, cream bezel around the main LCD, physical control deck. */
export function LeftHalf({
  detail,
  detailStatus,
  detailError,
  selectedId,
  status,
  view,
  onRetry,
  onStep,
  onView,
  canPrev,
  canNext,
}: LeftHalfProps) {
  const busy = detailStatus === 'loading'

  return (
    <section className="half half--left" aria-label="Pokédex left half">
      <div className="half__gloss" aria-hidden="true" />
      <div className="half__mold" aria-hidden="true" />
      <Screw className="screw--tl" />
      <Screw className="screw--tr" />
      <Screw className="screw--bl" />
      <Screw className="screw--br" />

      <header className="deck deck--top deck--sensor">
        <span className="deck__sensor-plate" aria-hidden="true" />
        <Lens />
        <div className="deck__id">
          <div className="lamps">
            <Lamp tone="power" label="POWER" />
            <Lamp tone="scan" label="SCAN" lit={busy} />
            <Lamp tone="link" label="LINK" lit={status.tone !== 'fault'} />
          </div>
          <p className="engrave">
            KANTO POKéDEX
            <span className="engrave__sub">MODEL KX-151</span>
          </p>
        </div>
      </header>

      <div className="bezel bezel--main">
        <Screw className="screw--bezel-tl" />
        <Screw className="screw--bezel-tr" />
        <Screw className="screw--bezel-bl" />
        <Screw className="screw--bezel-br" />
        <MainScreen
          detail={detail}
          detailStatus={detailStatus}
          detailError={detailError}
          selectedId={selectedId}
          status={status}
          onRetry={onRetry}
        />
      </div>

      <div className="deck deck--controls">
        <Dpad onStep={onStep} canPrev={canPrev} canNext={canNext} />

        <div className="controls">
          <div className="ctl">
            <span className="ctl__label" aria-hidden="true">
              PREV
            </span>
            <button
              type="button"
              className="pill"
              aria-label="Previous entry"
              disabled={!canPrev}
              onClick={() => onStep(-1)}
            >
              <span className="pill__cap">A</span>
            </button>
          </div>
          <div className="ctl">
            <span className="ctl__label" aria-hidden="true">
              NEXT
            </span>
            <button
              type="button"
              className="pill"
              aria-label="Next entry"
              disabled={!canNext}
              onClick={() => onStep(1)}
            >
              <span className="pill__cap">B</span>
            </button>
          </div>
          <div className="ctl">
            <button
              type="button"
              className={`amber${view === 'data' ? ' is-active' : ''}`}
              aria-label="Show data view"
              aria-pressed={view === 'data'}
              onClick={() => onView('data')}
            >
              DATA
            </button>
          </div>
          <div className="ctl">
            <button
              type="button"
              className={`amber${view === 'index' ? ' is-active' : ''}`}
              aria-label="Show index view"
              aria-pressed={view === 'index'}
              onClick={() => onView('index')}
            >
              INDEX
            </button>
          </div>
        </div>
      </div>

      <footer className="deck deck--foot">
        <Vents />
        <p className="engrave engrave--tiny">EXPLORE · RECORD · DISCOVER</p>
      </footer>
    </section>
  )
}
