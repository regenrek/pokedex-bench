export interface KeypadProps {
  onDigit(digit: string): void;
  onClear(): void;
  onConfirm(): void;
  /** Live preview of the number being typed, shown on the main LCD. */
  preview: string;
  disabled?: boolean;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Blue numeric keypad — types a National Dex number directly. */
export function Keypad({ onDigit, onClear, onConfirm, preview, disabled }: KeypadProps) {
  return (
    <div className="keypad">
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          className="key"
          onClick={() => onDigit(digit)}
          disabled={disabled}
          aria-label={`Keypad ${digit}`}
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        className="key key--utility"
        onClick={onClear}
        disabled={disabled}
        aria-label="Clear typed entry number"
      >
        CLR
      </button>
      <button
        type="button"
        className="key"
        onClick={() => onDigit('0')}
        disabled={disabled}
        aria-label="Keypad 0"
      >
        0
      </button>
      <button
        type="button"
        className="key key--utility"
        onClick={onConfirm}
        disabled={disabled}
        aria-label="Open typed entry number"
        title={preview || 'Type a number, then press OK'}
      >
        OK
      </button>
    </div>
  );
}
