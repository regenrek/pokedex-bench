/** Maps raw PokéAPI payloads onto the flat view-model the device renders. */
import type { PokemonBundle } from '../api/pokeapi';
import type { PokemonResponse, PokemonSpeciesResponse } from '../api/types';
import {
  cleanFlavorText,
  displayName,
  formatAbility,
  formatDexNumber,
  formatHeight,
  formatWeight,
  statLabel,
  statShortLabel,
} from './format';

export interface DexStat {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
}

export interface DexEntry {
  id: number;
  dexNumber: string;
  name: string;
  displayName: string;
  genus: string;
  spriteUrl: string | null;
  types: string[];
  height: string;
  weight: string;
  abilities: string[];
  flavor: string;
  stats: DexStat[];
  statTotal: number;
  habitat: string;
  captureRate: number | null;
  growthRate: string;
  eggGroups: string[];
  baseHappiness: number | null;
  baseExperience: number | null;
  color: string;
  generation: string;
  isLegendary: boolean;
  isMythical: boolean;
}

/** Generation I used a single Special stat; keep the retro grouping available. */
export function specialStat(stats: readonly DexStat[]): number | null {
  const spa = stats.find((stat) => stat.key === 'special-attack');
  const spd = stats.find((stat) => stat.key === 'special-defense');
  if (!spa || !spd) return null;
  return Math.round((spa.value + spd.value) / 2);
}

const STAT_ORDER = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const;

function pickSprite(pokemon: PokemonResponse): string | null {
  const gen1 = pokemon.sprites?.versions?.['generation-i'];
  return (
    pokemon.sprites?.front_default ??
    gen1?.['red-blue']?.front_default ??
    gen1?.yellow?.front_default ??
    null
  );
}

function englishGenus(species: PokemonSpeciesResponse): string {
  const entry = species.genera?.find((item) => item.language?.name === 'en');
  return entry?.genus ?? 'Unknown Pokémon';
}

function englishFlavor(species: PokemonSpeciesResponse): string {
  const entries = species.flavor_text_entries ?? [];
  const english = entries.filter((item) => item.language?.name === 'en');
  const preferred =
    english.find((item) => item.version?.name === 'red') ??
    english.find((item) => item.version?.name === 'firered') ??
    english[0];
  return cleanFlavorText(preferred?.flavor_text);
}

export function toDexEntry(bundle: PokemonBundle): DexEntry {
  const { pokemon, species } = bundle;

  const stats: DexStat[] = [...(pokemon.stats ?? [])]
    .sort((a, b) => {
      const indexA = STAT_ORDER.indexOf(a.stat.name as (typeof STAT_ORDER)[number]);
      const indexB = STAT_ORDER.indexOf(b.stat.name as (typeof STAT_ORDER)[number]);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    })
    .map((slot) => ({
      key: slot.stat.name,
      label: statLabel(slot.stat.name),
      shortLabel: statShortLabel(slot.stat.name),
      value: slot.base_stat,
    }));

  return {
    id: pokemon.id,
    dexNumber: formatDexNumber(pokemon.id),
    name: pokemon.name,
    displayName: displayName(pokemon.name),
    genus: englishGenus(species),
    spriteUrl: pickSprite(pokemon),
    types: [...(pokemon.types ?? [])]
      .sort((a, b) => a.slot - b.slot)
      .map((slot) => slot.type.name),
    height: formatHeight(pokemon.height),
    weight: formatWeight(pokemon.weight),
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a, b) => Number(a.is_hidden) - Number(b.is_hidden) || a.slot - b.slot)
      .map((slot) => formatAbility(slot.ability.name, slot.is_hidden)),
    flavor: englishFlavor(species),
    stats,
    statTotal: stats.reduce((total, stat) => total + stat.value, 0),
    habitat: species.habitat?.name ? displayName(species.habitat.name) : 'Unknown',
    captureRate: typeof species.capture_rate === 'number' ? species.capture_rate : null,
    growthRate: species.growth_rate?.name
      ? displayName(species.growth_rate.name)
      : 'Unknown',
    eggGroups: (species.egg_groups ?? []).map((group) => displayName(group.name)),
    baseHappiness:
      typeof species.base_happiness === 'number' ? species.base_happiness : null,
    baseExperience:
      typeof pokemon.base_experience === 'number' ? pokemon.base_experience : null,
    color: species.color?.name ? displayName(species.color.name) : 'Unknown',
    generation: species.generation?.name
      ? species.generation.name.replace('generation-', 'GEN ').toUpperCase()
      : '—',
    isLegendary: Boolean(species.is_legendary),
    isMythical: Boolean(species.is_mythical),
  };
}

export const INFO_SECTIONS = [
  'SUMMARY',
  'HABITAT',
  'BEHAVIOR',
  'DIET',
  'NOTES',
] as const;

export type InfoSection = (typeof INFO_SECTIONS)[number];

export const MAIN_TABS = ['DATA', 'STATS'] as const;
export type MainTab = (typeof MAIN_TABS)[number];
