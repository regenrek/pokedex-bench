import type { PokedexController } from '../hooks/usePokedex'

type Dir = 'up' | 'down' | 'left' | 'right'

const LABELS: Record<Dir, string> = {
  up: 'Up ten entries',
  down: 'Down ten entries',
  left: 'Previous entry',
  right: 'Next entry',
}

export interface DpadProps {
  onStep: PokedexController['step']
  canPrev: boolean
  canNext: boolean
}

/** Physical D-pad: left/right step ±1, up/down step ±10 (clamped to 001–151). */
export function Dpad({ onStep, canPrev, canNext }: DpadProps) {
  const disabled: Record<Dir, boolean> = {
    up: !canNext,
    down: !canPrev,
    left: !canPrev,
    right: !canNext,
  }
  const delta: Record<Dir, number> = { up: 10, down: -10, left: -1, right: 1 }

  return (
    <div className="dpad">
      <div className="dpad__base" aria-hidden="true" />
      <div className="dpad__hub" aria-hidden="true" />
      {(Object.keys(LABELS) as Dir[]).map((dir) => (
        <button
          key={dir}
          type="button"
          className={`dpad__key dpad__key--${dir}`}
          aria-label={LABELS[dir]}
          disabled={disabled[dir]}
          onClick={() => onStep(delta[dir])}
        >
          <span className="dpad__chevron" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
