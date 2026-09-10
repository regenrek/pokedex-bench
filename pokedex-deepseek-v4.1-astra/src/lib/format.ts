/** Formatting helpers shared by the LCD views. */

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  'special-attack': 'SPA',
  'special-defense': 'SPD',
  speed: 'SPE',
}

/** Display overrides for Gen I names whose official spelling uses punctuation. */
const NAME_OVERRIDES: Record<string, string> = {
  'nidoran-f': 'Nidoran ♀',
  'nidoran-m': 'Nidoran ♂',
  'mr-mime': 'Mr. Mime',
  farfetchd: "Farfetch'd",
}

/**
 * `mr-mime` → `Mr. Mime`, `nidoran-f` → `Nidoran ♀`.
 * Only used for presentation; matching always goes through `normalizeQuery`.
 */
export function formatDisplayName(apiName: string): string {
  const slug = apiName.trim().toLowerCase()
  const override = NAME_OVERRIDES[slug]
  if (override) return override
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** `special-attack` → `SPA`; unknown slugs fall back to a trimmed uppercase label. */
export function statLabel(apiStat: string): string {
  const key = apiStat.trim().toLowerCase()
  return STAT_LABELS[key] ?? key.replace(/-/g, ' ').slice(0, 3).toUpperCase()
}

/** `flash-fire` → `Flash Fire` */
export function abilityLabel(apiAbility: string): string {
  return apiAbility
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** `grass` → `GRASS` (type chips are uppercase on the LCD). */
export function typeLabel(apiType: string): string {
  return apiType.trim().toUpperCase()
}

/** PokéAPI flavor text contains newlines, form feeds and soft hyphens. */
export function cleanFlavorText(raw: string): string {
  // `\s` already covers newlines, form feeds, vertical tabs and unicode spaces.
  return raw
    .replace(/\u00ad/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** PokéAPI decimetres → metres. */
export function decimetersToMeters(decimetres: number): number {
  return Number.isFinite(decimetres) ? decimetres / 10 : Number.NaN
}

/** PokéAPI hectograms → kilograms. */
export function hectogramsToKilograms(hectograms: number): number {
  return Number.isFinite(hectograms) ? hectograms / 10 : Number.NaN
}

/** `0.7 m` */
export function formatMeters(meters: number): string {
  if (!Number.isFinite(meters)) return '--'
  return `${meters.toFixed(1)} m`
}

/** `6.9 kg` */
export function formatKilograms(kilograms: number): string {
  if (!Number.isFinite(kilograms)) return '--'
  return `${kilograms.toFixed(1)} kg`
}

/** 1 → `001` */
export function formatDexNumber(id: number): string {
  const safe = Number.isFinite(id) ? Math.max(0, Math.trunc(id)) : 0
  return String(safe).padStart(3, '0')
}

/** Short, single-line cache status shown on the casing. */
export function sourceLabel(source: 'network' | 'memory' | 'storage' | null): string {
  if (source === 'network') return 'LIVE LINK'
  if (source === 'storage') return 'CACHED'
  if (source === 'memory') return 'MEMORY'
  return 'STANDBY'
}
