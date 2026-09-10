/** Directional pad. Each arm is its own semantic button. */
import type { JSX } from 'react';

export type DPadDirection = 'up' | 'down' | 'left' | 'right';

const LABELS: Record<DPadDirection, string> = {
  up: 'D-pad up — previous information section',
  down: 'D-pad down — next information section',
  left: 'D-pad left — previous Pokémon',
  right: 'D-pad right — next Pokémon',
};

export interface DPadProps {
  onPress: (direction: DPadDirection) => void;
  disabled?: Partial<Record<DPadDirection, boolean>>;
}

export function DPad({ onPress, disabled = {} }: DPadProps): JSX.Element {
  const directions: DPadDirection[] = ['up', 'left', 'right', 'down'];
  return (
    <div className="dpad">
      <div className="dpad__hub">
        {directions.map((direction) => (
          <button
            key={direction}
            type="button"
            className="dpad__key"
            data-dir={direction}
            aria-label={LABELS[direction]}
            disabled={disabled[direction] ?? false}
            onClick={() => onPress(direction)}
          >
            <span className="dpad__arrow" />
          </button>
        ))}
        <span className="dpad__center">
          <span className="dpad__pip" />
        </span>
      </div>
    </div>
  );
}
