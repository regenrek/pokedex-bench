/** Deterministic PokéAPI-shaped fixtures used by the automated tests. */

export const GEN1_NAMES = [
  'bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'charmeleon', 'charizard',
  'squirtle', 'wartortle', 'blastoise', 'caterpie', 'metapod', 'butterfree',
  'weedle', 'kakuna', 'beedrill', 'pidgey', 'pidgeotto', 'pidgeot', 'rattata',
  'raticate', 'spearow', 'fearow', 'ekans', 'arbok', 'pikachu', 'raichu',
  'sandshrew', 'sandslash', 'nidoran-f', 'nidorina', 'nidoqueen', 'nidoran-m',
  'nidorino', 'nidoking', 'clefairy', 'clefable', 'vulpix', 'ninetales',
  'jigglypuff', 'wigglytuff', 'zubat', 'golbat', 'oddish', 'gloom',
  'vileplume', 'paras', 'parasect', 'venonat', 'venomoth', 'diglett',
  'dugtrio', 'meowth', 'persian', 'psyduck', 'golduck', 'mankey', 'primeape',
  'growlithe', 'arcanine', 'poliwag', 'poliwhirl', 'poliwrath', 'abra',
  'kadabra', 'alakazam', 'machop', 'machoke', 'machamp', 'bellsprout',
  'weepinbell', 'victreebel', 'tentacool', 'tentacruel', 'geodude', 'graveler',
  'golem', 'ponyta', 'rapidash', 'slowpoke', 'slowbro', 'magnemite', 'magneton',
  'farfetchd', 'doduo', 'dodrio', 'seel', 'dewgong', 'grimer', 'muk',
  'shellder', 'cloyster', 'gastly', 'haunter', 'gengar', 'onix', 'drowzee',
  'hypno', 'krabby', 'kingler', 'voltorb', 'electrode', 'exeggcute',
  'exeggutor', 'cubone', 'marowak', 'hitmonlee', 'hitmonchan', 'lickitung',
  'koffing', 'weezing', 'rhyhorn', 'rhydon', 'chansey', 'tangela', 'kangaskhan',
  'horsea', 'seadra', 'goldeen', 'seaking', 'staryu', 'starmie', 'mr-mime',
  'scyther', 'jynx', 'electabuzz', 'magmar', 'pinsir', 'tauros', 'magikarp',
  'gyarados', 'lapras', 'ditto', 'eevee', 'vaporeon', 'jolteon', 'flareon',
  'porygon', 'omanyte', 'omastar', 'kabuto', 'kabutops', 'aerodactyl',
  'snorlax', 'articuno', 'zapdos', 'moltres', 'dratini', 'dragonair',
  'dragonite', 'mewtwo', 'mew',
] as const;

export function indexPayload(): unknown {
  return {
    count: 151,
    next: null,
    previous: null,
    results: GEN1_NAMES.map((name, i) => ({
      name,
      url: `https://pokeapi.co/api/v2/pokemon/${i + 1}/`,
    })),
  };
}

interface PokemonOverrides {
  name?: string;
  height?: number;
  weight?: number;
  types?: string[];
  abilities?: Array<{ name: string; hidden?: boolean }>;
  stats?: number[];
  sprite?: string | null;
}

export function pokemonPayload(id: number, overrides: PokemonOverrides = {}): unknown {
  const name = overrides.name ?? GEN1_NAMES[id - 1] ?? `pokemon-${id}`;
  const stats = overrides.stats ?? [45, 49, 49, 65, 65, 45];
  return {
    id,
    name,
    height: overrides.height ?? 7,
    weight: overrides.weight ?? 69,
    base_experience: 64,
    types: (overrides.types ?? ['grass', 'poison']).map((type, index) => ({
      slot: index + 1,
      type: { name: type, url: `https://pokeapi.co/api/v2/type/${type}/` },
    })),
    abilities: (
      overrides.abilities ?? [
        { name: 'overgrow' },
        { name: 'chlorophyll', hidden: true },
      ]
    ).map((ability, index) => ({
      slot: index + 1,
      is_hidden: Boolean(ability.hidden),
      ability: {
        name: ability.name,
        url: `https://pokeapi.co/api/v2/ability/${ability.name}/`,
      },
    })),
    stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map(
      (stat, index) => ({
        base_stat: stats[index] ?? 50,
        effort: 0,
        stat: { name: stat, url: `https://pokeapi.co/api/v2/stat/${stat}/` },
      }),
    ),
    sprites: {
      front_default:
        overrides.sprite === undefined
          ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
          : overrides.sprite,
      front_shiny: null,
      back_default: null,
      versions: { 'generation-i': { 'red-blue': { front_default: null, back_default: null } } },
    },
  };
}

export function speciesPayload(id: number, overrides: Record<string, unknown> = {}): unknown {
  const name = (overrides.name as string) ?? GEN1_NAMES[id - 1] ?? `pokemon-${id}`;
  return {
    id,
    name,
    capture_rate: 45,
    base_happiness: 50,
    is_legendary: id === 150,
    is_mythical: id === 151,
    color: { name: 'green', url: 'https://pokeapi.co/api/v2/pokemon-color/green/' },
    habitat: { name: 'grassland', url: 'https://pokeapi.co/api/v2/pokemon-habitat/grassland/' },
    generation: { name: 'generation-i', url: 'https://pokeapi.co/api/v2/generation/1/' },
    growth_rate: { name: 'medium-slow', url: 'https://pokeapi.co/api/v2/growth-rate/4/' },
    egg_groups: [
      { name: 'monster', url: 'https://pokeapi.co/api/v2/egg-group/1/' },
      { name: 'plant', url: 'https://pokeapi.co/api/v2/egg-group/7/' },
    ],
    genera: [
      { genus: 'Seed Pokémon', language: { name: 'en', url: '' } },
      { genus: 'たねポケモン', language: { name: 'ja', url: '' } },
    ],
    flavor_text_entries: [
      {
        // Newlines and form feeds must be cleaned before display.
        flavor_text:
          'A strange seed was\nplanted on its\nback at birth.\fThe plant sprouts\nand grows with\nthis POKéMON.',
        language: { name: 'en', url: '' },
        version: { name: 'red', url: '' },
      },
      {
        flavor_text: 'Bulbasaur can be seen napping in bright sunlight.',
        language: { name: 'en', url: '' },
        version: { name: 'firered', url: '' },
      },
    ],
    ...overrides,
  };
}
