import type { Pokemon, PokemonSpecies } from '../api/types';
import {
  cleanFlavorText,
  decimetresToMetres,
  formatDexNumber,
  formatName,
  hectogramsToKilograms,
  titleCaseToken,
} from '../utils/format';

/** National Dex range covered by this device: Bulbasaur … Mew. */
export const DEX_FIRST_ID = 1;
export const DEX_LAST_ID = 151;

/** Bar scale for the compact LCD stat readout (Cloyster's 180 DEF caps out). */
export const STAT_BAR_MAX = 150;
export const STAT_SEGMENTS = 10;

export type StatKey = 'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed';

export interface StatRow {
  key: StatKey;
  /** Three-letter LCD label, e.g. `SPA`. */
  label: string;
  /** Full name for tooltips and screen readers, e.g. `Special Attack`. */
  longLabel: string;
  value: number;
  /** 0…1 fill ratio for the segmented bar. */
  ratio: number;
}

export interface AbilityRow {
  name: string;
  displayName: string;
  hidden: boolean;
}

export interface PokemonDetail {
  id: number;
  /** Zero-padded national dex number, e.g. `001`. */
  dexNumber: string;
  /** Raw API slug, e.g. `mr-mime`. */
  slug: string;
  /** Formatted display name, e.g. `Mr. Mime`. */
  displayName: string;
  types: string[];
  sprite: string | null;
  heightM: number;
  weightKg: number;
  abilities: AbilityRow[];
  stats: StatRow[];
  statTotal: number;
  flavorText: string;
  /** Flavour text from the oldest Gen-I cartridge, used on the NOTES screen. */
  classicFlavorText: string;
  genus: string;
  habitat: string | null;
  captureRate: number;
  baseHappiness: number | null;
  baseExperience: number | null;
  growthRate: string | null;
  eggGroups: string[];
  genderRate: number;
  hatchCounter: number | null;
  shape: string | null;
  color: string | null;
  isLegendary: boolean;
  isMythical: boolean;
  /** How many game versions shipped a Pokédex entry for this species. */
  flavorVersionCount: number;
  /** The version whose entry is displayed, e.g. `red`. */
  flavorVersion: string | null;
}

const STAT_LABELS: Record<StatKey, { label: string; longLabel: string }> = {
  hp: { label: 'HP', longLabel: 'HP' },
  attack: { label: 'ATK', longLabel: 'Attack' },
  defense: { label: 'DEF', longLabel: 'Defense' },
  'special-attack': { label: 'SPA', longLabel: 'Special Attack' },
  'special-defense': { label: 'SPD', longLabel: 'Special Defense' },
  speed: { label: 'SPE', longLabel: 'Speed' },
};

/** The order Gen-I players expect on a Pokédex readout. */
const STAT_ORDER: StatKey[] = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

function pickEnglishFlavor(
  species: PokemonSpecies,
  preferredVersions: string[],
): { text: string; version: string | null } | null {
  const english = species.flavor_text_entries.filter((entry) => entry.language.name === 'en');
  if (english.length === 0) return null;

  // Prefer the newest entry (PokéAPI returns them in ascending version order),
  // which has the cleanest prose.
  const newest = english[english.length - 1];
  const fallback = { text: cleanFlavorText(newest.flavor_text), version: newest.version.name };

  for (const version of preferredVersions) {
    const match = english.find((entry) => entry.version.name === version);
    if (match) {
      const text = cleanFlavorText(match.flavor_text);
      if (text.length > 0) return { text, version: match.version.name };
    }
  }
  return fallback.text.length > 0 ? fallback : null;
}

/** Oldest Gen-I entry available, so the NOTES screen can read like a 1996 cartridge. */
function pickClassicFlavor(species: PokemonSpecies): string {
  const english = species.flavor_text_entries.filter((entry) => entry.language.name === 'en');
  for (const version of ['red', 'blue', 'yellow']) {
    const match = english.find((entry) => entry.version.name === version);
    if (match) {
      const text = cleanFlavorText(match.flavor_text);
      if (text.length > 0) return text;
    }
  }
  return '';
}

function resolveSprite(pokemon: Pokemon): string | null {
  const gen1 = pokemon.sprites.versions?.['generation-i'];
  return (
    pokemon.sprites.front_default ??
    gen1?.['red-blue']?.front_default ??
    gen1?.yellow?.front_default ??
    null
  );
}

/** Combines `/pokemon/{id}` and `/pokemon-species/{id}` into the app's view model. */
export function toPokemonDetail(pokemon: Pokemon, species: PokemonSpecies): PokemonDetail {
  const sprite = resolveSprite(pokemon);

  const statsById = new Map(pokemon.stats.map((slot) => [slot.stat.name, slot.base_stat]));
  const stats: StatRow[] = STAT_ORDER.map((key) => {
    const value = statsById.get(key) ?? 0;
    return {
      key,
      label: STAT_LABELS[key].label,
      longLabel: STAT_LABELS[key].longLabel,
      value,
      ratio: Math.min(1, value / STAT_BAR_MAX),
    };
  });

  const newest = pickEnglishFlavor(species, []);
  const classic = pickClassicFlavor(species);

  const englishEntries = species.flavor_text_entries.filter((entry) => entry.language.name === 'en');

  return {
    id: pokemon.id,
    dexNumber: formatDexNumber(pokemon.id),
    slug: pokemon.name,
    displayName: formatName(pokemon.name),
    types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((slot) => slot.type.name),
    sprite,
    heightM: decimetresToMetres(pokemon.height),
    weightKg: hectogramsToKilograms(pokemon.weight),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((slot) => ({
        name: slot.ability.name,
        displayName: formatName(slot.ability.name),
        hidden: slot.is_hidden,
      })),
    stats,
    statTotal: stats.reduce((sum, row) => sum + row.value, 0),
    flavorText: newest?.text ?? classic,
    classicFlavorText: classic,
    genus:
      species.genera.find((entry) => entry.language.name === 'en')?.genus ??
      `${titleCaseToken(pokemon.types[0]?.type.name ?? 'unknown')} Pokémon`,
    habitat: species.habitat?.name ?? null,
    captureRate: species.capture_rate,
    baseHappiness: species.base_happiness,
    baseExperience: pokemon.base_experience ?? species.base_experience ?? null,
    growthRate: species.growth_rate?.name ?? null,
    eggGroups: species.egg_groups.map((group) => group.name),
    genderRate: species.gender_rate,
    hatchCounter: species.hatch_counter,
    shape: species.shape?.name ?? null,
    color: species.color?.name ?? null,
    isLegendary: species.is_legendary,
    isMythical: species.is_mythical,
    flavorVersionCount: englishEntries.length,
    flavorVersion: newest?.version ?? null,
  };
}

/**
 * Compact ability readout for the species screen, e.g.
 * `Overgrow / Chlorophyll (H)`.
 */
export function formatAbilityLine(detail: PokemonDetail): string {
  if (detail.abilities.length === 0) return 'UNKNOWN';
  return detail.abilities
    .map((ability) => `${ability.displayName}${ability.hidden ? ' (H)' : ''}`)
    .join(' / ');
}
