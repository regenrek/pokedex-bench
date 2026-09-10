/** Decorative screw heads, positioned by modifier class. */
export function Screw({ position }: { position: string }) {
  return <span className={`screw screw--${position}`} aria-hidden="true" />;
}

/** Horizontal slots under the D-pad. */
export function SpeakerSlots() {
  return (
    <div className="speaker-slots" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

/** Perforated speaker grille on the right half. */
export function SpeakerGrid({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="speaker-grid" aria-hidden="true">
      {Array.from({ length: columns * rows }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
