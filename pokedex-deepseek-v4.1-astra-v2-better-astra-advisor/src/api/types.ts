/**
 * Raw PokéAPI v2 response shapes (only the fields this application consumes).
 * @see https://pokeapi.co/docs/v2
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

export interface PokemonTypeSlot {
  slot: number;
  type: NamedApiResource;
}

export interface PokemonAbilitySlot {
  slot: number;
  is_hidden: boolean;
  ability: NamedApiResource;
}

export interface PokemonStatSlot {
  base_stat: number;
  effort: number;
  stat: NamedApiResource;
}

export interface PokemonSprites {
  front_default: string | null;
  front_shiny: string | null;
  back_default: string | null;
  versions?: {
    'generation-i'?: {
      'red-blue'?: { front_default: string | null; back_default: string | null };
      yellow?: { front_default: string | null; back_default: string | null };
    };
  };
}

export interface PokemonResponse {
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

export interface PokemonSpeciesResponse {
  id: number;
  name: string;
  capture_rate: number;
  base_happiness: number | null;
  is_legendary: boolean;
  is_mythical: boolean;
  color: NamedApiResource;
  habitat: NamedApiResource | null;
  generation: NamedApiResource;
  growth_rate: NamedApiResource | null;
  egg_groups: NamedApiResource[];
  genera: GenusEntry[];
  flavor_text_entries: FlavorTextEntry[];
}
