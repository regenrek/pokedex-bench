/** Pure formatting helpers shared by the device screens and the tests. */

/** National Pokédex number with three digits: `1` → `001`. */
export function formatDexNumber(id: number): string {
  return String(Math.trunc(id)).padStart(3, '0');
}

/** `bulbasaur` → `Bulbasaur`; `mr-mime` → `Mr. Mime`-style readable names. */
export function formatName(name: string): string {
  if (!name) return '';
  const spaced = name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const NAME_OVERRIDES: Record<string, string> = {
  'nidoran-f': 'Nidoran♀',
  'nidoran-m': 'Nidoran♂',
  'mr-mime': 'Mr. Mime',
  farfetchd: "Farfetch'd",
};

/** Display name that respects the official spellings used in Generation I. */
export function displayName(name: string): string {
  return NAME_OVERRIDES[name] ?? formatName(name);
}

/** `special-attack` → `SP. ATK` */
export function statLabel(statName: string): string {
  switch (statName) {
    case 'hp':
      return 'HP';
    case 'attack':
      return 'ATK';
    case 'defense':
      return 'DEF';
    case 'special-attack':
      return 'SP. ATK';
    case 'special-defense':
      return 'SP. DEF';
    case 'speed':
      return 'SPD';
    default:
      return statName.replace(/-/g, ' ').toUpperCase();
  }
}

/** Compact three-letter label used by the narrow summary rows. */
export function statShortLabel(statName: string): string {
  switch (statName) {
    case 'hp':
      return 'HP';
    case 'attack':
      return 'ATK';
    case 'defense':
      return 'DEF';
    case 'special-attack':
      return 'SPC';
    case 'special-defense':
      return 'SPD';
    case 'speed':
      return 'SPE';
    default:
      return statName.slice(0, 3).toUpperCase();
  }
}

/**
 * PokéAPI flavor text arrives with newlines and form feeds, and is padded with
 * soft hyphens/odd whitespace. Normalise it for the LCD.
 */
export function cleanFlavorText(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/[\n\r\f\u000c\u00ad]/g, ' ')
    .replace(/\u0000/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

/** PokéAPI heights are decimetres. */
export function formatHeight(decimetres: number): string {
  if (!Number.isFinite(decimetres)) return '—';
  return `${(decimetres / 10).toFixed(1)} m`;
}

/** PokéAPI weights are hectograms. */
export function formatWeight(hectograms: number): string {
  if (!Number.isFinite(hectograms)) return '—';
  return `${(hectograms / 10).toFixed(1)} kg`;
}

/** `overgrow` → `Overgrow`; `chlorophyll` with hidden flag → `Chlorophyll (hidden)`. */
export function formatAbility(name: string, isHidden: boolean): string {
  return `${formatName(name)}${isHidden ? ' (hidden)' : ''}`;
}

export function formatIdentifier(name: string): string {
  return name.replace(/-/g, ' ').toUpperCase();
}

/** Base-stat bar width percentage (stat values realistically sit within 1–255). */
export function statBarPercent(value: number, max = 160): number {
  const safe = Number.isFinite(value) ? value : 0;
  return Math.max(4, Math.min(100, Math.round((safe / max) * 100)));
}

/** Deterministic 0..1 hash used to seed the decorative area-map pattern. */
export function hashRatio(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}
