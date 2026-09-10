export interface DPadProps {
  onUp(): void;
  onDown(): void;
  onLeft(): void;
  onRight(): void;
  upDisabled?: boolean;
  downDisabled?: boolean;
  leftDisabled?: boolean;
  rightDisabled?: boolean;
  upLabel?: string;
  downLabel?: string;
  leftLabel?: string;
  rightLabel?: string;
}

/** Four-way directional pad. Each arm is its own button for keyboard/AT users. */
export function DPad({
  onUp,
  onDown,
  onLeft,
  onRight,
  upDisabled,
  downDisabled,
  leftDisabled,
  rightDisabled,
  upLabel = 'Previous view',
  downLabel = 'Next view',
  leftLabel = 'Previous entry',
  rightLabel = 'Next entry',
}: DPadProps) {
  return (
    <div className="dpad">
      <div className="dpad__plate" aria-hidden="true" />
      <button
        type="button"
        className="dpad__btn dpad__btn--up"
        onClick={onUp}
        disabled={upDisabled}
        aria-label={upLabel}
      >
        ▲
      </button>
      <button
        type="button"
        className="dpad__btn dpad__btn--down"
        onClick={onDown}
        disabled={downDisabled}
        aria-label={downLabel}
      >
        ▼
      </button>
      <button
        type="button"
        className="dpad__btn dpad__btn--left"
        onClick={onLeft}
        disabled={leftDisabled}
        aria-label={leftLabel}
      >
        ◀
      </button>
      <button
        type="button"
        className="dpad__btn dpad__btn--right"
        onClick={onRight}
        disabled={rightDisabled}
        aria-label={rightLabel}
      >
        ▶
      </button>
    </div>
  );
}
