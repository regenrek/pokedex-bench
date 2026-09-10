/** Non-interactive moulded hardware details: screws, hinge, vents, speaker. */
import type { JSX } from 'react';

export function Screw({ className }: { className: string }): JSX.Element {
  return <span className={`screw ${className}`} aria-hidden="true" />;
}

export function Hinge({ segments = 5 }: { segments?: number }): JSX.Element {
  return (
    <div className="hinge" aria-hidden="true">
      {Array.from({ length: segments }, (_, index) => (
        <span key={index} className="hinge__barrel" />
      ))}
    </div>
  );
}

export function Vents(): JSX.Element {
  return (
    <div className="vents" aria-hidden="true">
      <span className="vents__slot" />
      <span className="vents__slot" />
      <span className="vents__slot" />
    </div>
  );
}

export function Speaker({ columns = 5, rows = 8 }: { columns?: number; rows?: number }): JSX.Element {
  const holes = columns * rows;
  return (
    <div className="speaker" aria-hidden="true" role="presentation">
      {Array.from({ length: holes }, (_, index) => (
        <span key={index} className="speaker__hole" />
      ))}
    </div>
  );
}

/** Small dark display strip above the information screen. */
export function MarqueeDisplay({
  lines,
}: {
  lines: readonly string[];
}): JSX.Element {
  return (
    <div className="marquee">
      {lines.map((line) => (
        <span key={line} className="marquee__line">
          {line}
        </span>
      ))}
    </div>
  );
}

export function CartridgeBay(): JSX.Element {
  return (
    <div className="cartridge" aria-hidden="true">
      <span className="cartridge__label">DATA CARTRIDGE ▲</span>
      <span className="cartridge__slot" />
      <span className="cartridge__push">PUSH ▶</span>
    </div>
  );
}
