/** Blue 3×4 keypad: direct National Pokédex number entry. */
import type { JSX } from 'react';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export interface KeypadProps {
  onDigit: (digit: string) => void;
  onClear: () => void;
  onEnter: () => void;
  buffer: string;
  disabled?: boolean;
}

export function Keypad({
  onDigit,
  onClear,
  onEnter,
  buffer,
  disabled = false,
}: KeypadProps): JSX.Element {
  return (
    <div className="keypad" role="group" aria-label="Number keypad">
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          className="key"
          aria-label={`Key ${digit}`}
          disabled={disabled}
          onClick={() => onDigit(digit)}
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        className="key key--utility"
        aria-label="Clear number entry"
        disabled={disabled || buffer.length === 0}
        onClick={onClear}
      >
        CLR
      </button>
      <button
        type="button"
        className="key"
        aria-label="Key 0"
        disabled={disabled}
        onClick={() => onDigit('0')}
      >
        0
      </button>
      <button
        type="button"
        className="key key--utility"
        aria-label="Enter number and jump"
        disabled={disabled || buffer.length === 0}
        onClick={onEnter}
      >
        GO
      </button>
    </div>
  );
}
