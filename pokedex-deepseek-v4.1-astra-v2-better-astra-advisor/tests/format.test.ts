import { describe, expect, it } from 'vitest';
import {
  cleanFlavorText,
  displayName,
  formatAbility,
  formatDexNumber,
  formatHeight,
  formatWeight,
  hashRatio,
  statBarPercent,
  statLabel,
  statShortLabel,
} from '../src/lib/format';

describe('format helpers', () => {
  it('pads National Pokédex numbers to three digits', () => {
    expect(formatDexNumber(1)).toBe('001');
    expect(formatDexNumber(25)).toBe('025');
    expect(formatDexNumber(151)).toBe('151');
  });

  it('cleans newlines, form feeds and repeated whitespace from flavour text', () => {
    const raw = 'A strange seed was\nplanted on its\nback at birth.\fThe plant sprouts\nand grows.';
    const cleaned = cleanFlavorText(raw);
    expect(cleaned).toBe(
      'A strange seed was planted on its back at birth. The plant sprouts and grows.',
    );
    expect(cleaned).not.toMatch(/[\n\r\f]/);
  });

  it('handles empty flavour text without throwing', () => {
    expect(cleanFlavorText(null)).toBe('');
    expect(cleanFlavorText(undefined)).toBe('');
    expect(cleanFlavorText('')).toBe('');
  });

  it('converts decimetres and hectograms to metres and kilograms', () => {
    expect(formatHeight(7)).toBe('0.7 m');
    expect(formatWeight(69)).toBe('6.9 kg');
    expect(formatHeight(Number.NaN)).toBe('—');
  });

  it('formats abilities and hidden abilities', () => {
    expect(formatAbility('overgrow', false)).toBe('Overgrow');
    expect(formatAbility('chlorophyll', true)).toBe('Chlorophyll (hidden)');
  });

  it('uses official Generation I spellings for irregular names', () => {
    expect(displayName('nidoran-f')).toBe('Nidoran♀');
    expect(displayName('mr-mime')).toBe('Mr. Mime');
    expect(displayName('bulbasaur')).toBe('Bulbasaur');
  });

  it('labels the six base stats', () => {
    expect(statLabel('special-attack')).toBe('SP. ATK');
    expect(statShortLabel('special-defense')).toBe('SPD');
    expect(statShortLabel('speed')).toBe('SPE');
  });

  it('keeps stat bar percentages inside sane bounds', () => {
    expect(statBarPercent(0)).toBeGreaterThan(0);
    expect(statBarPercent(1000)).toBe(100);
  });

  it('produces a deterministic hash ratio', () => {
    expect(hashRatio('bulbasaur')).toBe(hashRatio('bulbasaur'));
    expect(hashRatio('bulbasaur')).toBeGreaterThanOrEqual(0);
    expect(hashRatio('bulbasaur')).toBeLessThan(1);
  });
});
