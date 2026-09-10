import type { Pokemon, PokemonListResponse, PokemonSpecies } from '../api/types';

/** Hand-built PokéAPI payloads: real shapes, trimmed to the fields we read. */

export const BULBASAUR_POKEMON: Pokemon = {
  id: 1,
  name: 'bulbasaur',
  height: 7,
  weight: 69,
  base_experience: 64,
  types: [
    { slot: 1, type: { name: 'grass', url: 'https://pokeapi.co/api/v2/type/12/' } },
    { slot: 2, type: { name: 'poison', url: 'https://pokeapi.co/api/v2/type/4/' } },
  ],
  abilities: [
    { ability: { name: 'overgrow', url: '' }, is_hidden: false, slot: 1 },
    { ability: { name: 'chlorophyll', url: '' }, is_hidden: true, slot: 3 },
  ],
  stats: [
    { base_stat: 45, effort: 0, stat: { name: 'hp', url: '' } },
    { base_stat: 49, effort: 0, stat: { name: 'attack', url: '' } },
    { base_stat: 49, effort: 0, stat: { name: 'defense', url: '' } },
    { base_stat: 65, effort: 1, stat: { name: 'special-attack', url: '' } },
    { base_stat: 65, effort: 0, stat: { name: 'special-defense', url: '' } },
    { base_stat: 45, effort: 0, stat: { name: 'speed', url: '' } },
  ],
  sprites: {
    front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
    front_shiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/1.png',
    versions: {
      'generation-i': {
        'red-blue': {
          front_default:
            'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-i/red-blue/1.png',
        },
      },
    },
  },
};

export const BULBASAUR_SPECIES: PokemonSpecies = {
  id: 1,
  name: 'bulbasaur',
  capture_rate: 45,
  base_happiness: 50,
  growth_rate: { name: 'medium-slow', url: '' },
  habitat: { name: 'grassland', url: '' },
  shape: { name: 'quadruped', url: '' },
  color: { name: 'green', url: '' },
  generation: { name: 'generation-i', url: '' },
  egg_groups: [
    { name: 'monster', url: '' },
    { name: 'plant', url: '' },
  ],
  gender_rate: 1,
  hatch_counter: 20,
  is_legendary: false,
  is_mythical: false,
  genera: [{ genus: 'Seed Pokémon', language: { name: 'en', url: '' } }],
  flavor_text_entries: [
    {
      flavor_text: 'A strange seed was\nplanted on its\nback at birth.\fThe plant sprouts\nand grows with\nthis POKéMON.',
      language: { name: 'en', url: '' },
      version: { name: 'red', url: '' },
    },
    {
      flavor_text:
        'A strange seed was planted on its back at birth.\fThe plant sprouts and grows with this POKéMON.',
      language: { name: 'en', url: '' },
      version: { name: 'firered', url: '' },
    },
    {
      flavor_text: 'Es wird bei der Geburt\nmit einem Samen\ngepflanzt.',
      language: { name: 'de', url: '' },
      version: { name: 'red', url: '' },
    },
  ],
};

export const PIKACHU_POKEMON: Pokemon = {
  ...BULBASAUR_POKEMON,
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  base_experience: 112,
  types: [{ slot: 1, type: { name: 'electric', url: '' } }],
  abilities: [
    { ability: { name: 'static', url: '' }, is_hidden: false, slot: 1 },
    { ability: { name: 'lightning-rod', url: '' }, is_hidden: true, slot: 3 },
  ],
  stats: [
    { base_stat: 35, effort: 0, stat: { name: 'hp', url: '' } },
    { base_stat: 55, effort: 0, stat: { name: 'attack', url: '' } },
    { base_stat: 40, effort: 0, stat: { name: 'defense', url: '' } },
    { base_stat: 50, effort: 0, stat: { name: 'special-attack', url: '' } },
    { base_stat: 50, effort: 0, stat: { name: 'special-defense', url: '' } },
    { base_stat: 90, effort: 2, stat: { name: 'speed', url: '' } },
  ],
};

