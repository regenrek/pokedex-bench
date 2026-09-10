import { describe, expect, it } from 'vitest';
import { STAT_BAR_MAX, STAT_SEGMENTS, toPokemonDetail } from './pokemon';
import { typeColor } from './typeColors';
import {
  cleanFlavorText,
  decimetresToMetres,
  formatDexNumber,
  formatGenderRate,
  formatHatchCounter,
  formatName,
  hectogramsToKilograms,
  humanizeToken,
} from '../utils/format';
import { BULBASAUR_POKEMON, BULBASAUR_SPECIES, PIKACHU_POKEMON, PIKACHU_SPECIES } from '../test/fixtures';

describe('formatName', () => {
  it('title-cases plain slugs', () => {
    expect(formatName('bulbasaur')).toBe('Bulbasaur');
    expect(formatName('mewtwo')).toBe('Mewtwo');
  });

  it('handles the Gen-I special cases', () => {
    expect(formatName('nidoran-f')).toBe('Nidoran♀');
    expect(formatName('nidoran-m')).toBe('Nidoran♂');
    expect(formatName('mr-mime')).toBe('Mr. Mime');
    expect(formatName('farfetchd')).toBe("Farfetch'd");
  });
});

describe('formatDexNumber', () => {
  it('pads to three digits', () => {
    expect(formatDexNumber(1)).toBe('001');
    expect(formatDexNumber(25)).toBe('025');
    expect(formatDexNumber(151)).toBe('151');
  });
});

describe('cleanFlavorText', () => {
  it('collapses newlines and form feeds', () => {
    expect(cleanFlavorText('A strange seed was\nplanted on its\nback at birth.\fThe plant sprouts.')).toBe(
      'A strange seed was planted on its back at birth. The plant sprouts.',
    );
  });

  it('removes soft hyphens and repeated spaces', () => {
    expect(cleanFlavorText('POKé\u00adMON   are  \n here')).toBe('POKéMON are here');
  });

  it('never leaves a space before punctuation', () => {
    expect(cleanFlavorText('It is small\n.')).toBe('It is small.');
  });

  it('returns an empty string for missing input', () => {
    expect(cleanFlavorText(null)).toBe('');
    expect(cleanFlavorText(undefined)).toBe('');
  });
});

describe('unit conversion', () => {
  it('converts decimetres to metres', () => {
    expect(decimetresToMetres(7)).toBe(0.7);
    expect(decimetresToMetres(20)).toBe(2);
  });

  it('converts hectograms to kilograms', () => {
    expect(hectogramsToKilograms(69)).toBe(6.9);
    expect(hectogramsToKilograms(1220)).toBe(122);
  });
});

describe('formatGenderRate', () => {
  it('handles genderless and single-gender species', () => {
    expect(formatGenderRate(-1)).toBe('GENDERLESS');
    expect(formatGenderRate(0)).toBe('♂ 100%');
    expect(formatGenderRate(8)).toBe('♀ 100%');
  });

  it('splits mixed ratios', () => {
    expect(formatGenderRate(1)).toBe('♂ 87% / ♀ 13%');
    expect(formatGenderRate(4)).toBe('♂ 50% / ♀ 50%');
  });
});

describe('formatHatchCounter', () => {
  it('formats cycles and unknown values', () => {
    expect(formatHatchCounter(20)).toBe('20 CYCLES');
    expect(formatHatchCounter(null)).toBe('UNKNOWN');
  });
});

describe('humanizeToken', () => {
  it('upper-cases hyphenated tokens', () => {
    expect(humanizeToken('medium-slow')).toBe('MEDIUM SLOW');
  });
});

describe('toPokemonDetail', () => {
  it('builds the full view model for Bulbasaur', () => {
    const detail = toPokemonDetail(BULBASAUR_POKEMON, BULBASAUR_SPECIES);
    expect(detail.dexNumber).toBe('001');
    expect(detail.displayName).toBe('Bulbasaur');
    expect(detail.heightM).toBe(0.7);
    expect(detail.weightKg).toBe(6.9);
    expect(detail.types).toEqual(['grass', 'poison']);
    expect(detail.stats.map((row) => row.label)).toEqual(['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE']);
    expect(detail.statTotal).toBe(318);
    expect(detail.genderRate).toBe(1);
    expect(detail.eggGroups).toEqual(['monster', 'plant']);
    expect(detail.sprite).toContain('/pokemon/1.png');
  });

  it('clamps stat bars to the display maximum', () => {
    const detail = toPokemonDetail(BULBASAUR_POKEMON, BULBASAUR_SPECIES);
    for (const row of detail.stats) {
      expect(row.ratio).toBeGreaterThan(0);
      expect(row.ratio).toBeLessThanOrEqual(1);
      expect(Math.round(row.ratio * STAT_SEGMENTS)).toBeLessThanOrEqual(STAT_SEGMENTS);
    }
    expect(detail.stats[0].ratio).toBeCloseTo(45 / STAT_BAR_MAX, 5);
  });

  it('prefers the newest English flavour text and keeps the Gen-I entry separately', () => {
    const detail = toPokemonDetail(PIKACHU_POKEMON, PIKACHU_SPECIES);
    expect(detail.flavorText).toBe(
      'When several of these POKéMON gather, their electricity could build and cause lightning storms.',
    );
    expect(detail.classicFlavorText).toContain('lightning storms');
    expect(detail.flavorVersionCount).toBe(2);
    expect(detail.flavorVersion).toBe('firered');
  });

  it('flags hidden abilities and legendary status', () => {
    const detail = toPokemonDetail(BULBASAUR_POKEMON, BULBASAUR_SPECIES);
    expect(detail.abilities).toEqual([
      { name: 'overgrow', displayName: 'Overgrow', hidden: false },
      { name: 'chlorophyll', displayName: 'Chlorophyll', hidden: true },
    ]);
    expect(detail.isLegendary).toBe(false);
  });

  it('falls back to a generated genus when the species data has none', () => {
    const detail = toPokemonDetail(BULBASAUR_POKEMON, { ...BULBASAUR_SPECIES, genera: [] });
    expect(detail.genus).toBe('Grass Pokémon');
  });
});

describe('typeColor', () => {
  it('maps known types and falls back for unknown ones', () => {
    expect(typeColor('fire')).toMatch(/^#/);
    expect(typeColor('made-up')).toBe(typeColor('unknown'));
    expect(typeColor(null)).toBe(typeColor('unknown'));
  });
});
