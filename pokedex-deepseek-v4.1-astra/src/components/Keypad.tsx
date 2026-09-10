import type { PokedexView } from '../api/types'

export interface KeypadProps {
  view: PokedexView
  onView: (view: PokedexView) => void
  onStep: (delta: number) => void
  onJump: (id: number) => void
  onFocusSearch: () => void
  canPrev: boolean
  canNext: boolean
}

interface KeyDef {
  id: string
  cap: string
  sub: string
  label: string
  active?: boolean
  disabled?: boolean
  run: () => void
}

/** Blue keypad: view select, ±1 / ±10 navigation and landmark jumps. */
export function Keypad({
  view,
  onView,
  onStep,
  onJump,
  onFocusSearch,
  canPrev,
  canNext,
}: KeypadProps) {
  const keys: KeyDef[] = [
    { id: 'data', cap: 'DATA', sub: 'VIEW', label: 'Show data view', active: view === 'data', run: () => onView('data') },
    { id: 'stats', cap: 'STATS', sub: 'VIEW', label: 'Show stats view', active: view === 'stats', run: () => onView('stats') },
    { id: 'index', cap: 'INDEX', sub: 'VIEW', label: 'Show index view', active: view === 'index', run: () => onView('index') },
    { id: 'srch', cap: 'SRCH', sub: 'FIELD', label: 'Focus the search field', run: onFocusSearch },

    { id: 'prev', cap: '−1', sub: 'PREV', label: 'Previous entry', disabled: !canPrev, run: () => onStep(-1) },
    { id: 'next', cap: '+1', sub: 'NEXT', label: 'Next entry', disabled: !canNext, run: () => onStep(1) },
    { id: 'back10', cap: '−10', sub: 'BACK', label: 'Back ten entries', disabled: !canPrev, run: () => onStep(-10) },
    { id: 'fwd10', cap: '+10', sub: 'FWD', label: 'Forward ten entries', disabled: !canNext, run: () => onStep(10) },

    { id: 'j1', cap: '001', sub: 'START', label: 'Jump to entry 1, Bulbasaur', run: () => onJump(1) },
    { id: 'j25', cap: '025', sub: 'JUMP', label: 'Jump to entry 25, Pikachu', run: () => onJump(25) },
    { id: 'j100', cap: '100', sub: 'JUMP', label: 'Jump to entry 100, Voltorb', run: () => onJump(100) },
    { id: 'j151', cap: '151', sub: 'END', label: 'Jump to entry 151, Mew', run: () => onJump(151) },
  ]

  return (
    <div className="keypad" role="group" aria-label="Keypad">
      {keys.map((key) => (
        <button
          key={key.id}
          type="button"
          className={`key${key.active ? ' is-active' : ''}`}
          aria-label={key.label}
          aria-pressed={key.active}
          disabled={key.disabled}
          onClick={key.run}
        >
          <span className="key__cap">{key.cap}</span>
          <span className="key__sub">{key.sub}</span>
        </button>
      ))}
    </div>
  )
}

export interface ConfirmDialProps {
  caption: string
  label: string
  onPress: () => void
}

/** Large round CONFIRM dial — submits search, retries a fault or re-scans the entry. */
export function ConfirmDial({ caption, label, onPress }: ConfirmDialProps) {
  return (
    <div className="dial">
      <button type="button" className="dial__button" aria-label={label} onClick={onPress}>
        <span className="dial__ring" aria-hidden="true" />
      </button>
      <p className="dial__caption">
        CONFIRM
        <span className="dial__caption-sub">{caption}</span>
      </p>
    </div>
  )
}
