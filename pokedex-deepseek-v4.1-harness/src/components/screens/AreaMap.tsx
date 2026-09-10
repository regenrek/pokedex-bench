/**
 * Stylised area chart for the right-hand LCD. Purely decorative geography —
 * the marker position is derived deterministically from the entry number so
 * every Pokémon has a stable "recorded location".
 */

const LANDMASSES = [
  'M20 20 L31 11 L45 14 L56 9 L70 14 L80 24 L83 36 L76 44 L80 54 L68 61 L55 57 L44 63 L31 58 L22 48 L16 36 Z',
  'M14 30 L22 18 L36 14 L48 18 L58 12 L72 16 L84 26 L88 40 L80 50 L82 60 L66 64 L52 58 L38 62 L26 54 L18 44 Z',
  'M26 12 L42 8 L54 15 L68 11 L82 20 L86 34 L78 42 L84 52 L72 60 L58 55 L46 61 L34 55 L24 60 L16 48 L20 34 L13 24 Z',
];

const REGIONS = [
  'M32 24 L46 20 L54 29 L47 39 L34 37 Z',
  'M58 30 L70 28 L74 38 L64 44 L56 39 Z',
  'M30 44 L42 41 L46 51 L36 54 Z',
];

export interface AreaMapProps {
  /** Entry number, used as the deterministic seed. */
  seed: number;
  label: string;
}

export function AreaMap({ seed, label }: AreaMapProps) {
  const landmass = LANDMASSES[seed % LANDMASSES.length];
  const markerX = 26 + ((seed * 37) % 46);
  const markerY = 20 + ((seed * 53) % 34);

  return (
    <svg
      className="area-map"
      viewBox="6 2 88 66"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Area map — recorded habitat ${label}`}
    >
      <defs>
        <pattern id="area-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path className="area-map__grid" d="M10 0 L0 0 L0 10" fill="none" />
        </pattern>
      </defs>
      <rect x="6" y="2" width="88" height="66" fill="url(#area-grid)" />
      <path className="area-map__land" d={landmass} />
      {REGIONS.map((region) => (
        <path key={region} className="area-map__land" d={region} opacity="0.55" />
      ))}
      <path
        d="M18 40 L34 32 L50 36 L66 28 L80 34"
        fill="none"
        stroke="rgba(34,50,44,0.4)"
        strokeWidth="0.6"
        strokeDasharray="2 2"
      />
      <circle className="area-map__ping" cx={markerX} cy={markerY} r="2" />
      <rect className="area-map__marker" x={markerX - 1.8} y={markerY - 1.8} width="3.6" height="3.6" />
    </svg>
  );
}