export const PIKACHU_SPECIES: PokemonSpecies = {
  ...BULBASAUR_SPECIES,
  id: 25,
  name: 'pikachu',
  capture_rate: 190,
  habitat: { name: 'forest', url: '' },
  genera: [{ genus: 'Mouse Pokémon', language: { name: 'en', url: '' } }],
  flavor_text_entries: [
    {
      flavor_text: 'When several of\nthese POKéMON\ngather, their\felectricity could\nbuild and cause\nlightning storms.',
      language: { name: 'en', url: '' },
      version: { name: 'red', url: '' },
    },
    {
      flavor_text:
        'When several of these POKéMON gather, their electricity could build and cause lightning storms.',
      language: { name: 'en', url: '' },
      version: { name: 'firered', url: '' },
    },
  ],
};

export const MEW_POKEMON: Pokemon = {
  ...BULBASAUR_POKEMON,
  id: 151,
  name: 'mew',
  types: [{ slot: 1, type: { name: 'psychic', url: '' } }],
  abilities: [{ ability: { name: 'synchronize', url: '' }, is_hidden: false, slot: 1 }],
};

export const MEW_SPECIES: PokemonSpecies = {
  ...BULBASAUR_SPECIES,
  id: 151,
  name: 'mew',
  is_mythical: true,
  habitat: { name: 'rare', url: '' },
  genera: [{ genus: 'New Species Pokémon', language: { name: 'en', url: '' } }],
};

const OVERRIDES: Record<number, { pokemon: Pokemon; species: PokemonSpecies }> = {
  1: { pokemon: BULBASAUR_POKEMON, species: BULBASAUR_SPECIES },
  25: { pokemon: PIKACHU_POKEMON, species: PIKACHU_SPECIES },
  151: { pokemon: MEW_POKEMON, species: MEW_SPECIES },
};

/** Generic but structurally valid payload for any other entry number. */
export function syntheticPokemon(id: number): Pokemon {
  return { ...BULBASAUR_POKEMON, id, name: nameForId(id) };
}

export function syntheticSpecies(id: number): PokemonSpecies {
  return {
    ...BULBASAUR_SPECIES,
    id,
    name: nameForId(id),
    genera: [{ genus: 'Test Pokémon', language: { name: 'en', url: '' } }],
  };
}

export function pokemonFixture(id: number): Pokemon {
  return OVERRIDES[id]?.pokemon ?? syntheticPokemon(id);
}

export function speciesFixture(id: number): PokemonSpecies {
  return OVERRIDES[id]?.species ?? syntheticSpecies(id);
}

/** The `/pokemon?limit=151` index payload. */
export function indexFixture(limit = 151): PokemonListResponse {
  return {
    count: limit,
    next: null,
    previous: null,
    results: Array.from({ length: limit }, (_, index) => {
      const id = index + 1;
      return {
        name: pokemonFixture(id).name,
        url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
      };
    }),
  };
}

/** Real slugs for the entries the UI tests care about. */
const NAMED_ENTRIES: Record<number, string> = {
  1: 'bulbasaur',
  2: 'ivysaur',
  3: 'venusaur',
  4: 'charmander',
  5: 'charmeleon',
  6: 'charizard',
  7: 'squirtle',
  8: 'wartortle',
  9: 'blastoise',
  10: 'caterpie',
  25: 'pikachu',
  26: 'raichu',
  39: 'jigglypuff',
  52: 'meowth',
  94: 'gengar',
  122: 'mr-mime',
  131: 'lapras',
  133: 'eevee',
  143: 'snorlax',
  150: 'mewtwo',
  151: 'mew',
};

export function nameForId(id: number): string {
  return NAMED_ENTRIES[id] ?? `entry-${id}`;
}

export function kantoNames(): string[] {
  return Array.from({ length: 151 }, (_, index) => nameForId(index + 1));
}

export function indexFixtureWithNames(): PokemonListResponse {
  const names = kantoNames();
  return {
    count: names.length,
    next: null,
    previous: null,
    results: names.map((name, index) => ({
      name,
      url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/`,
    })),
  };
}
