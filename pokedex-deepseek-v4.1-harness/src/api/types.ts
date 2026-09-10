/**
 * Narrow, hand-written types for the subset of the PokéAPI v2 payloads this
 * app actually consumes. Keeping them narrow (instead of `any`) means the
 * mapping layer in `src/domain` is fully type-checked.
 *
 * Reference: https://pokeapi.co/docs/v2
 */

export interface NamedApiResource {
  name: string;
  url: string;
}

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedApiResource[];
}

export interface PokemonStatSlot {
  base_stat: number;
  effort: number;
  stat: NamedApiResource;
}

export interface PokemonTypeSlot {
  slot: number;
  type: NamedApiResource;
}

export interface PokemonAbilitySlot {
  ability: NamedApiResource;
  is_hidden: boolean;
  slot: number;
}

export interface PokemonSprites {
  front_default: string | null;
  front_shiny: string | null;
  back_default?: string | null;
  versions?: {
    'generation-i'?: {
      'red-blue'?: { front_default: string | null; front_gray?: string | null };
      yellow?: { front_default: string | null };
    };
  };
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number | null;
  types: PokemonTypeSlot[];
  abilities: PokemonAbilitySlot[];
  stats: PokemonStatSlot[];
  sprites: PokemonSprites;
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: NamedApiResource;
  version: NamedApiResource;
}

export interface GenusEntry {
  genus: string;
  language: NamedApiResource;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  capture_rate: number;
  base_happiness: number | null;
  base_experience?: number | null;
  growth_rate: NamedApiResource | null;
  habitat: NamedApiResource | null;
  shape: NamedApiResource | null;
  color: NamedApiResource | null;
  generation: NamedApiResource | null;
  egg_groups: NamedApiResource[];
  gender_rate: number;
  hatch_counter: number | null;
  is_legendary: boolean;
  is_mythical: boolean;
  genera: GenusEntry[];
  flavor_text_entries: FlavorTextEntry[];
}
