/** Display formatting helpers shared by the LCD screens. */

/** `1` -> `"001"`, `25` -> `"025"`, `151` -> `"151"`. */
export function formatDexNumber(id: number): string {
  return String(Math.max(0, Math.trunc(id))).padStart(3, '0');
}

const NAME_OVERRIDES: Record<string, string> = {
  'nidoran-f': 'Nidoran♀',
  'nidoran-m': 'Nidoran♂',
  farfetchd: "Farfetch'd",
  'mr-mime': 'Mr. Mime',
  'mime-jr': 'Mime Jr.',
  'ho-oh': 'Ho-Oh',
  'porygon-z': 'Porygon-Z',
  'type-null': 'Type: Null',
  'jangmo-o': 'Jangmo-o',
  'hakamo-o': 'Hakamo-o',
  'kommo-o': 'Kommo-o',
  'tapu-koko': 'Tapu Koko',
};

/** `"mr-mime"` -> `"Mr. Mime"`, `"nidoran-f"` -> `"Nidoran♀"`. */
export function formatName(raw: string): string {
  if (!raw) return '';
  const override = NAME_OVERRIDES[raw.toLowerCase()];
  if (override) return override;
  return raw
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * PokéAPI flavour text contains hard wraps (`\n`), page breaks (`\f`) and the
 * odd soft hyphen. Collapse all of it into a single clean sentence flow.
 */
export function cleanFlavorText(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/\u00ad/g, '')
    .replace(/[\n\r\f]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

/** PokéAPI reports height in decimetres. */
export function decimetresToMetres(decimetres: number): number {
  return Math.round(decimetres) / 10;
}

/** PokéAPI reports weight in hectograms. */
export function hectogramsToKilograms(hectograms: number): number {
  return Math.round(hectograms) / 10;
}

export function formatMetres(metres: number): string {
  return `${metres.toFixed(1)} m`;
}

export function formatKilograms(kilograms: number): string {
  return `${kilograms.toFixed(1)} kg`;
}

/** `-1` -> `"GENDERLESS"`, `0` -> `"♂ 100%"`, `8` -> `"♀ 100%"`. */
export function formatGenderRate(genderRate: number): string {
  if (genderRate < 0) return 'GENDERLESS';
  const femaleEighths = Math.min(8, Math.max(0, genderRate));
  const female = Math.round((femaleEighths / 8) * 100);
  if (female === 0) return '♂ 100%';
  if (female === 100) return '♀ 100%';
  return `♂ ${100 - female}% / ♀ ${female}%`;
}

/** Steps -> a friendly "cycles" readout for the hatch counter. */
export function formatHatchCounter(hatchCounter: number | null): string {
  if (hatchCounter === null || Number.isNaN(hatchCounter)) return 'UNKNOWN';
  return `${hatchCounter} CYCLES`;
}

/** Turns `"special-attack"` into `"SPECIAL ATTACK"` for labels. */
export function humanizeToken(token: string | null | undefined): string {
  if (!token) return '';
  return token.replace(/[-_]/g, ' ').toUpperCase();
}

/** Title-cases a `"seed"`-style API token for labels like `Seed Pokémon`. */
export function titleCaseToken(token: string | null | undefined): string {
  if (!token) return '';
  return token
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
